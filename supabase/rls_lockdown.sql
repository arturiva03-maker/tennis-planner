-- ============================================================
-- RLS-LOCKDOWN: sepa_mandates, tenniscamp_anmeldungen, spontane_stunden
--
-- Anlass (2026-07-15): Ein Kunde meldete, dass die SEPA-Mandate ohne Login
-- lesbar sind. Nachgemessen mit dem oeffentlichen Anon-Key aus
-- src/supabaseClient.ts (der in jedem Browser-Bundle steht):
--   sepa_mandates           97 Zeilen  -> IBAN im Klartext lesbar
--   tenniscamp_anmeldungen  50 Zeilen  -> IBAN im Klartext lesbar
--   spontane_stunden        87 Zeilen  -> 40 davon mit Name/E-Mail/Telefon
-- Zusaetzlich waren UPDATE und DELETE fuer anon erlaubt (nicht nur SELECT).
--
-- URSACHE: In supabase_spontane_stunden.sql fehlt bei den Policies die
-- TO-Klausel:
--     CREATE POLICY "Users can read own data" ON spontane_stunden
--       FOR SELECT USING (true);
-- Ohne TO gilt eine Policy fuer PUBLIC -- also auch fuer anon. USING (true)
-- heisst damit "jeder darf alles". Die restriktiveren anon-Policies darunter
-- greifen nicht, weil permissive Policies mit OR verknuepft werden.
--
-- PRINZIP DIESER DATEI: anon bekommt nur, was die oeffentlichen Formulare
-- nachweislich brauchen (verifiziert in src/):
--   sepa_mandates          -> INSERT     (SepaForm, WeddingPage, BritzPage)
--   tenniscamp_anmeldungen -> INSERT     (TenniscampForm)
--   spontane_stunden       -> SELECT nur auf veroeffentlicht+offen
-- Gelesen wird sonst ausschliesslich ueber SECURITY-DEFINER-RPCs, die keine
-- IBAN herausgeben. Gebucht wird ueber spontan_buchen(), nicht per UPDATE.
--
-- Idempotent: kann gefahrlos mehrfach ausgefuehrt werden.
-- Einspielen: Supabase Dashboard -> SQL Editor -> komplett ausfuehren.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Account des eingeloggten Nutzers ermitteln
--    Spiegelt die Logik aus App.tsx: Profil bevorzugt, sonst eigene user.id
--    (App.tsx: "Kein Profil: mindestens accountId auf eigene user.id setzen").
--    SECURITY DEFINER, damit die Policy user_profiles trotz dessen RLS lesen darf.
-- ------------------------------------------------------------
create or replace function public.current_account_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select account_id::text from public.user_profiles where user_id = auth.uid() limit 1),
    auth.uid()::text
  );
$$;

revoke execute on function public.current_account_id() from public;
grant execute on function public.current_account_id() to authenticated;


-- ------------------------------------------------------------
-- 2) Slot-Infos fuer die Absage-Seite (/absage/:id)
--    Ersetzt das direkte SELECT in AbsagePage.tsx. Die Slot-UUID aus dem
--    Absage-Link dient wie bisher als Capability-Token (gleiches Prinzip wie
--    spontan_trainer_kontakt / spontan_buchung_absagen).
--    Gibt bewusst nur die Felder zurueck, die die Seite anzeigt.
-- ------------------------------------------------------------
create or replace function public.spontan_slot_info(slot_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s spontane_stunden%rowtype;
begin
  select * into s from spontane_stunden where id = slot_id;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'status', s.status,
    'datum', s.datum,
    'uhrzeit_von', s.uhrzeit_von,
    'uhrzeit_bis', s.uhrzeit_bis,
    'anlage', s.anlage,
    'custom_preis_pro_stunde', s.custom_preis_pro_stunde,
    'buchung_name', s.buchung->>'name',
    'buchung_email', s.buchung->>'email'
  );
end;
$$;

grant execute on function public.spontan_slot_info(uuid) to anon, authenticated;


-- ------------------------------------------------------------
-- 3) Alte Policies restlos entfernen
--    Per Schleife, weil die Namen historisch gewachsen und teils unbekannt sind
--    (u.a. "Users can read own data" mit USING (true) -> die eigentliche Luecke).
-- ------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('sepa_mandates', 'tenniscamp_anmeldungen', 'spontane_stunden')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 4) sepa_mandates -- IBANs. anon darf ausschliesslich einfuegen.
--    Kein SELECT: die Formulare lesen nichts zurueck (alle Inserts
--    destrukturieren nur { error }, kein .select() angehaengt).
--    Prefill laeuft ueber sepa_mandat_lookup(), das keine IBAN liefert.
-- ------------------------------------------------------------
alter table public.sepa_mandates enable row level security;

-- Zweite Verteidigungslinie: ohne SELECT-Privileg nuetzt anon auch eine
-- versehentlich zu weite Policy nichts.
revoke all on public.sepa_mandates from anon;
grant insert on public.sepa_mandates to anon;

create policy "anon darf Mandat anlegen" on public.sepa_mandates
  for insert to anon
  with check (true);

create policy "Account-Inhaber voller Zugriff" on public.sepa_mandates
  for all to authenticated
  using (account_id = public.current_account_id())
  with check (account_id = public.current_account_id());


-- ------------------------------------------------------------
-- 5) tenniscamp_anmeldungen -- enthaelt ebenfalls eine iban-Spalte.
--    App.tsx liest mit .in("account_id", [accountId, "public"]).
-- ------------------------------------------------------------
alter table public.tenniscamp_anmeldungen enable row level security;

revoke all on public.tenniscamp_anmeldungen from anon;
grant insert on public.tenniscamp_anmeldungen to anon;

create policy "anon darf Anmeldung anlegen" on public.tenniscamp_anmeldungen
  for insert to anon
  with check (true);

create policy "Account-Inhaber voller Zugriff" on public.tenniscamp_anmeldungen
  for all to authenticated
  using (account_id in (public.current_account_id(), 'public'))
  with check (account_id in (public.current_account_id(), 'public'));


-- ------------------------------------------------------------
-- 6) spontane_stunden -- oeffentlich nur freie, veroeffentlichte Slots.
--    Solche Zeilen haben per Definition buchung IS NULL: gebucht wird ueber
--    spontan_buchen() (setzt status='gebucht'), freigegeben ueber
--    spontan_buchung_absagen() (setzt buchung = null). Gegengeprueft: aktuell
--    0 von 47 offenen+veroeffentlichten Zeilen tragen Buchungsdaten.
--    KEIN anon-UPDATE mehr: spontan_buchen() ist SECURITY DEFINER und prueft
--    selbst "status='offen' and veroeffentlicht=true".
-- ------------------------------------------------------------
alter table public.spontane_stunden enable row level security;

revoke all on public.spontane_stunden from anon;
grant select on public.spontane_stunden to anon;

create policy "oeffentlich: freie veroeffentlichte Slots" on public.spontane_stunden
  for select to anon
  using (veroeffentlicht = true and status = 'offen');

create policy "Account-Inhaber voller Zugriff" on public.spontane_stunden
  for all to authenticated
  using (account_id = public.current_account_id())
  with check (account_id = public.current_account_id());
