-- Tenniscamp-Anmeldungen: Mitglied im Verein (BSC Rehberge)
ALTER TABLE tenniscamp_anmeldungen
  ADD COLUMN IF NOT EXISTS mitglied BOOLEAN;
