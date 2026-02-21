-- Supabase SQL für spontane_stunden Tabelle
-- Diese SQL-Befehle im Supabase SQL Editor ausführen

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS spontane_stunden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  datum DATE NOT NULL,
  uhrzeit_von TIME NOT NULL,
  uhrzeit_bis TIME NOT NULL,
  trainer_id TEXT NOT NULL,
  tarif_id TEXT,
  custom_preis_pro_stunde DECIMAL(10,2),
  status TEXT DEFAULT 'offen' CHECK (status IN ('offen', 'gebucht')),
  anlage TEXT DEFAULT 'Wedding' CHECK (anlage IN ('Wedding', 'Britz')),
  veroeffentlicht BOOLEAN DEFAULT false,
  buchung JSONB,
  training_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_spontane_stunden_account ON spontane_stunden(account_id);
CREATE INDEX IF NOT EXISTS idx_spontane_stunden_datum ON spontane_stunden(datum);
CREATE INDEX IF NOT EXISTS idx_spontane_stunden_status ON spontane_stunden(status);
CREATE INDEX IF NOT EXISTS idx_spontane_stunden_veroeffentlicht ON spontane_stunden(veroeffentlicht);

-- Row Level Security aktivieren
ALTER TABLE spontane_stunden ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Authenticated users können ihre eigenen Daten lesen
CREATE POLICY "Users can read own data" ON spontane_stunden
  FOR SELECT
  USING (true);

-- Authenticated users können ihre eigenen Daten einfügen
CREATE POLICY "Users can insert own data" ON spontane_stunden
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users können ihre eigenen Daten aktualisieren
CREATE POLICY "Users can update own data" ON spontane_stunden
  FOR UPDATE
  USING (true);

-- Authenticated users können ihre eigenen Daten löschen
CREATE POLICY "Users can delete own data" ON spontane_stunden
  FOR DELETE
  USING (true);

-- Öffentliche Lesbarkeit für veröffentlichte Slots (für Wedding-Seite)
-- Diese Policy erlaubt anonymen Benutzern, veröffentlichte und offene Slots zu sehen
CREATE POLICY "Public can read published slots" ON spontane_stunden
  FOR SELECT
  TO anon
  USING (veroeffentlicht = true AND status = 'offen');

-- Öffentliche Buchungsmöglichkeit (anon kann status und buchung updaten)
CREATE POLICY "Public can book available slots" ON spontane_stunden
  FOR UPDATE
  TO anon
  USING (veroeffentlicht = true AND status = 'offen')
  WITH CHECK (status = 'gebucht');
