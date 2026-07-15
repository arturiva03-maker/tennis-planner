-- Supabase SQL für spontane_stunden Tabelle
--
-- ############################################################
-- ACHTUNG: Der RLS-Teil dieser Datei ist VERALTET und UNSICHER.
-- Die Policies weiter unten haben keine TO-Klausel und gelten damit für
-- PUBLIC (inkl. anon). Zusammen mit USING (true) hat das die Tabelle bis
-- 2026-07-15 für jeden ohne Login les-, änder- und löschbar gemacht.
-- Sie sind hier nur noch zur Dokumentation stehengelassen (auskommentiert).
--
-- Gültige Policies stehen in: supabase/rls_lockdown.sql
-- Diese Datei NICHT erneut einspielen, ohne danach rls_lockdown.sql zu fahren.
-- ############################################################

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

-- ------------------------------------------------------------
-- RLS Policies -> ausgelagert nach supabase/rls_lockdown.sql
--
-- Die ursprünglichen Policies sind hier bewusst auskommentiert statt gelöscht,
-- damit die Fehlerursache nachvollziehbar bleibt: "FOR SELECT USING (true)"
-- ohne TO-Klausel gilt für PUBLIC, also auch für anon. Gemeint war
-- "TO authenticated" plus Einschränkung auf den eigenen account_id.
--
--   CREATE POLICY "Users can read own data"   ON spontane_stunden FOR SELECT USING (true);
--   CREATE POLICY "Users can insert own data" ON spontane_stunden FOR INSERT WITH CHECK (true);
--   CREATE POLICY "Users can update own data" ON spontane_stunden FOR UPDATE USING (true);
--   CREATE POLICY "Users can delete own data" ON spontane_stunden FOR DELETE USING (true);
--
-- Die beiden anon-Policies darunter waren korrekt gemeint, aber wirkungslos:
-- permissive Policies werden mit OR verknüpft, die USING(true)-Regeln oben
-- haben sie überstimmt. Die Buchungs-Policy wird nicht mehr gebraucht, weil
-- über spontan_buchen() (SECURITY DEFINER) gebucht wird.
--
--   CREATE POLICY "Public can read published slots"  ON spontane_stunden FOR SELECT TO anon
--     USING (veroeffentlicht = true AND status = 'offen');
--   CREATE POLICY "Public can book available slots"  ON spontane_stunden FOR UPDATE TO anon
--     USING (veroeffentlicht = true AND status = 'offen') WITH CHECK (status = 'gebucht');
-- ------------------------------------------------------------
