-- Tenniscamp-Anmeldungen: Spielstand-Beschreibung (Notiz fuer Nicht-Mitglieder)
-- Das Spielniveau selbst wird in der bestehenden Spalte "niveau" gespeichert
-- (Anfaenger / Fortgeschritten / Turnierspieler) und gilt jetzt auch fuer Kinder.
ALTER TABLE tenniscamp_anmeldungen
  ADD COLUMN IF NOT EXISTS spielstand_beschreibung TEXT;
