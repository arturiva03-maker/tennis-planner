-- Split registration_requests: trennt trainierende Person vs. Kontaktperson sauber.
-- Im Supabase SQL Editor ausführen.

ALTER TABLE registration_requests
  ADD COLUMN IF NOT EXISTS trainee_vorname TEXT,
  ADD COLUMN IF NOT EXISTS trainee_nachname TEXT,
  ADD COLUMN IF NOT EXISTS kontakt_vorname TEXT,
  ADD COLUMN IF NOT EXISTS kontakt_nachname TEXT,
  ADD COLUMN IF NOT EXISTS kontakt_strasse TEXT,
  ADD COLUMN IF NOT EXISTS kontakt_plz TEXT,
  ADD COLUMN IF NOT EXISTS kontakt_ort TEXT,
  ADD COLUMN IF NOT EXISTS abweichende_kontaktperson BOOLEAN,
  ADD COLUMN IF NOT EXISTS gruppenwuensche TEXT;

-- Hinweis: bestehende Zeilen bleiben unangetastet. Die Spalte `name` bleibt
-- als Fallback erhalten und enthält bei Altdaten den Kontaktpersonen-Namen
-- (bzw. den Spielernamen, wenn Kontaktperson = trainierende Person war).
