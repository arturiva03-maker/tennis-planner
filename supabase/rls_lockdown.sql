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
      and tablename in ('sepa_mandates', 'tenniscamp_anmeldungen', 'spontane_stunden',
                        'account_state', 'registration_requests', 'user_profiles',
                        'probetraining_anfragen', 'kennlerntennis_anfragen', 'agb_content')
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


-- ------------------------------------------------------------
-- 7) account_state -- der komplette App-Zustand als JSON-Blob.
--
--    NACHGEMESSEN 2026-07-15 (nach Teil 1): SELECT lieferte anon zwar 0 Zeilen,
--    ein UPDATE gegen alle Zeilen lief aber bis in den Typ-Cast (Fehler 22007)
--    -- d.h. RLS hat die Zeilen NICHT weggefiltert: anon durfte den gesamten
--    Kalender/Spielerbestand ueberschreiben. Zweite, unabhaengige Luecke,
--    gleiche Ursache (Policy ohne TO-Klausel).
--
--    anon braucht hier gar nichts: account_state wird nur von der eingeloggten
--    App (App.tsx) und von SECURITY-DEFINER-RPCs angefasst. Letztere laufen als
--    Owner und umgehen RLS ohnehin.
--    account_id ist uuid -> ::text-Cast (vgl. Kommentar in spontan_rpc.sql).
-- ------------------------------------------------------------
alter table public.account_state enable row level security;

revoke all on public.account_state from anon;

-- App.tsx nutzt .upsert() -> insert UND update noetig, daher "for all".
create policy "Account-Inhaber voller Zugriff" on public.account_state
  for all to authenticated
  using (account_id::text = public.current_account_id())
  with check (account_id::text = public.current_account_id());


-- ------------------------------------------------------------
-- 8) registration_requests -- Anmeldeanfragen (Name, E-Mail, Telefon).
--    anon braucht nur INSERT (RegistrationForm.tsx, liest nichts zurueck).
-- ------------------------------------------------------------
alter table public.registration_requests enable row level security;

revoke all on public.registration_requests from anon;
grant insert on public.registration_requests to anon;

create policy "anon darf Anfrage stellen" on public.registration_requests
  for insert to anon
  with check (true);

create policy "Account-Inhaber voller Zugriff" on public.registration_requests
  for all to authenticated
  using (account_id::text = public.current_account_id())
  with check (account_id::text = public.current_account_id());


-- ------------------------------------------------------------
-- 9) user_profiles -- Rollenzuordnung. anon braucht nichts.
--    App.tsx liest ausschliesslich das EIGENE Profil (.eq("user_id", authUser.id)),
--    daher kein Vollzugriff fuer authenticated. Kein UPDATE/DELETE: die Rolle
--    darf sich niemand selbst setzen (sonst waere role='admin' frei waehlbar).
--    current_account_id() ist SECURITY DEFINER und liest hier trotzdem.
-- ------------------------------------------------------------
alter table public.user_profiles enable row level security;

revoke all on public.user_profiles from anon;

create policy "eigenes Profil lesen" on public.user_profiles
  for select to authenticated
  using (user_id = auth.uid());


-- ------------------------------------------------------------
-- 10) probetraining_anfragen -- Probetraining-Anfragen (Personendaten).
--
--     Hatte eine Policy namens "Allow all": {public}, ALL, qual=true,
--     with_check=true -> voellig offen fuer jeden, inkl. Loeschen.
--     Aktuell noch leer, deshalb war beim SELECT nichts zu sehen -- das war
--     Glueck, kein Schutz: mit der ersten Anfrage waere sie offen gewesen.
--
--     anon braucht hier NICHTS: kein oeffentliches Formular schreibt hinein
--     (nur App.tsx liest/aendert/loescht). Die Policy war Kollateralschaden.
--     Admin liest mit .in("account_id", [accountId, "public"]).
-- ------------------------------------------------------------
alter table public.probetraining_anfragen enable row level security;

revoke all on public.probetraining_anfragen from anon;

create policy "Account-Inhaber voller Zugriff" on public.probetraining_anfragen
  for all to authenticated
  using (account_id::text = any (array[public.current_account_id(), 'public']))
  with check (account_id::text = any (array[public.current_account_id(), 'public']));


-- ------------------------------------------------------------
-- 11) kennlerntennis_anfragen -- Name, Alter, E-Mail, Telefon, Spielstaerke.
--
--     War fuer anon nicht lesbar (Policies nur {authenticated}) -- aber alle
--     mit qual=true, d.h. JEDER eingeloggte Nutzer (auch ein Trainer eines
--     anderen Accounts) konnte die Anfragen ALLER Accounts lesen, aendern und
--     loeschen. Kein oeffentliches Leck, aber kaputte Mandantentrennung.
--
--     anon braucht nur INSERT (KennlerntennisForm.tsx:171, liest nichts zurueck).
-- ------------------------------------------------------------
alter table public.kennlerntennis_anfragen enable row level security;

revoke all on public.kennlerntennis_anfragen from anon;
grant insert on public.kennlerntennis_anfragen to anon;

create policy "anon darf Anfrage stellen" on public.kennlerntennis_anfragen
  for insert to anon
  with check (true);

