-- ============================================================
-- RPC: sepa_mandat_lookup — Mandats-Prüfung + Prefill für die öffentlichen
-- Formulare (src/SepaForm.tsx, src/RegistrationForm.tsx).
--
-- Anwenden auf die Remote-DB (wie supabase/spontan_rpc.sql), z.B.:
--   npx supabase db query --linked -f supabase/sepa_mandat_lookup.sql
-- oder den Inhalt im Supabase Dashboard → SQL Editor ausführen.
--
-- Hintergrund: Der Anon-Key darf sepa_mandates/account_state wegen RLS nicht
-- direkt lesen. Diese SECURITY-DEFINER-Funktion prüft per EXAKTEM vollständigem
-- Namen ODER E-Mail, ob bereits ein SEPA-Lastschriftmandat vorliegt, und liefert
-- die gespeicherten, NICHT-sensiblen Felder zum Vorausfüllen zurück.
--
-- Quellen (in dieser Reihenfolge): 1) sepa_mandates (öffentliches SEPA-Formular,
-- saubere Adressfelder), 2) App-Spieler aus account_state.data.spieler[]
-- (Kontakt/Adresse aus der Verwaltung). Es wird bewusst KEINE IBAN zurückgegeben.
-- Der Match ist exakt (kein LIKE), damit sich Daten nicht per Teil-Eingabe
-- abfragen lassen.
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
  sp jsonb;
  v_addr text;
  v_rest text;
  v_strasse text;
  v_plz text;
  v_ort text;
begin
  if v_name = '' and v_email = '' then
    return jsonb_build_object('hatMandat', false);
  end if;

  -- 1) Neuestes passendes Mandat aus dem öffentlichen SEPA-Formular (saubere Felder).
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

  -- 2) Sonst: passenden App-Spieler aus der Verwaltung suchen (Prefill + hatMandat).
  select data into state from account_state where account_id = p_account_id::uuid;
  if state is not null then
    select t.elem into sp
    from jsonb_array_elements(coalesce(state->'spieler', '[]'::jsonb)) t(elem)
    where (v_name <> '' and lower(trim(coalesce(t.elem->>'vorname', '') || ' ' || coalesce(t.elem->>'nachname', ''))) = v_name)
       or (v_email <> '' and lower(coalesce(t.elem->>'kontaktEmail', '')) = v_email)
    limit 1;

    if sp is not null then
      -- rechnungsAdresse "Strasse, PLZ Ort" bestmöglich zerlegen.
      v_addr := trim(coalesce(sp->>'rechnungsAdresse', ''));
      v_strasse := null; v_plz := null; v_ort := null;
      if v_addr <> '' then
        if position(',' in v_addr) > 0 then
          v_strasse := trim(split_part(v_addr, ',', 1));
          v_rest := trim(substring(v_addr from position(',' in v_addr) + 1));
        else
          v_rest := v_addr;
        end if;
        if v_rest ~ '^\d{5}\s' then
          v_plz := substring(v_rest from '^(\d{5})');
          v_ort := trim(substring(v_rest from '^\d{5}\s+(.*)$'));
        else
          v_ort := v_rest;
        end if;
      end if;

      return jsonb_build_object(
        'hatMandat', (coalesce(trim(sp->>'mandatsreferenz'), '') <> '' or coalesce(trim(sp->>'iban'), '') <> ''),
        'vorname', sp->>'vorname',
        'nachname', sp->>'nachname',
        'strasse', v_strasse,
        'plz', v_plz,
        'ort', v_ort,
        'email', sp->>'kontaktEmail',
        'telefon', sp->>'kontaktTelefon',
        'istKind', coalesce((sp->>'abweichenderEmpfaenger')::boolean, false),
        'elternteilName', sp->>'empfaengerName'
      );
    end if;
  end if;

  return jsonb_build_object('hatMandat', false);
end;
$$;

grant execute on function public.sepa_mandat_lookup(text, text, text) to anon, authenticated;
