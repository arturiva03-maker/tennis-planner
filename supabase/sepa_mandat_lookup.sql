-- ============================================================
-- RPC: sepa_mandat_lookup — Mandats-Prüfung + Prefill für das öffentliche
-- SEPA-Formular (src/SepaForm.tsx).
--
-- Anwenden auf die Remote-DB (wie supabase/spontan_rpc.sql), z.B.:
--   npx supabase db query --linked -f supabase/sepa_mandat_lookup.sql
-- oder den Inhalt im Supabase Dashboard → SQL Editor ausführen.
--
-- Hintergrund: Der Anon-Key darf sepa_mandates wegen RLS nicht direkt lesen.
-- Diese SECURITY-DEFINER-Funktion prüft per EXAKTEM vollständigem Namen ODER
-- E-Mail, ob bereits ein SEPA-Lastschriftmandat vorliegt, und liefert die
-- gespeicherten, NICHT-sensiblen Felder zum Vorausfüllen zurück.
--
-- Datenschutz: Es wird bewusst KEINE IBAN zurückgegeben. Der Match ist exakt
-- (kein LIKE), damit sich gespeicherte Adress-/Kontaktdaten nicht per Teil-
-- Eingabe abfragen lassen. Quelle der Prefill-Felder ist ausschließlich
-- sepa_mandates; App-Spieler (account_state) liefern nur den hatMandat-Boolean.
-- ============================================================

create or replace function public.sepa_mandat_lookup(
  p_account_id text,
  p_name text,
  p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := lower(trim(coalesce(p_name, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
  m sepa_mandates%rowtype;
  state jsonb;
begin
  if v_name = '' and v_email = '' then
    return jsonb_build_object('hatMandat', false);
  end if;

  -- Neuestes passendes Mandat aus dem öffentlichen SEPA-Formular.
  select * into m
  from sepa_mandates s
  where s.account_id = p_account_id
    and (
      (v_name <> '' and lower(trim(coalesce(s.vorname, '') || ' ' || coalesce(s.nachname, ''))) = v_name)
      or (v_email <> '' and lower(coalesce(s.email, '')) = v_email)
    )
  order by s.created_at desc nulls last
  limit 1;

  if m.id is not null then
    -- Vollständiges Mandat vorhanden → hatMandat + nicht-sensible Prefill-Felder
    -- (ohne IBAN).
    return jsonb_build_object(
      'hatMandat', true,
      'vorname', m.vorname,
      'nachname', m.nachname,
      'strasse', m.strasse,
      'plz', m.plz,
      'ort', m.ort,
      'email', m.email,
      'telefon', m.telefon,
      'istKind', coalesce(m.ist_kind, false),
      'elternteilName', m.elternteil_name
    );
  end if;

  -- Kein sepa_mandates-Eintrag: prüfen, ob ein App-Spieler ein Mandat hinterlegt
  -- hat (mandatsreferenz/iban). Nur Boolean, keine Prefill-Daten.
  select data into state from account_state where account_id = p_account_id::uuid;
  if state is not null and exists (
    select 1
    from jsonb_array_elements(coalesce(state->'spieler', '[]'::jsonb)) t(sp)
    where (coalesce(trim(sp->>'mandatsreferenz'), '') <> '' or coalesce(trim(sp->>'iban'), '') <> '')
      and (
        (v_name <> '' and lower(trim(coalesce(sp->>'vorname', '') || ' ' || coalesce(sp->>'nachname', ''))) = v_name)
        or (v_email <> '' and lower(coalesce(sp->>'kontaktEmail', '')) = v_email)
      )
  ) then
    return jsonb_build_object('hatMandat', true);
  end if;

  return jsonb_build_object('hatMandat', false);
end;
$$;

grant execute on function public.sepa_mandat_lookup(text, text, text) to anon, authenticated;
