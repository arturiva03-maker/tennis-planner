-- ============================================================
-- RPC-Funktionen für spontane Trainingsstunden / Sommerferien-Training
-- Angewendet auf die Remote-DB via: npx supabase db query --linked -f supabase/spontan_rpc.sql
--
-- Hintergrund: account_state (App-Kalender als JSON-Blob) ist per RLS nur für
-- eingeloggte Nutzer zugänglich. Die öffentlichen Seiten (Buchung /wedding,
-- /britz und Absage /absage/:id) brauchen aber eng begrenzte Kalender-
-- Operationen. Diese SECURITY-DEFINER-Funktionen kapseln genau diese
-- Operationen; die Slot-UUID dient als Capability-Token.
--
-- Achtung: spontane_stunden.account_id ist text, account_state.account_id ist
-- uuid - daher die ::uuid-Casts.
--
-- Gruppenbuchung (Wedding/Sommerferien): eine Person kann mehrere Teilnehmer
-- buchen. buchung.weitereTeilnehmer = Namen der Mitspieler, buchung.preisProPerson
-- = Staffelpreis (40/25/20/15 je nach Gruppengröße). Die Übernahme legt für jeden
-- Teilnehmer einen Spieler an und erstellt EIN Training mit allen Spielern,
-- customPreisProStunde = Preis pro Person, customAbrechnung = 'proSpieler'.
-- ============================================================

