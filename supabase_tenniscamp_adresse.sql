-- Tenniscamp-Anmeldungen: Rechnungsanschrift des Kontoinhabers.
-- Wird für das SEPA-Mandat und die Übernahme als Spieler benötigt.
ALTER TABLE tenniscamp_anmeldungen
  ADD COLUMN IF NOT EXISTS strasse TEXT,
  ADD COLUMN IF NOT EXISTS plz TEXT,
  ADD COLUMN IF NOT EXISTS ort TEXT;
