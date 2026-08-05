-- Kennenlerntennis: die Frage "Interesse an weiterfuehrendem Training" wird im
-- Formular nicht mehr gestellt. Neue Anmeldungen speichern deshalb NULL statt
-- eines erfundenen Ja/Nein - dafuer muss die Spalte NULL erlauben.
-- Bestehende Antworten bleiben unveraendert erhalten.
--
-- In Supabase -> SQL Editor ausfuehren.

alter table public.kennlerntennis_anfragen
  alter column interesse_weiterfuehrend drop not null;

comment on column public.kennlerntennis_anfragen.interesse_weiterfuehrend is
  'Nur historisch: wurde bis 08/2026 im Formular abgefragt. Neue Anmeldungen speichern NULL.';