create policy "Account-Inhaber voller Zugriff" on public.kennlerntennis_anfragen
  for all to authenticated
  using (account_id::text = public.current_account_id())
  with check (account_id::text = public.current_account_id());


-- ------------------------------------------------------------
-- 12) agb_content -- AGB-Texte (keine Personendaten).
--
--     Policy hiess "AGB nur vom Besitzer bearbeitbar", war aber {public}, ALL,
--     qual=true -> jeder Besucher konnte die AGB umschreiben oder loeschen.
--     Nachgemessen: PATCH kam bis in den Typ-Cast durch (22007).
--
--     Die Tabelle wird im Code NIRGENDS referenziert (AGB stehen fest in
--     AGBPage.tsx / AGBPageBritz.tsx) -- vermutlich Altlast. Das SELECT fuer
--     anon bleibt trotzdem erhalten: schadet nicht (oeffentlicher Text, keine
--     Personendaten) und bricht nichts, falls doch etwas ausserhalb dieses
--     Repos liest. Schreiben darf nur noch der Account-Inhaber.
--     Wenn sicher ist, dass sie tot ist: ersatzlos droppen.
-- ------------------------------------------------------------
alter table public.agb_content enable row level security;

revoke all on public.agb_content from anon;
grant select on public.agb_content to anon;

create policy "AGB oeffentlich lesbar" on public.agb_content
  for select to anon
  using (true);

create policy "Account-Inhaber darf bearbeiten" on public.agb_content
  for all to authenticated
  using (account_id::text = public.current_account_id())
  with check (account_id::text = public.current_account_id());


-- ------------------------------------------------------------
-- 13) Altlasten -- gefunden erst durch Kontrolle B (siehe unten).
--
--     conversations / conversation_members standen auf RLS = OFF mit 0 Policies
--     und vollen anon-Rechten (SELECT/INSERT/UPDATE/DELETE/TRUNCATE). In
--     pg_policies konnten sie gar nicht auftauchen -- ohne Policy kein Eintrag.
--     Dass anon dort 0 Zeilen sah, war KEIN Schutz: bei RLS=off sieht anon
--     alles, die Tabellen sind nur leer. Mit der ersten Chat-Nachricht waere
--     alles oeffentlich gewesen.
--
--     Keine dieser Tabellen wird im Code referenziert (weder conversations,
--     conversation_members, chat_messages noch account_state_backup). Reste
--     eines Chat-Experiments. Daher: RLS an, anon-Rechte weg, KEINE Policies --
--     "RLS aktiv + keine Policy" ist in Postgres default-deny. Bewusst keine
--     Policy erfunden: die Spalten sind unbekannt (Tabellen leer, kein Code),
--     eine geratene Bedingung waere schlimmer als gar keine.
--     Wird der Chat je gebaut, kommen die Policies dann dazu.
-- ------------------------------------------------------------
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;

revoke all on public.conversations        from anon;
revoke all on public.conversation_members from anon;

-- chat_messages: RLS + Policies waren ok (Bedingung haengt an auth.uid(), das
-- ist bei anon NULL -> greift nie). Die vollen anon-GRANTs sind trotzdem
-- ueberfluessig -- zweite Verteidigungslinie nachziehen.
revoke all on public.chat_messages from anon;

-- user_state: dito, Policies sind an auth.uid() gebunden und damit dicht.
revoke all on public.user_state from anon;

-- account_state_backup_20260705: vollstaendige Kopie des App-Zustands vom
-- 2026-07-05. Aktuell dicht (RLS an, 0 Policies = default deny), aber anon hat
-- weiterhin alle GRANTs -- wer die RLS je abschaltet, legt den ganzen Blob
-- offen. Rechte entziehen; die Tabelle selbst sollte geloescht werden, sobald
-- klar ist, dass das Backup nicht mehr gebraucht wird (bewusst NICHT hier).
revoke all on public.account_state_backup_20260705 from anon;


-- ------------------------------------------------------------
-- 14) Kontrolle A: zeigt alle Policies. Erwartung -- in "roles" steht nirgends
--     mehr "{public}", und keine anon-Regel hat qual = "true" ausser dem
--     AGB-SELECT (INSERT-Policies tragen ihre Bedingung in with_check).
-- ------------------------------------------------------------
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- ------------------------------------------------------------
-- 15) Kontrolle B -- WICHTIGER als A.
--     pg_policies zeigt nur Tabellen, die ueberhaupt Policies HABEN. Eine
--     Tabelle ganz ohne Policy und mit RLS=off taucht dort NICHT auf und ist
--     trotzdem (oder gerade deshalb) offen. Genau so waren agb_content,
--     probetraining_anfragen & Co. bis heute unbemerkt geblieben.
--
--     Diese Abfrage listet ALLE Tabellen mit RLS-Status und anon-Rechten.
--     Alarm bei: rls_an = false UND anon_rechte enthaelt SELECT/UPDATE/DELETE.
-- ------------------------------------------------------------
select
  c.relname                                                              as tabelle,
  c.relrowsecurity                                                       as rls_an,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname)           as policies,
  coalesce(string_agg(distinct g.privilege_type, ', ' order by g.privilege_type), '-') as anon_rechte
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join information_schema.role_table_grants g
  on g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'anon'
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relrowsecurity, c.relname;
