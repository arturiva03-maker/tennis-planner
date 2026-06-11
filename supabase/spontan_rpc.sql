-- ============================================================
-- RPC-Funktionen für spontane Trainingsstunden
-- Angewendet auf die Remote-DB via: npx supabase db query --linked -f supabase/spontan_rpc.sql
--
-- Hintergrund: account_state (App-Kalender als JSON-Blob) ist per RLS nur für
-- eingeloggte Nutzer zugänglich. Die öffentlichen Seiten (Buchung /wedding,
-- /britz und Absage /absage/:id) brauchen aber eng begrenzte Kalender-
-- Operationen. Diese SECURITY-DEFINER-Funktionen kapseln genau diese
-- Operationen; die Slot-UUID dient als Capability-Token (wie bisher beim
-- Absage-Link). Die offene Admin-App übernimmt Blob-Änderungen über ihre
-- bestehende Realtime-Subscription auf account_state.
--
-- Achtung: spontane_stunden.account_id ist text, account_state.account_id ist
-- uuid - daher die ::uuid-Casts.
-- ============================================================

-- Gebuchte spontane Stunde in den App-Kalender übernehmen (idempotent).
-- Legt bei Bedarf einen Spieler an (Match per E-Mail) und erstellt das
-- Training inkl. Preis: custom_preis_pro_stunde, sonst Tarif, sonst
-- 40 EUR/Stunde als individueller Preis (nur Anlage Wedding - dort wird
-- dieser Standardpreis auf der Website beworben).
create or replace function public.spontan_buchung_uebernehmen(slot_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slot spontane_stunden%rowtype;
  state jsonb;
  spieler_arr jsonb;
  trainings_arr jsonb;
  sp jsonb;
  altes_training jsonb;
  training_existiert boolean := false;
  spieler_neu boolean := false;
  v_spieler_id text;
  v_training_id text;
  v_name text;
  v_vorname text;
  v_nachname text;
  v_email text;
  v_telefon text;
  neues_training jsonb;
  v_preis numeric;
begin
  select * into slot from spontane_stunden where id = slot_id;
  if not found or slot.status <> 'gebucht' or slot.buchung is null then
    return null;
  end if;

  select data into state from account_state where account_id = slot.account_id::uuid for update;
  if state is null then
    return null;
  end if;

  trainings_arr := coalesce(state->'trainings', '[]'::jsonb);
  spieler_arr := coalesce(state->'spieler', '[]'::jsonb);

  -- Spieler auflösen bzw. anlegen (Match per E-Mail)
  v_name := coalesce(trim(slot.buchung->>'name'), '');
  if v_name = '' then v_name := 'Unbekannt'; end if;
  v_email := lower(coalesce(trim(slot.buchung->>'email'), ''));
  v_telefon := nullif(trim(coalesce(slot.buchung->>'telefon', '')), '');

  -- Letztes Wort = Nachname (wie in der App)
  if position(' ' in v_name) > 0 then
    v_nachname := regexp_replace(v_name, '^.*\s', '');
    v_vorname := trim(regexp_replace(v_name, '\s+\S+$', ''));
  else
    v_vorname := v_name;
    v_nachname := null;
  end if;

  select t.value into sp
  from jsonb_array_elements(spieler_arr) t(value)
  where v_email <> '' and lower(coalesce(t.value->>'kontaktEmail', '')) = v_email
  limit 1;

  if sp is not null then
    v_spieler_id := sp->>'id';
  else
    spieler_neu := true;
    v_spieler_id := gen_random_uuid()::text;
    sp := jsonb_build_object(
      'id', v_spieler_id,
      'vorname', v_vorname,
      'notizen', 'Spontanbuchung'
    );
    if v_nachname is not null then sp := sp || jsonb_build_object('nachname', v_nachname); end if;
    if v_email <> '' then sp := sp || jsonb_build_object('kontaktEmail', v_email); end if;
    if v_telefon is not null then sp := sp || jsonb_build_object('kontaktTelefon', v_telefon); end if;
    state := jsonb_set(state, '{spieler}', spieler_arr || jsonb_build_array(sp));
  end if;

  -- Existiert das verknüpfte Training noch im Kalender?
  if slot.training_id is not null then
    select t.value into altes_training
    from jsonb_array_elements(trainings_arr) t(value)
    where t.value->>'id' = slot.training_id
    limit 1;

    if altes_training is not null then
      training_existiert := true;
      v_training_id := slot.training_id;

      -- Bereits vollständig übernommen? Dann nichts schreiben.
      if not spieler_neu and coalesce(altes_training->'spielerIds', '[]'::jsonb) ? v_spieler_id then
        return v_training_id;
      end if;

      -- Spieler ins bestehende Training eintragen (z.B. wenn der Slot über
      -- das Kurzfristig-Häkchen aus einem Kalender-Training erstellt wurde)
      trainings_arr := (
        select coalesce(jsonb_agg(
          case when t.value->>'id' = slot.training_id then
            jsonb_set(
              t.value || jsonb_build_object('isSpontanBuchung', true),
              '{spielerIds}',
              case when coalesce(t.value->'spielerIds', '[]'::jsonb) ? v_spieler_id
                   then coalesce(t.value->'spielerIds', '[]'::jsonb)
                   else coalesce(t.value->'spielerIds', '[]'::jsonb) || to_jsonb(v_spieler_id) end
            )
          else t.value end
        ), '[]'::jsonb)
        from jsonb_array_elements(trainings_arr) t(value)
      );
      state := jsonb_set(state, '{trainings}', trainings_arr);
    else
      v_training_id := slot.training_id; -- Training ging verloren: mit gleicher ID neu anlegen
    end if;
  else
    v_training_id := gen_random_uuid()::text;
  end if;

  if not training_existiert then
    neues_training := jsonb_build_object(
      'id', v_training_id,
      'trainerId', slot.trainer_id,
      'datum', to_char(slot.datum, 'YYYY-MM-DD'),
      'uhrzeitVon', to_char(slot.uhrzeit_von, 'HH24:MI'),
      'uhrzeitBis', to_char(slot.uhrzeit_bis, 'HH24:MI'),
      'spielerIds', jsonb_build_array(v_spieler_id),
      'status', 'geplant',
      'anlage', slot.anlage,
      'isSpontanBuchung', true
    );

    if slot.tarif_id is not null and slot.tarif_id <> '' then
      neues_training := neues_training || jsonb_build_object('tarifId', slot.tarif_id);
    end if;

    v_preis := slot.custom_preis_pro_stunde;
    if v_preis is null and (slot.tarif_id is null or slot.tarif_id = '') and slot.anlage = 'Wedding' then
      v_preis := 40; -- beworbener Standardpreis auf der Wedding-Seite
    end if;
    if v_preis is not null then
      neues_training := neues_training || jsonb_build_object('customPreisProStunde', v_preis);
    end if;

    state := jsonb_set(state, '{trainings}', trainings_arr || jsonb_build_array(neues_training));
  end if;

  update account_state set data = state, updated_at = now() where account_id = slot.account_id::uuid;
  update spontane_stunden set training_id = v_training_id where id = slot_id;

  return v_training_id;
end;
$$;

-- Spontane Stunde buchen + sofort in den Kalender übernehmen (atomar).
create or replace function public.spontan_buchen(slot_id uuid, p_name text, p_email text, p_telefon text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  slot spontane_stunden%rowtype;
  v_buchung jsonb;
  v_training_id text;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' then
    return jsonb_build_object('ok', false, 'fehler', 'eingabe');
  end if;

  v_buchung := jsonb_build_object(
    'name', trim(p_name),
    'email', trim(p_email),
    'gebuchtAm', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  if p_telefon is not null and trim(p_telefon) <> '' then
    v_buchung := v_buchung || jsonb_build_object('telefon', trim(p_telefon));
  end if;

  update spontane_stunden
     set status = 'gebucht', buchung = v_buchung
   where id = slot_id and status = 'offen' and veroeffentlicht = true
  returning * into slot;

  if not found then
    return jsonb_build_object('ok', false, 'fehler', 'belegt');
  end if;

  begin
    v_training_id := spontan_buchung_uebernehmen(slot_id);
  exception when others then
    v_training_id := null; -- Buchung gilt trotzdem, Übernahme holt die App nach
  end;

  return jsonb_build_object('ok', true, 'training_id', v_training_id);
end;
$$;

-- Gebuchte spontane Stunde absagen. Erzwingt die 24-Stunden-Frist serverseitig,
-- entfernt das verknüpfte Training aus dem Kalender und gibt den Slot wieder frei.
create or replace function public.spontan_buchung_absagen(slot_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  slot spontane_stunden%rowtype;
  state jsonb;
  trainings_arr jsonb;
  start_ts timestamptz;
begin
  select * into slot from spontane_stunden where id = slot_id;
  if not found then
    return 'nicht_gefunden';
  end if;
  if slot.status <> 'gebucht' then
    return 'nicht_gebucht';
  end if;

  start_ts := (slot.datum::text || ' ' || slot.uhrzeit_von::text)::timestamp at time zone 'Europe/Berlin';
  if start_ts - now() < interval '24 hours' then
    return 'zu_kurzfristig';
  end if;

  if slot.training_id is not null then
    select data into state from account_state where account_id = slot.account_id::uuid for update;
    if state is not null and state ? 'trainings' then
      trainings_arr := (
        select coalesce(jsonb_agg(t.value), '[]'::jsonb)
        from jsonb_array_elements(state->'trainings') t(value)
        where t.value->>'id' is distinct from slot.training_id
      );
      state := jsonb_set(state, '{trainings}', trainings_arr);
      update account_state set data = state, updated_at = now() where account_id = slot.account_id::uuid;
    end if;
  end if;

  update spontane_stunden
     set status = 'offen', buchung = null, training_id = null, veroeffentlicht = true
   where id = slot_id;

  return 'ok';
end;
$$;

-- Trainer-Kontakt (Name + Telefon) zum Slot, für die Absage-Seite bei
-- kurzfristigen Absagen. Liest nur diese beiden Felder aus dem Blob.
create or replace function public.spontan_trainer_kontakt(slot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  slot spontane_stunden%rowtype;
  state jsonb;
  tr jsonb;
begin
  select * into slot from spontane_stunden where id = slot_id;
  if not found then
    return null;
  end if;

  select data into state from account_state where account_id = slot.account_id::uuid;
  if state is null then
    return null;
  end if;

  select t.value into tr
  from jsonb_array_elements(coalesce(state->'trainers', '[]'::jsonb)) t(value)
  where t.value->>'id' = slot.trainer_id
  limit 1;

  if tr is null then
    return null;
  end if;

  return jsonb_build_object(
    'name', trim(coalesce(tr->>'name', '') || ' ' || coalesce(tr->>'nachname', '')),
    'telefon', tr->>'telefon'
  );
end;
$$;

grant execute on function public.spontan_buchung_uebernehmen(uuid) to anon, authenticated;
grant execute on function public.spontan_buchen(uuid, text, text, text) to anon, authenticated;
grant execute on function public.spontan_buchung_absagen(uuid) to anon, authenticated;
grant execute on function public.spontan_trainer_kontakt(uuid) to anon, authenticated;

-- spontane_stunden in die Realtime-Publikation aufnehmen: Die App lauscht auf
-- diese (kleinen) Zeilen als zuverlässigen Buchungs-Trigger. Der account_state-
-- Blob kann das 1-MB-Payload-Limit von Realtime überschreiten - dann kommen
-- dessen Events ohne Daten an und die App lädt per REST nach.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'spontane_stunden'
  ) then
    alter publication supabase_realtime add table public.spontane_stunden;
  end if;
end $$;