-- Gebuchte spontane Stunde in den App-Kalender übernehmen (idempotent, mehrere Spieler).
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
  altes_training jsonb;
  training_existiert boolean := false;
  participants jsonb;
  part jsonb;
  sp jsonb;
  spieler_ids jsonb := '[]'::jsonb;
  merged_ids jsonb;
  v_spieler_id text;
  v_booker_spieler_id text;
  v_name text;
  v_vorname text;
  v_nachname text;
  v_email text;
  v_telefon text;
  neues_training jsonb;
  v_preis numeric;
  v_gruppe boolean := false;
  v_training_id text;
  v_mandat sepa_mandates%rowtype;
  v_mandat_fields jsonb;
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

  -- Teilnehmerliste: Bucher (mit E-Mail/Telefon) + weitere (nur Name)
  participants := jsonb_build_array(jsonb_build_object(
    'name', coalesce(nullif(trim(slot.buchung->>'name'), ''), 'Unbekannt'),
    'email', lower(coalesce(trim(slot.buchung->>'email'), '')),
    'telefon', nullif(trim(coalesce(slot.buchung->>'telefon', '')), '')
  ));
  if jsonb_typeof(slot.buchung->'weitereTeilnehmer') = 'array' then
    participants := participants || (
      select coalesce(jsonb_agg(jsonb_build_object('name', trim(w.value))), '[]'::jsonb)
      from jsonb_array_elements_text(slot.buchung->'weitereTeilnehmer') w(value)
      where trim(coalesce(w.value, '')) <> ''
    );
  end if;

  -- Verknüpftes Training schon vorhanden?
  if slot.training_id is not null then
    select t.value into altes_training
    from jsonb_array_elements(trainings_arr) t(value)
    where t.value->>'id' = slot.training_id
    limit 1;
    if altes_training is not null then
      training_existiert := true;
    end if;
  end if;

  -- Idempotenz: Bucher (per E-Mail) schon im Training? Dann nichts tun.
  -- Teilen sich mehrere Spieler dieselbe E-Mail (z.B. eine Person ist zugleich
  -- Kontakt einer Mannschaft), den passenden PERSONEN-Eintrag bevorzugen:
  -- 1. exakter Namens-Treffer, 2. E-Mail-Treffer, der KEINE Mannschaft ist.
  v_email := participants->0->>'email';
  v_name := participants->0->>'name';
  if v_email <> '' then
    select t.value->>'id' into v_booker_spieler_id
    from jsonb_array_elements(spieler_arr) t(value)
    where lower(coalesce(t.value->>'kontaktEmail', '')) = v_email
      and lower(trim(coalesce(t.value->>'vorname', '') || ' ' || coalesce(t.value->>'nachname', ''))) = lower(coalesce(v_name, ''))
    limit 1;
    if v_booker_spieler_id is null then
      select t.value->>'id' into v_booker_spieler_id
      from jsonb_array_elements(spieler_arr) t(value)
      where lower(coalesce(t.value->>'kontaktEmail', '')) = v_email
        and not (coalesce(t.value->'labels', '[]'::jsonb) ? 'Mannschaften')
      limit 1;
    end if;
  end if;
  if training_existiert and v_booker_spieler_id is not null
     and coalesce(altes_training->'spielerIds', '[]'::jsonb) ? v_booker_spieler_id then
    return slot.training_id;
  end if;

  -- Alle Teilnehmer als Spieler auflösen/anlegen, IDs sammeln. Wurde im Buchungs-
  -- formular (oder vorher per /sepa) ein SEPA-Lastschriftmandat erteilt, wird es dem
  -- Spieler automatisch zugeordnet (mandatsreferenz/iban/... aus sepa_mandates).
  for part in select value from jsonb_array_elements(participants)
  loop
    v_name := coalesce(nullif(trim(part->>'name'), ''), 'Unbekannt');
    v_email := lower(coalesce(part->>'email', ''));
    v_telefon := nullif(part->>'telefon', '');
    if position(' ' in v_name) > 0 then
      v_nachname := regexp_replace(v_name, '^.*\s', '');
      v_vorname := trim(regexp_replace(v_name, '\s+\S+$', ''));
    else
      v_vorname := v_name;
      v_nachname := null;
    end if;

    -- Passendes Mandat (per E-Mail oder vollständigem Namen), neuestes zuerst.
    v_mandat := null;
    select m.* into v_mandat
    from sepa_mandates m
    where m.account_id = slot.account_id
      and (
        (v_email <> '' and lower(coalesce(m.email, '')) = v_email)
        or lower(trim(coalesce(m.vorname, '') || ' ' || coalesce(m.nachname, ''))) = lower(v_name)
      )
    order by m.created_at desc nulls last
    limit 1;

    -- Mandatsfelder für den Spieler aufbereiten (nur wenn echtes Mandat vorhanden).
    v_mandat_fields := '{}'::jsonb;
    if v_mandat.id is not null and coalesce(trim(v_mandat.mandatsreferenz), '') <> '' then
      v_mandat_fields := jsonb_build_object(
        'mandatsreferenz', trim(v_mandat.mandatsreferenz),
        'sepaSequenz', 'RCUR'
      );
      if coalesce(trim(v_mandat.iban), '') <> '' then
        v_mandat_fields := v_mandat_fields || jsonb_build_object('iban', trim(v_mandat.iban));
      end if;
      if v_mandat.unterschriftsdatum is not null then
        v_mandat_fields := v_mandat_fields || jsonb_build_object('unterschriftsdatum', to_char(v_mandat.unterschriftsdatum, 'YYYY-MM-DD'));
      end if;
      if coalesce(v_mandat.ist_kind, false) and coalesce(trim(v_mandat.elternteil_name), '') <> '' then
        v_mandat_fields := v_mandat_fields
          || jsonb_build_object('abweichenderEmpfaenger', true, 'empfaengerName', trim(v_mandat.elternteil_name));
      end if;
      if coalesce(trim(v_mandat.strasse), '') <> '' or coalesce(trim(v_mandat.plz), '') <> '' or coalesce(trim(v_mandat.ort), '') <> '' then
        v_mandat_fields := v_mandat_fields || jsonb_build_object(
          'rechnungsAdresse',
          trim(concat_ws(', ', nullif(trim(coalesce(v_mandat.strasse, '')), ''), nullif(trim(concat_ws(' ', v_mandat.plz, v_mandat.ort)), '')))
        );
      end if;
    end if;

    v_spieler_id := null;
    if v_email <> '' then
      -- Wie bei der Bucher-Zuordnung oben: Namens-Treffer bevorzugen und
      -- Mannschafts-Eintraege meiden, damit eine Buchung nie faelschlich
      -- einem Gruppen-Spieler (gleiche Kontakt-E-Mail) zugeordnet wird.
      select t.value->>'id' into v_spieler_id
      from jsonb_array_elements(spieler_arr) t(value)
      where lower(coalesce(t.value->>'kontaktEmail', '')) = v_email
        and lower(trim(coalesce(t.value->>'vorname', '') || ' ' || coalesce(t.value->>'nachname', ''))) = lower(v_name)
      limit 1;
      if v_spieler_id is null then
        select t.value->>'id' into v_spieler_id
        from jsonb_array_elements(spieler_arr) t(value)
        where lower(coalesce(t.value->>'kontaktEmail', '')) = v_email
          and not (coalesce(t.value->'labels', '[]'::jsonb) ? 'Mannschaften')
        limit 1;
      end if;
    end if;

    if v_spieler_id is null then
      v_spieler_id := gen_random_uuid()::text;
      sp := jsonb_build_object('id', v_spieler_id, 'vorname', v_vorname, 'notizen', 'Spontanbuchung');
      if v_nachname is not null then sp := sp || jsonb_build_object('nachname', v_nachname); end if;
      if v_email <> '' then sp := sp || jsonb_build_object('kontaktEmail', v_email); end if;
      if v_telefon is not null then sp := sp || jsonb_build_object('kontaktTelefon', v_telefon); end if;
      sp := sp || v_mandat_fields;  -- Mandat direkt zuordnen (falls vorhanden)
      spieler_arr := spieler_arr || jsonb_build_array(sp);
    elsif v_mandat_fields <> '{}'::jsonb then
      -- Bestehender Spieler ohne Mandat: ergänzen, vorhandenes Mandat nie überschreiben.
      spieler_arr := (
        select coalesce(jsonb_agg(
          case when t.value->>'id' = v_spieler_id and coalesce(trim(t.value->>'mandatsreferenz'), '') = ''
            then t.value || v_mandat_fields
            else t.value end
        ), '[]'::jsonb)
        from jsonb_array_elements(spieler_arr) t(value)
      );
    end if;

    if not (spieler_ids ? v_spieler_id) then
      spieler_ids := spieler_ids || to_jsonb(v_spieler_id);
    end if;
  end loop;

  state := jsonb_set(state, '{spieler}', spieler_arr);

  -- Preis: Staffelpreis pro Person aus der Buchung, sonst custom_preis, sonst
  -- 40 EUR Standard (Wedding UND Britz - beide Seiten werben mit 40 EUR/1 Person).
  v_preis := nullif(slot.buchung->>'preisProPerson', '')::numeric;
  v_gruppe := v_preis is not null;
  if v_preis is null then
    v_preis := slot.custom_preis_pro_stunde;
    if v_preis is null and (slot.tarif_id is null or slot.tarif_id = '') then
      v_preis := 40;
    end if;
  end if;

  if training_existiert then
    merged_ids := (
      select coalesce(jsonb_agg(distinct x), '[]'::jsonb)
      from (
        select jsonb_array_elements_text(coalesce(altes_training->'spielerIds', '[]'::jsonb)) as x
        union
        select jsonb_array_elements_text(spieler_ids) as x
      ) u
    );
    trainings_arr := (
      select coalesce(jsonb_agg(
        case when t.value->>'id' = slot.training_id then
          (t.value
            || jsonb_build_object('isSpontanBuchung', true, 'spielerIds', merged_ids)
            || (case when v_preis is not null
                     then jsonb_build_object('customPreisProStunde', v_preis)
                          || (case when v_gruppe then jsonb_build_object('customAbrechnung', 'proSpieler') else '{}'::jsonb end)
                     else '{}'::jsonb end))
        else t.value end
      ), '[]'::jsonb)
      from jsonb_array_elements(trainings_arr) t(value)
    );
    state := jsonb_set(state, '{trainings}', trainings_arr);
    update account_state set data = state, updated_at = now() where account_id = slot.account_id::uuid;
    return slot.training_id;
  else
    v_training_id := coalesce(slot.training_id, gen_random_uuid()::text);
    neues_training := jsonb_build_object(
      'id', v_training_id,
      'trainerId', slot.trainer_id,
      'datum', to_char(slot.datum, 'YYYY-MM-DD'),
      'uhrzeitVon', to_char(slot.uhrzeit_von, 'HH24:MI'),
      'uhrzeitBis', to_char(slot.uhrzeit_bis, 'HH24:MI'),
      'spielerIds', spieler_ids,
      'status', 'geplant',
      'anlage', slot.anlage,
      'isSpontanBuchung', true
    );
    if slot.tarif_id is not null and slot.tarif_id <> '' then
      neues_training := neues_training || jsonb_build_object('tarifId', slot.tarif_id);
    end if;
    if v_preis is not null then
      neues_training := neues_training || jsonb_build_object('customPreisProStunde', v_preis);
      if v_gruppe then
        neues_training := neues_training || jsonb_build_object('customAbrechnung', 'proSpieler');
      end if;
    end if;
    if coalesce(trim(slot.buchung->>'hinweis'), '') <> '' then
      neues_training := neues_training || jsonb_build_object('notiz', trim(slot.buchung->>'hinweis'));
    end if;
    state := jsonb_set(state, '{trainings}', trainings_arr || jsonb_build_array(neues_training));
    update account_state set data = state, updated_at = now() where account_id = slot.account_id::uuid;
    update spontane_stunden set training_id = v_training_id where id = slot_id;
    return v_training_id;
  end if;
