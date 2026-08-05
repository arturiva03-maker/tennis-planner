-- Kennenlerntennis: gewaehlter Termin der Anmeldung.
-- Es gibt zwei Termine (30.08.2026 und 20.09.2026, jeweils 16 Uhr); im Formular
-- kann zusaetzlich "Beide Termine" gewaehlt werden. Gespeichert wird der fertige
-- Anzeigetext, damit die Verwaltung ihn ohne Mapping ausgeben kann.
--
-- In Supabase -> SQL Editor ausfuehren.

alter table public.kennlerntennis_anfragen
  add column if not exists termin text;

comment on column public.kennlerntennis_anfragen.termin is
  'Gewaehlter Kennenlerntennis-Termin als Anzeigetext, z.B. "Sonntag, 30.08.2026 um 16 Uhr".';