end;
$$;

-- Spontane Stunde buchen + sofort in den Kalender übernehmen (atomar).
-- p_weitere_teilnehmer / p_preis_pro_person sind optional (Britz nutzt die
-- 4-Argument-Form weiterhin ohne Gruppe).
drop function if exists public.spontan_buchen(uuid, text, text, text);
drop function if exists public.spontan_buchen(uuid, text, text, text, text[], numeric);
create or replace function public.spontan_buchen(
  slot_id uuid,
  p_name text,
  p_email text,
  p_telefon text default null,
  p_hinweis text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  slot spontane_stunden%rowtype;
  v_buchung jsonb;
  v_training_id text;
  v_account text;
  v_anlage text;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = '' then
    return jsonb_build_object('ok', false, 'fehler', 'eingabe');
  end if;

  -- Slot-Stammdaten für Mandatsprüfung
  select account_id, anlage into v_account, v_anlage from spontane_stunden where id = slot_id;
  if v_account is null then
    return jsonb_build_object('ok', false, 'fehler', 'belegt');
  end if;

  -- Mandatspflicht nur für Wedding (Sommerferien-Training): nur der Hauptbucher
  -- muss ein SEPA-Lastschriftmandat hinterlegt haben.
  if v_anlage = 'Wedding' and not spontan_hat_mandat(v_account, p_name, p_email) then
    return jsonb_build_object('ok', false, 'fehler', 'kein_mandat', 'ohneMandat', to_jsonb(array[trim(p_name)]));
  end if;

  v_buchung := jsonb_build_object(
    'name', trim(p_name),
    'email', trim(p_email),
    'gebuchtAm', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
  if p_telefon is not null and trim(p_telefon) <> '' then
    v_buchung := v_buchung || jsonb_build_object('telefon', trim(p_telefon));
  end if;
  if p_hinweis is not null and trim(p_hinweis) <> '' then
    v_buchung := v_buchung || jsonb_build_object('hinweis', trim(p_hinweis));
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
    v_training_id := null;
  end;

  return jsonb_build_object('ok', true, 'training_id', v_training_id);
end;
$$;

-- Gebuchte spontane Stunde absagen. Erzwingt die 48-Stunden-Frist serverseitig,
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
  if start_ts - now() < interval '48 hours' then
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

-- Hat eine Person (per vollständigem Namen ODER E-Mail) ein SEPA-Lastschriftmandat?
-- Prüft beide Quellen: App-Spieler (mandatsreferenz/iban) und die sepa_mandates-Tabelle.
create or replace function public.spontan_hat_mandat(p_account_id text, p_name text, p_email text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  state jsonb;
  v_name text := lower(trim(coalesce(p_name, '')));
  v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_name = '' and v_email = '' then
    return false;
  end if;

  select data into state from account_state where account_id = p_account_id::uuid;

  -- Name hat Vorrang: ist ein Name angegeben, MUSS er passen; die E-Mail ist nur
  -- Fallback ohne Namen. Sonst würde ein Kind mit der E-Mail eines Elternteils
  -- (das ein Mandat hat) fälschlich als "hat Mandat" gemeldet.

  -- App-Spieler mit hinterlegtem Mandat
  if state is not null and exists (
    select 1
    from jsonb_array_elements(coalesce(state->'spieler', '[]'::jsonb)) t(sp)
    where (coalesce(trim(sp->>'mandatsreferenz'), '') <> '' or coalesce(trim(sp->>'iban'), '') <> '')
      and case
        when v_name <> '' then lower(trim(coalesce(sp->>'vorname', '') || ' ' || coalesce(sp->>'nachname', ''))) = v_name
        else (v_email <> '' and lower(coalesce(sp->>'kontaktEmail', '')) = v_email)
      end
  ) then
    return true;
  end if;

  -- Mandat aus dem öffentlichen SEPA-Formular (sepa_mandates)
  if exists (
    select 1 from sepa_mandates m
    where m.account_id = p_account_id
      and case
        when v_name <> '' then lower(trim(coalesce(m.vorname, '') || ' ' || coalesce(m.nachname, ''))) = v_name
        else (v_email <> '' and lower(coalesce(m.email, '')) = v_email)
      end
  ) then
    return true;
  end if;

  return false;
end;
$$;

-- Namens-Autocomplete für das Sommerferien-Buchungsformular: liefert zu einer
-- Eingabe (>= 2 Zeichen) passende Personen-NAMEN (ohne Mandats-Status; dieser
-- wird erst bei der Auswahl per spontan_hat_mandat geprüft). Quelle: App-Spieler
-- + sepa_mandates. Liefert maximal ~10 deduplizierte Namen.
create or replace function public.spontan_spieler_suche(p_account_id text, q text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  state jsonb;
  v_q text := lower(trim(coalesce(q, '')));
  result jsonb := '[]'::jsonb;
  seen text[] := '{}';
  rec record;
begin
  if length(v_q) < 2 then
    return '[]'::jsonb;
  end if;

  select data into state from account_state where account_id = p_account_id::uuid;

  -- App-Spieler, deren Name die Eingabe enthält
  if state is not null then
    for rec in
      select distinct trim(coalesce(sp->>'vorname', '') || ' ' || coalesce(sp->>'nachname', '')) as name
      from jsonb_array_elements(coalesce(state->'spieler', '[]'::jsonb)) t(sp)
      where lower(trim(coalesce(sp->>'vorname', '') || ' ' || coalesce(sp->>'nachname', ''))) like '%' || v_q || '%'
      order by 1
      limit 20
    loop
      if rec.name = '' or lower(rec.name) = any(seen) then
        continue;
      end if;
      seen := seen || lower(rec.name);
      result := result || to_jsonb(rec.name);
      exit when jsonb_array_length(result) >= 10;
    end loop;
  end if;

  -- Personen, die nur im SEPA-Formular stehen
  if jsonb_array_length(result) < 10 then
    for rec in
      select distinct trim(coalesce(vorname, '') || ' ' || coalesce(nachname, '')) as name
      from sepa_mandates
      where account_id = p_account_id
        and lower(trim(coalesce(vorname, '') || ' ' || coalesce(nachname, ''))) like '%' || v_q || '%'
      order by 1
      limit 20
    loop
      if rec.name = '' or lower(rec.name) = any(seen) then
        continue;
      end if;
      seen := seen || lower(rec.name);
      result := result || to_jsonb(rec.name);
      exit when jsonb_array_length(result) >= 10;
    end loop;
  end if;

  return result;
end;
$$;

-- Trainer-Vornamen zum Account, als Map { trainerId: vorname }. Für die
-- öffentliche Slot-Anzeige, wenn mehrere Trainer gleichzeitig anbieten -
-- bewusst NUR id + Vorname, keine Kontakt- oder Abrechnungsdaten.
create or replace function public.spontan_trainer_namen(p_account_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  state jsonb;
  result jsonb := '{}'::jsonb;
  rec record;
begin
  select data into state from account_state where account_id = p_account_id::uuid;
  if state is null then
    return result;
  end if;
  for rec in
    select t.value->>'id' as id, trim(coalesce(t.value->>'name', '')) as name
    from jsonb_array_elements(coalesce(state->'trainers', '[]'::jsonb)) t(value)
  loop
    if rec.id is not null and rec.name <> '' then
      result := result || jsonb_build_object(rec.id, rec.name);
    end if;
  end loop;
  return result;
end;
$$;

grant execute on function public.spontan_buchung_uebernehmen(uuid) to anon, authenticated;
grant execute on function public.spontan_buchen(uuid, text, text, text, text) to anon, authenticated;
grant execute on function public.spontan_buchung_absagen(uuid) to anon, authenticated;
grant execute on function public.spontan_trainer_kontakt(uuid) to anon, authenticated;
grant execute on function public.spontan_hat_mandat(text, text, text) to anon, authenticated;
grant execute on function public.spontan_spieler_suche(text, text) to anon, authenticated;
grant execute on function public.spontan_trainer_namen(text) to anon, authenticated;

-- spontane_stunden in die Realtime-Publikation aufnehmen (Buchungs-Trigger für die App).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'spontane_stunden'
  ) then
    alter publication supabase_realtime add table public.spontane_stunden;
  end if;
end $$;

-- REPLICA IDENTITY FULL: Ohne dies enthalten DELETE-Events nur den Primärschlüssel,
-- der account_id-Filter der Realtime-Subscriptions (Wedding-/Britz-Seite) kann dann
-- nicht matchen und gelöschte Slots verschwinden nicht live von der Website.
alter table public.spontane_stunden replica identity full;
