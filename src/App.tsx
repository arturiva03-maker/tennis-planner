import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  FormEvent,
  TouchEvent,
} from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

// Security: Escape HTML to prevent XSS attacks
function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return "";
  const s = String(str);
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type Trainer = {
  id: string;
  name: string;
  nachname?: string;
  email?: string;
  stundensatz?: number;
  notiz?: string;
  adresse?: string;
  iban?: string;
  ustIdNr?: string;
  kleinunternehmer?: boolean;
};

type Spieler = {
  id: string;
  vorname: string;
  nachname?: string;
  kontaktEmail?: string;
  zusaetzlicheEmails?: string[];
  kontaktTelefon?: string;
  rechnungsAdresse?: string;
  notizen?: string;
  iban?: string;
  mandatsreferenz?: string;
  unterschriftsdatum?: string;
  // Abweichender Rechnungsempfänger (z.B. Eltern bei Kindern)
  abweichenderEmpfaenger?: boolean;
  empfaengerName?: string;
  // Labels für Newsletter-Filterung
  labels?: string[];
};

type Tarif = {
  id: string;
  name: string;
  preisProStunde: number;
  abrechnung: "proTraining" | "proSpieler" | "monatlich";
  beschreibung?: string;
};

type TrainingStatus = "geplant" | "durchgefuehrt" | "abgesagt";

type AbrechnungTab = "spieler" | "trainer";
type VerwaltungTab = "spieler" | "trainer" | "tarife" | "newsletter";
type FormulareTab = "anmeldung" | "sepa" | "tenniscamp" | "probetraining";

type Verfuegbarkeit = {
  montag: string;
  dienstag: string;
  mittwoch: string;
  donnerstag: string;
  freitag: string;
  samstag: string;
  sonntag: string;
};

type RegistrationRequest = {
  id: string;
  account_id: string;
  name: string;
  email: string;
  telefon: string | null;
  verfuegbarkeit: Verfuegbarkeit | null;
  trainingsart: string | null;
  trainings_pro_woche: number | null;
  erfahrungslevel: string | null;
  alter_jahre: number | null;
  nachricht: string | null;
  created_at: string;
  status: string;
  anlage?: string | null;
};

type SepaMandate = {
  id: string;
  account_id: string;
  vorname: string;
  nachname: string;
  ist_kind: boolean;
  elternteil_name: string | null;
  strasse: string;
  plz: string;
  ort: string;
  iban: string;
  email: string;
  mandatsreferenz: string;
  unterschriftsdatum: string;
  created_at: string;
  status?: string;
  anlage?: string;
};

type TenniscampAnmeldung = {
  id: string;
  account_id: string;
  camp_id: string;
  camp_label: string;
  camp_dates: string;
  camp_type: "kind" | "erwachsene";
  teilnehmer_vorname: string;
  teilnehmer_nachname: string;
  zahlungspflichtiger_vorname: string | null;
  zahlungspflichtiger_nachname: string | null;
  alter: number;
  telefon: string;
  email: string;
  iban: string;
  bemerkungen: string | null;
  niveau: string | null;
  mandatsreferenz: string;
  sepa_zustimmung: boolean;
  status: string;
  created_at: string;
};

type ProbetrainingAnfrage = {
  id: string;
  account_id: string;
  vorname: string;
  nachname: string;
  alter: number;
  hat_tennis_gespielt: boolean;
  spielstand: string;
  ist_vereinsmitglied: boolean;
  email: string | null;
  telefon: string | null;
  verfuegbarkeit: Record<string, string>;
  status: string;
  created_at: string;
};

type Training = {
  id: string;
  trainerId?: string;
  datum: string;
  uhrzeitVon: string;
  uhrzeitBis: string;
  spielerIds: string[];
  tarifId?: string;
  status: TrainingStatus;
  notiz?: string;
  serieId?: string;
  customPreisProStunde?: number;
  customAbrechnung?: "proTraining" | "proSpieler";
  barBezahlt?: boolean;
  anlage?: string;
  isSpontanBuchung?: boolean;
};

type SpontaneStundeBuchung = {
  name: string;
  email: string;
  telefon?: string;
  gebuchtAm: string;
};

type SpontaneStunde = {
  id: string;
  datum: string;
  uhrzeitVon: string;
  uhrzeitBis: string;
  trainerId: string;
  tarifId?: string;
  customPreisProStunde?: number;
  status: "offen" | "gebucht";
  anlage: "Wedding" | "Britz";
  veroeffentlicht: boolean;
  buchung?: SpontaneStundeBuchung;
  trainingId?: string;
};

type PaymentsMap = Record<string, boolean>; // key: `${monat}__${spielerId}`
type TrainerPaymentsMap = Record<string, boolean>; // key: trainingId
type TrainerMonthSettledMap = Record<string, boolean>; // key: `${monat}__${trainerId}`
type MonthlyAdjustments = Record<string, number>; // key: `${monat}__${spielerId}`, value: Anpassungsbetrag in EUR
type WirdAbgebuchtMap = Record<string, boolean>; // key: `${monat}__${spielerId}`

type Notiz = {
  id: string;
  titel: string;
  inhalt: string;
  erstelltAm: string;
  aktualisiertAm: string;
};

type Vertretung = {
  trainingId: string;
  vertretungTrainerId?: string; // Optional - wenn leer, dann "Vertretung offen"
};

type WeiteresTabs = "notizen" | "vertretung" | "spontan";

type AppState = {
  trainers: Trainer[];
  spieler: Spieler[];
  tarife: Tarif[];
  trainings: Training[];
  payments: PaymentsMap;
  trainerPayments: TrainerPaymentsMap;
  trainerMonthSettled?: TrainerMonthSettledMap;
  trainerBarSettled?: TrainerMonthSettledMap;
  notizen?: Notiz[];
  monthlyAdjustments?: MonthlyAdjustments;
  vertretungen?: Vertretung[];
  wirdAbgebucht?: WirdAbgebuchtMap;
};

type Tab = "kalender" | "training" | "verwaltung" | "formulare" | "abrechnung" | "weiteres";
type Role = "admin" | "trainer";

type AuthUser = {
  id: string;
  email: string | null;
  role: Role;
  accountId: string | null;
  trainerId: string | null;
};

type ViewMode = "week" | "day";
type AbrechnungFilter = "alle" | "bezahlt" | "offen" | "bar";

const STORAGE_KEY = "tennis_planner_multi_trainer_v6";
const TRAINER_INVOICE_SETTINGS_KEY = "trainer_invoice_settings";
const LEGACY_KEYS = [
  "tennis_planner_single_trainer",
  "tennis_planner_single_trainer_v5",
  "tennis_planner_single_trainer_v4",
  "tennis_planner_single_trainer_v3",
  "tennis_planner_single_trainer_v2",
  "tennis_planner_single_trainer_v1",
];

function uid() {
  return crypto.randomUUID();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function startOfWeekISO(dateISO: string) {
  const d = new Date(dateISO + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatShort(dateISO: string) {
  const d = new Date(dateISO + "T12:00:00");
  const w = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][(d.getDay() + 6) % 7];
  return `${w} ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`;
}

function formatWeekRange(weekStartISO: string) {
  const start = new Date(weekStartISO + "T12:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const months = [
    "Jan.",
    "Feb.",
    "März",
    "Apr.",
    "Mai",
    "Juni",
    "Juli",
    "Aug.",
    "Sep.",
    "Okt.",
    "Nov.",
    "Dez.",
  ];

  const sDay = start.getDate();
  const eDay = end.getDate();
  const sMonth = start.getMonth();
  const eMonth = end.getMonth();
  const year = end.getFullYear();

  if (sMonth === eMonth) {
    return `${sDay} – ${eDay}. ${months[eMonth]} ${year}`;
  }
  return `${sDay}. ${months[sMonth]} – ${eDay}. ${months[eMonth]} ${year}`;
}

function formatMonthLabel(monthISO: string) {
  const parts = monthISO.split("-");
  const year = parts[0] ?? "";
  const month = parts[1] ?? "";
  return `${pad2(Number(month))}.${year}`;
}

function euro(n: number) {
  if (!Number.isFinite(n)) return "0,00 EUR";
  return `${n.toFixed(2).replace(".", ",")} EUR`;
}

function maskIban(iban: string | undefined): string {
  if (!iban) return "---";
  const cleaned = iban.replace(/\s/g, "");
  if (cleaned.length <= 8) return iban;
  const first4 = cleaned.slice(0, 4);
  const last4 = cleaned.slice(-4);
  return `${first4} **** **** **** ${last4}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function statusLabel(s: TrainingStatus) {
  return s === "geplant"
    ? "offen"
    : s === "durchgefuehrt"
    ? "durchgeführt"
    : "abgesagt";
}

function statusDotColor(s: TrainingStatus) {
  if (s === "durchgefuehrt") return "#22c55e";
  if (s === "abgesagt") return "#ef4444";
  return "#3b82f6";
}

function paymentKey(monat: string, spielerId: string) {
  return `${monat}__${spielerId}`;
}

function trainerMonthSettledKey(monat: string, trainerId: string) {
  return `${monat}__${trainerId}`;
}

function durationMin(von: string, bis: string) {
  const a = toMinutes(von);
  const b = toMinutes(bis);
  return Math.max(0, b - a);
}

function getFullName(s: Spieler) {
  return s.nachname ? `${s.vorname} ${s.nachname}` : s.vorname;
}

function getPreisConfig(
  t: Training,
  tarifByIdMap: Map<string, Tarif>
): {
  preisProStunde: number;
  abrechnung: "proTraining" | "proSpieler" | "monatlich";
} | null {
  if (t.tarifId) {
    const tarif = tarifByIdMap.get(t.tarifId);
    if (tarif) {
      return {
        preisProStunde: tarif.preisProStunde,
        abrechnung: tarif.abrechnung,
      };
    }
  }

  if (
    typeof t.customPreisProStunde === "number" &&
    t.customPreisProStunde > 0
  ) {
    return {
      preisProStunde: t.customPreisProStunde,
      abrechnung: t.customAbrechnung ?? "proTraining",
    };
  }

  return null;
}

function generateFinalInvoiceHTML(data: {
  rechnungssteller: string;
  adresse: string;
  ustIdNr: string;
  rechnungsnummer: string;
  rechnungsdatum: string;
  leistungszeitraum: string;
  positionBeschreibung: string;
  stundenAnzahl: number;
  preisProStunde: number;
  iban: string;
  kleinunternehmer: boolean;
  useCustomTotal?: boolean;
  customGesamtbetrag?: number;
}): string {
  const {
    rechnungssteller,
    adresse,
    ustIdNr,
    rechnungsnummer,
    rechnungsdatum,
    leistungszeitraum,
    positionBeschreibung,
    stundenAnzahl,
    preisProStunde,
    iban,
    kleinunternehmer,
    useCustomTotal,
    customGesamtbetrag,
  } = data;

  const zwischensumme = stundenAnzahl * preisProStunde;
  // Bei manuellem Gesamtbetrag: Korrektur berechnen (Differenz zwischen gewünschtem und berechnetem Betrag)
  const korrektur = useCustomTotal && customGesamtbetrag !== undefined
    ? customGesamtbetrag - zwischensumme * (kleinunternehmer ? 1 : 1.19)
    : 0;
  const zwischensummeMitKorrektur = zwischensumme + korrektur;
  const mwst = kleinunternehmer ? 0 : zwischensummeMitKorrektur * 0.19;
  const gesamtbetrag = zwischensummeMitKorrektur + mwst;

  const formatEuro = (amount: number) => amount.toFixed(2).replace('.', ',') + ' €';
  const adresseHtml = adresse.split('\n').map(line => `${line}`).join('<br>');

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rechnung ${rechnungsnummer}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #333;
      padding: 2cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 2cm;
    }
    .title {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 1.5cm;
      color: #1a1a1a;
    }
    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1cm;
    }
    .address-block {
      width: 45%;
    }
    .address-label {
      font-size: 10pt;
      color: #666;
      margin-bottom: 0.3cm;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .address-content {
      font-size: 11pt;
    }
    .meta-info {
      margin-top: 1cm;
      margin-bottom: 1cm;
      padding: 0.5cm;
      background-color: #f8f8f8;
      border-radius: 4px;
    }
    .meta-row {
      display: flex;
      margin-bottom: 0.2cm;
    }
    .meta-label {
      width: 160px;
      font-weight: bold;
    }
    .content {
      margin-top: 1cm;
      margin-bottom: 1cm;
    }
    .intro {
      margin-bottom: 1cm;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1cm 0;
    }
    th, td {
      padding: 0.3cm 0.5cm;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .summary-table {
      width: 50%;
      margin-left: auto;
      margin-top: 0.5cm;
    }
    .summary-table td {
      border-bottom: none;
      padding: 0.2cm 0.5cm;
    }
    .summary-table .total-row td {
      border-top: 2px solid #333;
      font-weight: bold;
      font-size: 14pt;
      padding-top: 0.4cm;
    }
    .kleinunternehmer-note {
      margin-top: 0.5cm;
      font-size: 10pt;
      color: #666;
      font-style: italic;
    }
    .payment-info {
      margin-top: 1.5cm;
      padding: 0.5cm;
      background-color: #f0f7ff;
      border-radius: 4px;
    }
    .payment-info strong {
      display: block;
      margin-bottom: 0.3cm;
    }
    .footer {
      margin-top: 2cm;
    }
    .signature {
      margin-top: 1.5cm;
    }
    @media print {
      body {
        padding: 0;
      }
      @page {
        margin: 2cm;
        size: A4;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">RECHNUNG</div>

    <div class="addresses">
      <div class="address-block">
        <div class="address-label">Rechnungssteller</div>
        <div class="address-content">
          <strong>${rechnungssteller}</strong><br>
          ${adresseHtml}
          ${ustIdNr ? `<br>Steuernummer: ${ustIdNr}` : ''}
        </div>
      </div>
      <div class="address-block">
        <div class="address-label">Rechnungsempfänger</div>
        <div class="address-content">
          <strong>Tennisschule Zlatan Palazov und<br>Artur Ivanenko GbR</strong><br>
          Ricarda-Huch-Straße 40<br>
          14480 Potsdam
        </div>
      </div>
    </div>

    <div class="meta-info">
      <div class="meta-row">
        <span class="meta-label">Rechnungsnummer:</span>
        <span>${rechnungsnummer}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Rechnungsdatum:</span>
        <span>${rechnungsdatum}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Leistungszeitraum:</span>
        <span>${leistungszeitraum}</span>
      </div>
    </div>
  </div>

  <div class="content">
    <div class="intro">
      <p>Sehr geehrte Damen und Herren,</p>
      <p>für die im Leistungszeitraum erbrachten Trainerstunden erlaube ich mir, folgende Rechnung zu stellen:</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Position</th>
          <th class="text-right">Anzahl</th>
          <th class="text-right">Preis</th>
          <th class="text-right">Gesamt</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${positionBeschreibung}</td>
          <td class="text-right">${stundenAnzahl}</td>
          <td class="text-right">${formatEuro(preisProStunde)}</td>
          <td class="text-right">${formatEuro(zwischensumme)}</td>
        </tr>
        ${useCustomTotal && korrektur !== 0 ? `
        <tr>
          <td>Korrektur</td>
          <td class="text-right"></td>
          <td class="text-right"></td>
          <td class="text-right">${formatEuro(korrektur)}</td>
        </tr>
        ` : ''}
      </tbody>
    </table>

    <table class="summary-table">
      <tbody>
        <tr>
          <td>Zwischensumme:</td>
          <td class="text-right">${formatEuro(zwischensummeMitKorrektur)}</td>
        </tr>
        ${!kleinunternehmer ? `
        <tr>
          <td>MwSt. 19%:</td>
          <td class="text-right">${formatEuro(mwst)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>Gesamtbetrag:</td>
          <td class="text-right">${formatEuro(gesamtbetrag)}</td>
        </tr>
      </tbody>
    </table>

    ${kleinunternehmer ? `
    <div class="kleinunternehmer-note">
      Gemäß §19 UStG wird keine Umsatzsteuer berechnet.
    </div>
    ` : ''}

    <div class="payment-info">
      <strong>Bitte überweisen Sie den Betrag innerhalb von 14 Tagen auf folgendes Konto:</strong>
      <div class="meta-row">
        <span class="meta-label">IBAN:</span>
        <span>${maskIban(iban)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Kontoinhaber:</span>
        <span>${rechnungssteller}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Vielen Dank für die Zusammenarbeit.</p>
    <div class="signature">
      <p>Mit freundlichen Grüßen</p>
      <p><strong>${rechnungssteller}</strong></p>
    </div>
  </div>
</body>
</html>`;
}

function ensureTrainerList(
  parsed: Partial<AppState> & {
    trainer?: Trainer | { name: string; email?: string };
  }
): Trainer[] {
  const inputList = Array.isArray(parsed?.trainers) ? parsed!.trainers : [];
  const normalized = inputList
    .filter(Boolean)
    .map((t, idx) => ({
      id: t.id || `trainer-${idx + 1}`,
      name: t.name?.trim() || `Trainer ${idx + 1}`,
      nachname: (t as any).nachname?.trim() || undefined,
      email: t.email?.trim() || undefined,
      stundensatz:
        typeof (t as any).stundensatz === "number"
          ? (t as any).stundensatz
          : Number((t as any).stundensatz) || 0,
      notiz: (t as any).notiz?.trim() || undefined,
      adresse: (t as any).adresse?.trim() || undefined,
      iban: (t as any).iban?.trim() || undefined,
      ustIdNr: (t as any).ustIdNr?.trim() || undefined,
      kleinunternehmer: (t as any).kleinunternehmer ?? false,
    }));

  if (normalized.length > 0) return normalized;

  const single = (parsed as any)?.trainer as Trainer | undefined;
  return [
    {
      id: "trainer-1",
      name: single?.name?.trim() || "Trainer",
      email: single?.email?.trim() || undefined,
      notiz: single?.notiz?.trim() || undefined,
    },
  ];
}

function normalizeState(parsed: Partial<AppState> | null | undefined): AppState {
  const trainers = ensureTrainerList(parsed || {});
  const defaultTrainerId = trainers[0]?.id || "trainer-1";

  // Migration: name → vorname für Spieler
  const migratedSpieler = (parsed?.spieler ?? []).map((s: any) => ({
    ...s,
    vorname: s.vorname ?? s.name ?? "",
    nachname: s.nachname ?? "",
  }));

  return {
    trainers,
    spieler: migratedSpieler,
    tarife: parsed?.tarife ?? [],
    trainings: (parsed?.trainings ?? []).map((t, idx) => ({
      ...t,
      id: t.id || `training-${idx + 1}`,
      trainerId:
        t.trainerId && trainers.some((tr) => tr.id === t.trainerId)
          ? t.trainerId
          : defaultTrainerId,
      anlage: t.anlage ?? "Wedding",
    })),
    payments: parsed?.payments ?? {},
    trainerPayments: parsed?.trainerPayments ?? {},
    trainerMonthSettled: parsed?.trainerMonthSettled ?? {},
    trainerBarSettled: parsed?.trainerBarSettled ?? {},
    notizen: parsed?.notizen ?? [],
    monthlyAdjustments: parsed?.monthlyAdjustments ?? {},
    vertretungen: parsed?.vertretungen ?? [],
    wirdAbgebucht: parsed?.wirdAbgebucht ?? {},
  };
}

function readStateWithMeta(): { state: AppState; usedKey: string | null } {
  const tryParse = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Partial<AppState>;
    } catch {
      return null;
    }
  };

  const primary = tryParse(localStorage.getItem(STORAGE_KEY));
  if (primary) return { state: normalizeState(primary), usedKey: STORAGE_KEY };

  for (const k of LEGACY_KEYS) {
    const legacy = tryParse(localStorage.getItem(k));
    if (legacy)
      return {
        state: normalizeState(legacy),
        usedKey: k,
      };
  }

  return { state: normalizeState(null), usedKey: null };
}

function writeState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ::::: Swipe Hook für mobile Navigation ::::: */

function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  threshold = 50
) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = null;
    touchEndY.current = null;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const deltaX = touchEndX.current - touchStartX.current;
    const deltaY = touchEndY.current !== null && touchStartY.current !== null
      ? Math.abs(touchEndY.current - touchStartY.current)
      : 0;
    
    // Nur horizontale Swipes erkennen (nicht bei vertikalem Scrollen)
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0) {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/* ::::: Auth UI ::::: */

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) setError(error.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="authWrapper">
      <div className="card authCard">
        <h1>{mode === "login" ? "Login" : "Registrieren"}</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <div className="muted" style={{ color: "#b91c1c", marginTop: 8 }}>
              {error}
            </div>
          ) : null}

          <div style={{ marginTop: 16 }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy
                ? "Bitte warten..."
                : mode === "login"
                ? "Einloggen"
                : "Registrieren"}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 16 }}>
          {mode === "login" ? (
            <button
              className="btn btnGhost"
              onClick={() => setMode("register")}
            >
              Noch kein Konto? Registrieren
            </button>
          ) : (
            <button className="btn btnGhost" onClick={() => setMode("login")}>
              Bereits registriert? Einloggen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ::::: Haupt-App ::::: */

export default function App() {
  const initialRef = useRef<{
    state: AppState;
    usedKey: string | null;
  } | null>(null);

  if (initialRef.current === null) {
    initialRef.current = readStateWithMeta();
  }
  const initial = initialRef.current;

  // Aktuellen Wochentag berechnen (0 = Montag, 6 = Sonntag)
  const getTodayDayIndex = () => {
    const today = new Date();
    return (today.getDay() + 6) % 7; // Umrechnung: Sonntag=0 -> 6, Montag=1 -> 0, etc.
  };

  // Mobile-Erkennung für initiale Ansicht
  const isMobileInit = typeof window !== "undefined" && window.innerWidth <= 768;

  const [tab, setTab] = useState<Tab>("kalender");
  const [viewMode, setViewMode] = useState<ViewMode>(isMobileInit ? "day" : "week");
  const [dayIndex, setDayIndex] = useState<number>(getTodayDayIndex());
  const [kalenderTrainerFilter, setKalenderTrainerFilter] =
    useState<string[]>([]);
  const [showTrainerDropdown, setShowTrainerDropdown] = useState(false);

  const [abrechnungTab, setAbrechnungTab] =
    useState<AbrechnungTab>("spieler");
  const [verwaltungTab, setVerwaltungTab] =
    useState<VerwaltungTab>("trainer");
  const [formulareTab, setFormulareTab] =
    useState<FormulareTab>("anmeldung");
  const [anmeldungAnlageFilter, setAnmeldungAnlageFilter] =
    useState<"alle" | "Wedding" | "Britz">("alle");
  const [anmeldungNameSuche, setAnmeldungNameSuche] = useState("");
  const [anmeldungTagFilter, setAnmeldungTagFilter] =
    useState<"alle" | "montag" | "dienstag" | "mittwoch" | "donnerstag" | "freitag" | "samstag" | "sonntag">("alle");
  const [anmeldungStatusFilter, setAnmeldungStatusFilter] =
    useState<"alle" | "offen" | "erledigt">("alle");

  // Newsletter State
  const [newsletterSubject, setNewsletterSubject] = useState("");
  const [newsletterBody, setNewsletterBody] = useState("");
  const [newsletterLabelFilter, setNewsletterLabelFilter] = useState<string>("alle");
  const [newsletterSending, setNewsletterSending] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterSelectedPlayers, setNewsletterSelectedPlayers] = useState<string[]>([]);
  const [newsletterPlayerSearch, setNewsletterPlayerSearch] = useState("");
  const [newsletterExcludedPlayers, setNewsletterExcludedPlayers] = useState<string[]>([]);
  const [newsletterExtraEmails, setNewsletterExtraEmails] = useState<{email: string, name: string}[]>([]);

  const [trainers, setTrainers] = useState<Trainer[]>(initial.state.trainers);
  const [spieler, setSpieler] = useState<Spieler[]>(initial.state.spieler);
  const [tarife, setTarife] = useState<Tarif[]>(initial.state.tarife);
  const [trainings, setTrainings] = useState<Training[]>(
    initial.state.trainings
  );
  const [payments, setPayments] = useState<PaymentsMap>(
    initial.state.payments ?? {}
  );
  const [trainerPayments, setTrainerPayments] =
    useState<TrainerPaymentsMap>(initial.state.trainerPayments ?? {});
  const [trainerMonthSettled, setTrainerMonthSettled] =
    useState<TrainerMonthSettledMap>(initial.state.trainerMonthSettled ?? {});
  const [trainerBarSettled, setTrainerBarSettled] =
    useState<TrainerMonthSettledMap>(initial.state.trainerBarSettled ?? {});
  const [adminTrainerPaymentView, setAdminTrainerPaymentView] =
    useState<"none" | "bar" | "nichtBar">("none");
  const [notizen, setNotizen] = useState<Notiz[]>(
    initial.state.notizen ?? []
  );
  const [monthlyAdjustments, setMonthlyAdjustments] = useState<MonthlyAdjustments>(
    initial.state.monthlyAdjustments ?? {}
  );
  const [wirdAbgebucht, setWirdAbgebucht] = useState<WirdAbgebuchtMap>(
    initial.state.wirdAbgebucht ?? {}
  );
  const [vertretungen, setVertretungen] = useState<Vertretung[]>(
    initial.state.vertretungen ?? []
  );
  const [spontaneStunden, setSpontaneStunden] = useState<SpontaneStunde[]>([]);
  const [loadingSpontaneStunden, setLoadingSpontaneStunden] = useState(false);
  const [weiteresTabs, setWeiteresTabs] = useState<WeiteresTabs>("notizen");
  const [vertretungTrainerId, setVertretungTrainerId] = useState<string>("");
  const [vertretungDaten, setVertretungDaten] = useState<string[]>([]);
  const [expandedVertretungTrainer, setExpandedVertretungTrainer] = useState<string[]>([]);

  // Reset expanded state and clean up past dates when switching to vertretung tab
  useEffect(() => {
    if (tab === "weiteres" && weiteresTabs === "vertretung") {
      setExpandedVertretungTrainer([]);
      // Vergangene Daten automatisch entfernen
      const heute = todayISO();
      setVertretungDaten(prev => prev.filter(d => d >= heute));
    }
  }, [tab, weiteresTabs]);
  const [vertretungDatumPreview, setVertretungDatumPreview] = useState<string>("");
  const [vertretungPendingDates, setVertretungPendingDates] = useState<string[]>([]);
  const [vertretungModus, setVertretungModus] = useState<"einzeln" | "zeitraum">("einzeln");
  const [vertretungVon, setVertretungVon] = useState<string>("");
  const [vertretungBis, setVertretungBis] = useState<string>("");
  const [vertretungNotifyDialog, setVertretungNotifyDialog] = useState<{
    trainingId: string;
    newTrainerId: string;
    training: Training | null;
  } | null>(null);
  const [vertretungNotifySending, setVertretungNotifySending] = useState(false);

  // Undo-Funktion: Speichert Snapshot des States vor Änderungen
  const [undoSnapshot, setUndoSnapshot] = useState<{
    trainings: Training[];
    spieler: Spieler[];
    trainers: Trainer[];
    tarife: Tarif[];
    payments: PaymentsMap;
    trainerPayments: TrainerPaymentsMap;
    vertretungen: Vertretung[];
    monthlyAdjustments: MonthlyAdjustments;
    wirdAbgebucht: WirdAbgebuchtMap;
    message: string;
    timestamp: number;
  } | null>(null);

  // Undo ausführen
  const undo = () => {
    if (!undoSnapshot) return;
    setTrainings(undoSnapshot.trainings);
    setSpieler(undoSnapshot.spieler);
    setTrainers(undoSnapshot.trainers);
    setTarife(undoSnapshot.tarife);
    setPayments(undoSnapshot.payments);
    setTrainerPayments(undoSnapshot.trainerPayments);
    setVertretungen(undoSnapshot.vertretungen);
    setMonthlyAdjustments(undoSnapshot.monthlyAdjustments);
    setWirdAbgebucht(undoSnapshot.wirdAbgebucht);
    setUndoSnapshot(null);
  };

  // Snapshot speichern vor wichtigen Aktionen
  const saveUndoSnapshot = (message: string) => {
    setUndoSnapshot({
      trainings,
      spieler,
      trainers,
      tarife,
      payments,
      trainerPayments,
      vertretungen,
      monthlyAdjustments,
      wirdAbgebucht,
      message,
      timestamp: Date.now(),
    });
  };

  // Newsletter: Finale Empfängerliste berechnen
  const getNewsletterRecipients = useCallback(() => {
    // Label-gefilterte Spieler
    const labelFiltered = newsletterLabelFilter === "keine"
      ? []
      : spieler.filter(s =>
          s.kontaktEmail &&
          (newsletterLabelFilter === "alle" || s.labels?.includes(newsletterLabelFilter))
        );

    // Manuell ausgewählte Spieler
    const selectedPlayers = spieler.filter(s =>
      s.kontaktEmail && newsletterSelectedPlayers.includes(s.id)
    );

    // Merge + Deduplizierung
    const recipientMap = new Map<string, Spieler>();
    [...labelFiltered, ...selectedPlayers].forEach(s => {
      recipientMap.set(s.id, s);
    });

    // Ausschlüsse anwenden
    newsletterExcludedPlayers.forEach(id => {
      recipientMap.delete(id);
    });

    return Array.from(recipientMap.values());
  }, [spieler, newsletterLabelFilter, newsletterSelectedPlayers, newsletterExcludedPlayers]);

  // Undo nach 60 Sekunden automatisch entfernen
  useEffect(() => {
    if (!undoSnapshot) return;
    const timeout = setTimeout(() => {
      setUndoSnapshot(null);
    }, 60000);
    return () => clearTimeout(timeout);
  }, [undoSnapshot]);

  const [cancelNotifyDialog, setCancelNotifyDialog] = useState<{
    trainings: Training[];
    onConfirm: () => void;
  } | null>(null);
  const [cancelNotifySending, setCancelNotifySending] = useState(false);
  const [cancelNotifySubject, setCancelNotifySubject] = useState("");
  const [cancelNotifyBody, setCancelNotifyBody] = useState("");
  const [reverseAdjustmentDialog, setReverseAdjustmentDialog] = useState<{
    training: Training;
    onConfirm: (reverseAdjustment: boolean) => void;
  } | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<{
    spielerId: string;
    value: string;
  } | null>(null);
  const [payConfirm, setPayConfirm] = useState<{
    monat: string;
    spielerId: string;
    spielerName: string;
    amount: number;
  } | null>(null);
  const [cancelTrainingDialog, setCancelTrainingDialog] = useState<{
    trainings: Training[];
    action: 'cancel' | 'delete';
    fromSaveTraining?: boolean;
  } | null>(null);
  const [cancelAdjustmentAmount, setCancelAdjustmentAmount] = useState<string>("15");
  const [invoiceDialog, setInvoiceDialog] = useState<{
    stundenAnzahl: number;
    iban: string;
    adresse: string;
    ustIdNr: string;
    kleinunternehmer: boolean;
  } | null>(null);
  const [invoiceError, setInvoiceError] = useState<string>("");
  const [invoicePreview, setInvoicePreview] = useState<{
    rechnungssteller: string;
    adresse: string;
    ustIdNr: string;
    rechnungsnummer: string;
    rechnungsdatum: string;
    leistungszeitraum: string;
    positionBeschreibung: string;
    stundenAnzahl: number;
    preisProStunde: number;
    iban: string;
    kleinunternehmer: boolean;
    useCustomTotal: boolean;
    customGesamtbetrag: number;
  } | null>(null);

  const [weekAnchor, setWeekAnchor] = useState<string>(todayISO());

  const [trainerName, setTrainerName] = useState(
    initial.state.trainers[0]?.name ?? ""
  );
  const [trainerEmail, setTrainerEmail] = useState(
    initial.state.trainers[0]?.email ?? ""
  );
  const [trainerStundensatz, setTrainerStundensatz] = useState<number | "">(
    initial.state.trainers[0]?.stundensatz ?? 0
  );
  const [trainerNotiz, setTrainerNotiz] = useState("");
  const [trainerNachname, setTrainerNachname] = useState("");
  const [trainerAdresse, setTrainerAdresse] = useState("");
  const [trainerIban, setTrainerIban] = useState("");
  const [trainerUstIdNr, setTrainerUstIdNr] = useState("");
  const [trainerKleinunternehmer, setTrainerKleinunternehmer] = useState(false);
  const [editingTrainerId, setEditingTrainerId] = useState<string | null>(null);

  const [spielerVorname, setSpielerVorname] = useState("");
  const [spielerNachname, setSpielerNachname] = useState("");
  const [spielerEmail, setSpielerEmail] = useState("");
  const [spielerZusaetzlicheEmails, setSpielerZusaetzlicheEmails] = useState<string[]>([]);
  const [spielerNeueEmail, setSpielerNeueEmail] = useState("");
  const [spielerTelefon, setSpielerTelefon] = useState("");
  const [spielerRechnung, setSpielerRechnung] = useState("");
  const [spielerNotizen, setSpielerNotizen] = useState("");
  const [spielerIban, setSpielerIban] = useState("");
  const [spielerMandatsreferenz, setSpielerMandatsreferenz] = useState("");
  const [spielerUnterschriftsdatum, setSpielerUnterschriftsdatum] = useState("");
  const [spielerAbweichenderEmpfaenger, setSpielerAbweichenderEmpfaenger] = useState(false);
  const [spielerEmpfaengerName, setSpielerEmpfaengerName] = useState("");
  const [spielerLabels, setSpielerLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState("");
  const [editingSpielerId, setEditingSpielerId] = useState<string | null>(null);

  const [tarifName, setTarifName] = useState("");
  const [tarifPreisProStunde, setTarifPreisProStunde] = useState(60);
  const [tarifAbrechnung, setTarifAbrechnung] = useState<
    "proTraining" | "proSpieler" | "monatlich"
  >("proTraining");
  const [tarifBeschreibung, setTarifBeschreibung] = useState("");
  const [editingTarifId, setEditingTarifId] = useState<string | null>(null);

  const [registrationRequests, setRegistrationRequests] = useState<RegistrationRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [showAdoptConfirmDialog, setShowAdoptConfirmDialog] = useState(false);

  const [sepaMandates, setSepaMandates] = useState<SepaMandate[]>([]);
  const [loadingSepaMandates, setLoadingSepaMandates] = useState(false);
  const [expandedSepaMandateId, setExpandedSepaMandateId] = useState<string | null>(null);

  const [tenniscampAnmeldungen, setTenniscampAnmeldungen] = useState<TenniscampAnmeldung[]>([]);
  const [loadingTenniscampAnmeldungen, setLoadingTenniscampAnmeldungen] = useState(false);
  const [expandedTenniscampId, setExpandedTenniscampId] = useState<string | null>(null);

  const [probetrainingAnfragen, setProbetrainingAnfragen] = useState<ProbetrainingAnfrage[]>([]);
  const [loadingProbetrainingAnfragen, setLoadingProbetrainingAnfragen] = useState(false);
  const [expandedProbetrainingId, setExpandedProbetrainingId] = useState<string | null>(null);

  // Spontane Stunden Form
  const [spontanDatum, setSpontanDatum] = useState(todayISO());
  const [spontanVon, setSpontanVon] = useState("14:00");
  const [spontanBis, setSpontanBis] = useState("15:00");
  const [spontanTrainerId, setSpontanTrainerId] = useState("");
  const [spontanTarifId, setSpontanTarifId] = useState("");
  const [spontanCustomPreis, setSpontanCustomPreis] = useState<number | "">("");
  const [spontanAnlage, setSpontanAnlage] = useState<"Wedding" | "Britz">("Wedding");
  const [spontanVeroeffentlicht, setSpontanVeroeffentlicht] = useState(false);
  const [editingSpontanId, setEditingSpontanId] = useState<string | null>(null);

  const [tTrainerId, setTTrainerId] = useState(
    initial.state.trainers[0]?.id ?? ""
  );
  const [tDatum, setTDatum] = useState(todayISO());
  const [tVon, setTVon] = useState("16:00");
  const [tBis, setTBis] = useState("17:00");
  const [tTarifId, setTTarifId] = useState("");
  const [tStatus, setTStatus] = useState<TrainingStatus>("geplant");
  const [tNotiz, setTNotiz] = useState("");
  const [tCustomPreisProStunde, setTCustomPreisProStunde] = useState<
    number | ""
  >("");
  const [tCustomAbrechnung, setTCustomAbrechnung] =
    useState<"proTraining" | "proSpieler">("proTraining");
  const [tAnlage, setTAnlage] = useState("Wedding");

  const [spielerSuche, setSpielerSuche] = useState("");
  const [tSpielerIds, setTSpielerIds] = useState<string[]>([]);

  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatUntil, setRepeatUntil] = useState("2026-03-28");
  const [repeatPeriods, setRepeatPeriods] = useState<{von: string; bis: string}[]>([]);
  const [applySerieScope, setApplySerieScope] =
    useState<"nurDieses" | "abHeute">("nurDieses");

  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(
    null
  );
  const [selectedTrainingIds, setSelectedTrainingIds] = useState<string[]>([]);
  const [batchTrainerId, setBatchTrainerId] = useState<string>("");

  const [abrechnungMonat, setAbrechnungMonat] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
  });

  const [abrechnungFilter, setAbrechnungFilter] =
    useState<AbrechnungFilter>("alle");
  const [abrechnungTrainerFilter, setAbrechnungTrainerFilter] =
    useState<string>("alle");
  const [abrechnungSpielerSuche, setAbrechnungSpielerSuche] = useState("");
  const [abrechnungTagFilter, setAbrechnungTagFilter] = useState<string>("alle");
  const [abrechnungAbgebuchtFilter, setAbrechnungAbgebuchtFilter] = useState<string>("alle");
  const [selectedSpielerForDetail, setSelectedSpielerForDetail] = useState<string | null>(null);
  const [selectedTrainerPaymentView, setSelectedTrainerPaymentView] = useState<"none" | "bar" | "nichtBar">("none");
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  // States für Formular-Sichtbarkeit in der Verwaltung
  const [showTrainerForm, setShowTrainerForm] = useState(false);
  const [showSpielerForm, setShowSpielerForm] = useState(false);
  const [showTarifForm, setShowTarifForm] = useState(false);
  const [verwaltungSpielerSuche, setVerwaltungSpielerSuche] = useState("");
  const [spielerError, setSpielerError] = useState<string | null>(null);

  // States für PDF-Export Vorschau
  const [showPdfExportModal, setShowPdfExportModal] = useState(false);
  const [pdfExportLabelFilter, setPdfExportLabelFilter] = useState<string>("alle");
  const [pdfExportExcluded, setPdfExportExcluded] = useState<Set<string>>(new Set());

  // States für Wochenplan PDF-Export
  const [showWeekPdfModal, setShowWeekPdfModal] = useState(false);
  const [weekPdfDate, setWeekPdfDate] = useState<string>(todayISO());

  // State für Spieler-Label-Filter in Verwaltung
  const [verwaltungLabelFilter, setVerwaltungLabelFilter] = useState<string>("alle");

  // States für Notizen (Weiteres)
  const [showNotizForm, setShowNotizForm] = useState(false);
  const [editingNotizId, setEditingNotizId] = useState<string | null>(null);
  const [notizTitel, setNotizTitel] = useState("");
  const [notizInhalt, setNotizInhalt] = useState("");

  // States für Trainingsinfo-E-Mail
  const [showTrainingInfoEmail, setShowTrainingInfoEmail] = useState(false);
  const [trainingInfoEmailSubject, setTrainingInfoEmailSubject] = useState("");
  const [trainingInfoEmailBody, setTrainingInfoEmailBody] = useState("");
  const [trainingInfoEmailSending, setTrainingInfoEmailSending] = useState(false);

  const clickTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [doneFlashId, setDoneFlashId] = useState<string | null>(null);
  const [longPressTriggered, setLongPressTriggered] = useState(false);

  const hasMountedRef = useRef(false);

  const skipSaveRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const lastKnownUpdatedAtRef = useRef<string | null>(null);

  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileFinished, setProfileFinished] = useState(false);
  const [initialSynced, setInitialSynced] = useState(false);

  /* ::::: Local / Cloud Storage Migration ::::: */

  useEffect(() => {
    const usedKey = initial.usedKey;
    if (usedKey && usedKey !== STORAGE_KEY) {
      writeState(initial.state);
      for (const k of LEGACY_KEYS) {
        if (k !== STORAGE_KEY && localStorage.getItem(k))
          localStorage.removeItem(k);
      }
    }
    hasMountedRef.current = true;
  }, [initial.usedKey, initial.state]);

  useEffect(() => {
    if (!hasMountedRef.current) return;
    writeState({
      trainers,
      spieler,
      tarife,
      trainings,
      payments,
      trainerPayments,
      trainerMonthSettled,
      trainerBarSettled,
      notizen,
      monthlyAdjustments,
      vertretungen,
      wirdAbgebucht,
    });
  }, [trainers, spieler, tarife, trainings, payments, trainerPayments, trainerMonthSettled, trainerBarSettled, notizen, monthlyAdjustments, vertretungen, wirdAbgebucht]);

  /* ::::: Auth State von Supabase lesen ::::: */

  // Verhindere das "Synchronisiere" bei Tab-Wechsel
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Wenn der Tab wieder sichtbar wird und wir bereits synchronisiert waren,
      // müssen wir nichts zurücksetzen
      if (document.visibilityState === "visible" && initialSynced) {
        // Session prüfen ohne States zurückzusetzen
        supabase.auth.getSession().then((res) => {
          const session = res.data.session;
          if (session && authUser?.id === session.user.id) {
            // Gleicher User, alles gut - nichts tun
            return;
          }
          // Anderer User oder ausgeloggt - dann müssen wir wirklich neu laden
          if (!session && authUser) {
            setAuthUser(null);
            setInitialSynced(false);
            setProfileFinished(false);
          }
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialSynced, authUser]);

    useEffect(() => {
    supabase.auth.getSession().then((res) => {
      const session = res.data.session;
      setAuthUser(
        session
          ? {
              id: session.user.id,
              email: session.user.email ?? null,
              role: "admin",
              accountId: session.user.id, // <--- wichtig: nicht mehr null
              trainerId: null,
            }
          : null
      );
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        // Bei Token-Refresh oder Initial-Session nichts zurücksetzen
        if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
          // Beim initialen Laden nur den User setzen wenn er sich unterscheidet
          if (session) {
            setAuthUser((prev) => {
              if (prev?.id === session.user.id) return prev;
              return {
                id: session.user.id,
                email: session.user.email ?? null,
                role: "admin",
                accountId: session.user.id,
                trainerId: null,
              };
            });
          }
          return;
        }
        
        // Nur bei echten Auth-Änderungen (SIGNED_IN, SIGNED_OUT) den Sync zurücksetzen
        if (event === "SIGNED_OUT") {
          setAuthUser(null);
          setInitialSynced(false);
          setProfileFinished(false);
          return;
        }
        
        if (event === "SIGNED_IN" && session) {
          // Nur zurücksetzen wenn es wirklich ein anderer User ist
          setAuthUser((prev) => {
            if (prev?.id === session.user.id) {
              // Gleicher User, kein Reset nötig
              return prev;
            }
            // Anderer User, Reset nötig
            setInitialSynced(false);
            setProfileFinished(false);
            return {
              id: session.user.id,
              email: session.user.email ?? null,
              role: "admin",
              accountId: session.user.id,
              trainerId: null,
            };
          });
          return;
        }
        
        // Fallback für andere Events
        if (session) {
          setAuthUser((prev) => {
            if (prev?.id === session.user.id) return prev;
            return {
              id: session.user.id,
              email: session.user.email ?? null,
              role: "admin",
              accountId: session.user.id,
              trainerId: null,
            };
          });
        }
      }
    );

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);


  /* ::::: Profil aus user_profiles laden (Rolle, Account, Trainer) ::::: */

    useEffect(() => {
    if (!authUser?.id) {
      setProfileFinished(false);
      return;
    }

    let cancelled = false;
    setProfileLoading(true);
    setProfileFinished(false);

    (async () => {
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("role, account_id, trainer_id")
          .eq("user_id", authUser.id)
          .maybeSingle();

        if (error) {
          console.error("Fehler beim Laden des Profils", error);
        }

        if (cancelled) return;

        if (data) {
          // Profil gefunden: Werte aus user_profiles benutzen
          setAuthUser((prev) =>
            prev
              ? {
                  ...prev,
                  role: (data.role as Role) || "admin",
                  accountId: data.account_id ?? prev.id,
                  trainerId: data.trainer_id ?? null,
                }
              : prev
          );
        } else {
          // Kein Profil: mindestens accountId auf eigene user.id setzen
          setAuthUser((prev) =>
            prev
              ? {
                  ...prev,
                  accountId: prev.accountId ?? prev.id,
                }
              : prev
          );
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
          setProfileFinished(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);


  /* ::::: Initialen Zustand laden: lokal oder Supabase ::::: */

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (initialSynced) return;

    async function loadState() {
      if (!authUser) {
        const local = readStateWithMeta();
        setTrainers(local.state.trainers);
        setSpieler(local.state.spieler);
        setTarife(local.state.tarife);
        setTrainings(local.state.trainings);
        setPayments(local.state.payments ?? {});
        setTrainerPayments(local.state.trainerPayments ?? {});
        setNotizen(local.state.notizen ?? []);
        setVertretungen(local.state.vertretungen ?? []);
        setInitialSynced(true);
        return;
      }

      if (!profileFinished) {
        return;
      }

      if (!authUser.accountId) {
        const local = readStateWithMeta();
        setTrainers(local.state.trainers);
        setSpieler(local.state.spieler);
        setTarife(local.state.tarife);
        setTrainings(local.state.trainings);
        setPayments(local.state.payments ?? {});
        setTrainerPayments(local.state.trainerPayments ?? {});
        setTrainerMonthSettled(local.state.trainerMonthSettled ?? {});
        setTrainerBarSettled(local.state.trainerBarSettled ?? {});
        setNotizen(local.state.notizen ?? []);
        setVertretungen(local.state.vertretungen ?? []);
        setInitialSynced(true);
        return;
      }

      const { data, error } = await supabase
        .from("account_state")
        .select("data, updated_at")
        .eq("account_id", authUser.accountId)
        .maybeSingle();

      if (error) {
        console.error("Fehler beim Laden des Zustands aus Supabase", error);
      }

      if (data && data.data) {
        // Speichere den initialen Timestamp
        if (data.updated_at) {
          lastKnownUpdatedAtRef.current = data.updated_at;
        }

        const cloud = normalizeState(data.data as Partial<AppState>);
        setTrainers(cloud.trainers);
        setSpieler(cloud.spieler);
        setTarife(cloud.tarife);
        setTrainings(cloud.trainings);
        setPayments(cloud.payments ?? {});
        setTrainerPayments(cloud.trainerPayments ?? {});
        setTrainerMonthSettled(cloud.trainerMonthSettled ?? {});
        setTrainerBarSettled(cloud.trainerBarSettled ?? {});
        setNotizen(cloud.notizen ?? []);
        setMonthlyAdjustments(cloud.monthlyAdjustments ?? {});
        setVertretungen(cloud.vertretungen ?? []);
        setWirdAbgebucht(cloud.wirdAbgebucht ?? {});
      } else {
        const local = readStateWithMeta();
        setTrainers(local.state.trainers);
        setSpieler(local.state.spieler);
        setTarife(local.state.tarife);
        setTrainings(local.state.trainings);
        setPayments(local.state.payments ?? {});
        setTrainerPayments(local.state.trainerPayments ?? {});
        setTrainerMonthSettled(local.state.trainerMonthSettled ?? {});
        setTrainerBarSettled(local.state.trainerBarSettled ?? {});
        setNotizen(local.state.notizen ?? []);
        setMonthlyAdjustments(local.state.monthlyAdjustments ?? {});
        setVertretungen(local.state.vertretungen ?? []);
        setWirdAbgebucht(local.state.wirdAbgebucht ?? {});
      }

      setInitialSynced(true);
    }

    loadState();
  }, [authLoading, profileLoading, authUser, initialSynced, profileFinished]);

  /* ::::: Realtime Sync (nur für Admin) ::::: */

  useEffect(() => {
    if (!authUser?.accountId) return;
    if (!initialSynced) return;
    if (authUser.role === "trainer") return; // Trainer brauchen kein Realtime

    const channel = supabase
      .channel(`account_state:${authUser.accountId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "account_state",
          filter: `account_id=eq.${authUser.accountId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const newRow = payload.new as any;

            if (newRow?.data) {
              // Prüfe ob das Update neuer ist als unser letztes bekanntes Update
              const incomingUpdatedAt = newRow.updated_at;
              if (lastKnownUpdatedAtRef.current && incomingUpdatedAt) {
                if (incomingUpdatedAt <= lastKnownUpdatedAtRef.current) {
                  // Ignoriere ältere oder gleiche Updates
                  return;
                }
              }

              // Update ist neuer, also übernehmen
              lastKnownUpdatedAtRef.current = incomingUpdatedAt;
              skipSaveRef.current = true;

              const cloud = normalizeState(newRow.data as Partial<AppState>);
              setTrainers(cloud.trainers);
              setSpieler(cloud.spieler);
              setTarife(cloud.tarife);
              setTrainings(cloud.trainings);
              setPayments(cloud.payments ?? {});
              setTrainerPayments(cloud.trainerPayments ?? {});
              setTrainerMonthSettled(cloud.trainerMonthSettled ?? {});
              setTrainerBarSettled(cloud.trainerBarSettled ?? {});
              setNotizen(cloud.notizen ?? []);
              setMonthlyAdjustments(cloud.monthlyAdjustments ?? {});
              setVertretungen(cloud.vertretungen ?? []);
              setWirdAbgebucht(cloud.wirdAbgebucht ?? {});
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.accountId, authUser?.role, initialSynced]);


  /* ::::: Zustand nach Supabase schreiben (debounced) ::::: */

  useEffect(() => {
    if (!authUser) return;
    if (!authUser.accountId) return;
    if (!initialSynced) return;
    if (authUser.role === "trainer") return; // Trainer schreiben nicht

    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      const payload: AppState = {
        trainers,
        spieler,
        tarife,
        trainings,
        payments,
        trainerPayments,
        trainerMonthSettled,
        trainerBarSettled,
        notizen,
        monthlyAdjustments,
        vertretungen,
        wirdAbgebucht,
      };

      const updatedAt = new Date().toISOString();
      lastKnownUpdatedAtRef.current = updatedAt;

      supabase
        .from("account_state")
        .upsert({
          account_id: authUser.accountId,
          data: payload,
          updated_at: updatedAt,
        })
        .then(({ error }) => {
          if (error) {
            console.error(
              "Fehler beim Speichern des Zustands in Supabase",
              error
            );
          }
        });
    }, 1000);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    authUser,
    initialSynced,
    trainers,
    spieler,
    tarife,
    trainings,
    payments,
    trainerPayments,
    trainerMonthSettled,
    trainerBarSettled,
    notizen,
    monthlyAdjustments,
    vertretungen,
    wirdAbgebucht,
  ]);


  useEffect(() => {
    return () => {
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (tab === "formulare" && authUser?.accountId) {
      fetchRegistrationRequests();
      fetchSepaMandates();
      fetchTenniscampAnmeldungen();
      fetchProbetrainingAnfragen();
    }
    if (tab === "weiteres" && weiteresTabs === "spontan" && authUser?.accountId) {
      fetchSpontaneStunden();
      if (!spontanTrainerId && trainers.length > 0) {
        setSpontanTrainerId(trainers[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, verwaltungTab, authUser?.accountId]);

  const trainerById = useMemo(
    () => new Map(trainers.map((t) => [t.id, t])),
    [trainers]
  );

  const spielerById = useMemo(
    () => new Map(spieler.map((s) => [s.id, s])),
    [spieler]
  );

  // Zähle wie oft jeder Vorname vorkommt (für Anzeigename-Logik)
  const vornameCount = useMemo(() => {
    const counts = new Map<string, number>();
    spieler.forEach((s) => {
      const vn = s.vorname.toLowerCase().trim();
      counts.set(vn, (counts.get(vn) ?? 0) + 1);
    });
    return counts;
  }, [spieler]);



  // Helper: Anzeigename (nur Vorname, außer bei Duplikaten)
  const getDisplayName = (s: Spieler) => {
    const vn = s.vorname.toLowerCase().trim();
    if ((vornameCount.get(vn) ?? 0) > 1 && s.nachname) {
      return `${s.vorname} ${s.nachname.charAt(0)}.`;
    }
    return s.vorname;
  };

  // Helper: Name per ID abrufen (für Kalender - kurzer Name)
  const getSpielerDisplayName = (id: string) => {
    const s = spielerById.get(id);
    return s ? getDisplayName(s) : "Unbekannt";
  };

  // Helper: Vollständiger Name per ID abrufen
  const getSpielerFullName = useCallback((id: string) => {
    const s = spielerById.get(id);
    return s ? getFullName(s) : "Unbekannt";
  }, [spielerById]);

  // Alle verfügbaren Labels aus Spielern sammeln
  const allLabels = useMemo(() => {
    const labelSet = new Set<string>();
    spieler.forEach((s) => {
      s.labels?.forEach((label) => labelSet.add(label));
    });
    return Array.from(labelSet).sort();
  }, [spieler]);

  const tarifById = useMemo(
    () => new Map(tarife.map((t) => [t.id, t])),
    [tarife]
  );

  const isTrainer = authUser?.role === "trainer";
  const ownTrainerId =
    (authUser?.trainerId &&
      trainers.some((t) => t.id === authUser.trainerId) &&
      authUser.trainerId) ||
    trainers[0]?.id ||
    "";
  const defaultTrainerId = trainers[0]?.id ?? "";
  const selectedTrainerName =
    trainerById.get(tTrainerId)?.name ??
    trainerById.get(defaultTrainerId)?.name ??
    "Trainer";
  const trainerFilterLabel =
    abrechnungTrainerFilter === "alle"
      ? trainers.length === 1
        ? trainers[0]?.name ?? "Alle Trainer"
        : "Alle Trainer"
      : trainerById.get(abrechnungTrainerFilter)?.name ?? "Trainer";

  const kalenderTrainerFilterLabel =
    kalenderTrainerFilter.length === 0
      ? trainers.length === 1
        ? trainers[0]?.name ?? "Alle Trainer"
        : "Alle Trainer"
      : kalenderTrainerFilter.length === 1
        ? trainerById.get(kalenderTrainerFilter[0])?.name ?? "Trainer"
        : `${kalenderTrainerFilter.length} Trainer`;

  const visibleTabs: Tab[] = isTrainer
    ? ["kalender", "abrechnung"]
    : ["kalender", "training", "verwaltung", "formulare", "abrechnung", "weiteres"];

  const roleLabel = isTrainer ? "Trainer" : "Admin";

  const trainerOptionsForSelect = isTrainer
    ? trainers.filter(
        (t) => t.id === ownTrainerId || !ownTrainerId || trainers.length === 1
      )
    : trainers;

  useEffect(() => {
    if (!trainers.length) return;
    if (isTrainer) {
      if (ownTrainerId && tTrainerId !== ownTrainerId) {
        setTTrainerId(ownTrainerId);
      }
      return;
    }
    if (!tTrainerId || !trainers.some((t) => t.id === tTrainerId)) {
      setTTrainerId(trainers[0].id);
    }
  }, [tTrainerId, trainers, isTrainer, ownTrainerId]);

  useEffect(() => {
    if (!trainers.length) return;
    if (isTrainer) {
      if (ownTrainerId && abrechnungTrainerFilter !== ownTrainerId) {
        setAbrechnungTrainerFilter(ownTrainerId);
      }
      return;
    }
    if (
      abrechnungTrainerFilter !== "alle" &&
      !trainers.some((t) => t.id === abrechnungTrainerFilter)
    ) {
      setAbrechnungTrainerFilter("alle");
    }
  }, [abrechnungTrainerFilter, trainers, isTrainer, ownTrainerId]);

  useEffect(() => {
    if (!trainers.length) return;
    if (isTrainer) {
      if (ownTrainerId && !kalenderTrainerFilter.includes(ownTrainerId)) {
        setKalenderTrainerFilter([ownTrainerId]);
      }
      return;
    }
    // Entferne Trainer-IDs aus dem Filter, die nicht mehr existieren
    const validIds = kalenderTrainerFilter.filter(id =>
      trainers.some((t) => t.id === id)
    );
    if (validIds.length !== kalenderTrainerFilter.length) {
      setKalenderTrainerFilter(validIds);
    }
  }, [kalenderTrainerFilter, trainers, isTrainer, ownTrainerId]);

  useEffect(() => {
    if (isTrainer && tab === "verwaltung") {
      setTab("kalender");
    }
  }, [isTrainer, tab]);

  useEffect(() => {
    if (isTrainer) {
      setAbrechnungTab("trainer");
    } else {
      setAbrechnungTab("spieler");
    }
  }, [isTrainer]);

  const weekStart = useMemo(() => startOfWeekISO(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i)),
    [weekStart]
  );

  // Swipe-Handler für mobile Kalender-Navigation
  const handleSwipeLeft = useCallback(() => {
    if (viewMode === "day") {
      // Nächster Tag
      const newIndex = (dayIndex + 1) % 7;
      setDayIndex(newIndex);
      if (newIndex === 0) {
        // Nächste Woche wenn wir von Sonntag zu Montag wechseln
        setWeekAnchor(addDaysISO(weekStart, 7));
      }
    } else {
      // Nächste Woche
      setWeekAnchor(addDaysISO(weekStart, 7));
    }
  }, [viewMode, dayIndex, weekStart]);

  const handleSwipeRight = useCallback(() => {
    if (viewMode === "day") {
      // Vorheriger Tag
      const newIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      setDayIndex(newIndex);
      if (dayIndex === 0) {
        // Vorherige Woche wenn wir von Montag zu Sonntag wechseln
        setWeekAnchor(addDaysISO(weekStart, -7));
      }
    } else {
      // Vorherige Woche
      setWeekAnchor(addDaysISO(weekStart, -7));
    }
  }, [viewMode, dayIndex, weekStart]);

  const calendarSwipeHandlers = useSwipe(handleSwipeLeft, handleSwipeRight, 50);

  const hours = useMemo(() => {
    const startHour = 7;
    const endHour = 22;
    return Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  }, []);

  const trainingsInWeek = useMemo(() => {
    const end = addDaysISO(weekStart, 7);
    return trainings
      .filter((t) => t.datum >= weekStart && t.datum < end)
      .filter((t) => {
        if (kalenderTrainerFilter.length === 0) return true;
        const tid = t.trainerId || defaultTrainerId;
        // Bei Vertretung: NUR beim Vertretungstrainer anzeigen, nicht mehr beim ursprünglichen Trainer
        const vertretung = vertretungen.find(v => v.trainingId === t.id);
        if (vertretung) {
          // Wenn Vertretung offen (kein Vertretungstrainer), bei niemandem im Filter anzeigen
          if (!vertretung.vertretungTrainerId) return false;
          // Nur beim Vertretungstrainer anzeigen
          return kalenderTrainerFilter.includes(vertretung.vertretungTrainerId);
        }
        // Keine Vertretung: normaler Trainer
        return kalenderTrainerFilter.includes(tid);
      })
      .sort((a, b) =>
        (a.datum + a.uhrzeitVon).localeCompare(b.datum + b.uhrzeitVon)
      );
  }, [trainings, weekStart, kalenderTrainerFilter, defaultTrainerId, vertretungen]);

  const filteredSpielerForPick = useMemo(() => {
    const q = spielerSuche.trim().toLowerCase();
    if (!q) return spieler;
    return spieler.filter(
      (s) =>
        s.vorname.toLowerCase().includes(q) ||
        (s.nachname ?? "").toLowerCase().includes(q) ||
        (s.kontaktEmail ?? "").toLowerCase().includes(q)
    );
  }, [spieler, spielerSuche]);

  function addTrainer() {
    const name = trainerName.trim();
    if (!name) return;
    const rate =
      trainerStundensatz === "" ? 0 : Number(trainerStundensatz) || 0;

    const neu: Trainer = {
      id: uid(),
      name,
      nachname: trainerNachname.trim() || undefined,
      email: trainerEmail.trim() || undefined,
      stundensatz: rate,
      notiz: trainerNotiz.trim() || undefined,
      adresse: trainerAdresse.trim() || undefined,
      iban: trainerIban.trim() || undefined,
      ustIdNr: trainerUstIdNr.trim() || undefined,
      kleinunternehmer: trainerKleinunternehmer,
    };

    setTrainers((prev) => [...prev, neu]);
    setTrainerName("");
    setTrainerNachname("");
    setTrainerEmail("");
    setTrainerStundensatz(0);
    setTrainerNotiz("");
    setTrainerAdresse("");
    setTrainerIban("");
    setTrainerUstIdNr("");
    setTrainerKleinunternehmer(false);
    setEditingTrainerId(null);
    if (!tTrainerId) setTTrainerId(neu.id);
  }

  function startEditTrainer(t: Trainer) {
    setEditingTrainerId(t.id);
    setTrainerName(t.name);
    setTrainerNachname(t.nachname ?? "");
    setTrainerEmail(t.email ?? "");
    setTrainerStundensatz(typeof t.stundensatz === "number" ? t.stundensatz : 0);
    setTrainerNotiz(t.notiz ?? "");
    setTrainerAdresse(t.adresse ?? "");
    setTrainerIban(t.iban ?? "");
    setTrainerUstIdNr(t.ustIdNr ?? "");
    setTrainerKleinunternehmer(t.kleinunternehmer ?? false);
  }

  function saveTrainer() {
    if (!editingTrainerId) return;
    const name = trainerName.trim();
    if (!name) return;
    const rate =
      trainerStundensatz === "" ? 0 : Number(trainerStundensatz) || 0;

    setTrainers((prev) =>
      prev.map((t) =>
        t.id === editingTrainerId
          ? {
              ...t,
              name,
              nachname: trainerNachname.trim() || undefined,
              email: trainerEmail.trim() || undefined,
              stundensatz: rate,
              notiz: trainerNotiz.trim() || undefined,
              adresse: trainerAdresse.trim() || undefined,
              iban: trainerIban.trim() || undefined,
              ustIdNr: trainerUstIdNr.trim() || undefined,
              kleinunternehmer: trainerKleinunternehmer,
            }
          : t
      )
    );

    setEditingTrainerId(null);
    setTrainerName("");
    setTrainerNachname("");
    setTrainerEmail("");
    setTrainerStundensatz(0);
    setTrainerNotiz("");
    setTrainerAdresse("");
    setTrainerIban("");
    setTrainerUstIdNr("");
    setTrainerKleinunternehmer(false);
  }

  function deleteTrainer(id: string) {
    if (trainers.length <= 1) return;
    const trainerName = trainerById.get(id)?.name ?? "Trainer";
    saveUndoSnapshot(`Trainer "${trainerName}" gelöscht`);
    const remaining = trainers.filter((t) => t.id !== id);
    const fallbackId = remaining[0]?.id ?? id;
    setTrainers(remaining);
    setTrainings((prev) =>
      prev.map((t) =>
        t.trainerId === id ? { ...t, trainerId: fallbackId } : t
      )
    );
    if (tTrainerId === id) setTTrainerId(fallbackId);
    if (abrechnungTrainerFilter === id) {
      setAbrechnungTrainerFilter("alle");
    }
  }

  function deleteSpieler(id: string) {
    const spielerToDelete = spieler.find(s => s.id === id);
    const name = spielerToDelete ? getFullName(spielerToDelete) : "Spieler";

    if (!window.confirm(`Möchtest du "${name}" wirklich löschen? Der Spieler wird auch aus allen Trainings entfernt.`)) {
      return;
    }

    saveUndoSnapshot(`Spieler "${name}" gelöscht`);
    setSpieler((prev) => prev.filter((s) => s.id !== id));
    setTrainings((prev) =>
      prev.map((t) => ({
        ...t,
        spielerIds: t.spielerIds.filter((sid) => sid !== id),
      }))
    );
    if (editingSpielerId === id) {
      setEditingSpielerId(null);
      setSpielerVorname("");
      setSpielerNachname("");
      setSpielerEmail("");
      setSpielerTelefon("");
      setSpielerRechnung("");
      setSpielerNotizen("");
      setSpielerIban("");
      setSpielerMandatsreferenz("");
      setSpielerUnterschriftsdatum("");
      setSpielerAbweichenderEmpfaenger(false);
      setSpielerEmpfaengerName("");
    }
  }

  function deleteTarif(id: string) {
    const tarifName = tarifById.get(id)?.name ?? "Tarif";
    saveUndoSnapshot(`Tarif "${tarifName}" gelöscht`);
    setTarife((prev) => prev.filter((t) => t.id !== id));
    setTrainings((prev) =>
      prev.map((t) => ({
        ...t,
        tarifId: t.tarifId === id ? undefined : t.tarifId,
      }))
    );
    if (editingTarifId === id) {
      setEditingTarifId(null);
      setTarifName("");
      setTarifPreisProStunde(60);
      setTarifAbrechnung("proTraining");
      setTarifBeschreibung("");
    }
    if (tTarifId === id) {
      setTTarifId("");
    }
  }

  function addSpieler() {
    const vorname = spielerVorname.trim();
    const nachname = spielerNachname.trim();
    if (!vorname) return;

    // Duplikatscheck: Vorname+Nachname Kombination muss eindeutig sein
    const fullNameLower = `${vorname} ${nachname}`.toLowerCase().trim();

    const duplicate = spieler.find((s) => {
      const existingFullName = `${s.vorname} ${s.nachname || ""}`.toLowerCase().trim();
      return existingFullName === fullNameLower;
    });

    if (duplicate) {
      setSpielerError("Es existiert bereits ein Spieler mit diesem Namen.");
      return;
    }

    setSpielerError(null);

    const neu: Spieler = {
      id: uid(),
      vorname,
      nachname: nachname || undefined,
      kontaktEmail: spielerEmail.trim() || undefined,
      zusaetzlicheEmails: spielerZusaetzlicheEmails.length > 0 ? spielerZusaetzlicheEmails : undefined,
      kontaktTelefon: spielerTelefon.trim() || undefined,
      rechnungsAdresse: spielerRechnung.trim() || undefined,
      notizen: spielerNotizen.trim() || undefined,
      iban: spielerIban.trim() || undefined,
      mandatsreferenz: spielerMandatsreferenz.trim() || undefined,
      unterschriftsdatum: spielerUnterschriftsdatum.trim() || undefined,
      abweichenderEmpfaenger: spielerAbweichenderEmpfaenger || undefined,
      empfaengerName: spielerEmpfaengerName.trim() || undefined,
      labels: spielerLabels.length > 0 ? spielerLabels : undefined,
    };

    setSpieler((prev) => [...prev, neu]);
    setEditingSpielerId(null);
    setSpielerVorname("");
    setSpielerNachname("");
    setSpielerEmail("");
    setSpielerZusaetzlicheEmails([]);
    setSpielerNeueEmail("");
    setSpielerTelefon("");
    setSpielerRechnung("");
    setSpielerNotizen("");
    setSpielerIban("");
    setSpielerMandatsreferenz("");
    setSpielerUnterschriftsdatum("");
    setSpielerAbweichenderEmpfaenger(false);
    setSpielerEmpfaengerName("");
    setSpielerLabels([]);
    setNewLabelInput("");
    setShowSpielerForm(false);
  }

  function startEditSpieler(s: Spieler) {
    setEditingSpielerId(s.id);
    setSpielerVorname(s.vorname);
    setSpielerNachname(s.nachname ?? "");
    setSpielerEmail(s.kontaktEmail ?? "");
    setSpielerZusaetzlicheEmails(s.zusaetzlicheEmails ?? []);
    setSpielerNeueEmail("");
    setSpielerTelefon(s.kontaktTelefon ?? "");
    setSpielerRechnung(s.rechnungsAdresse ?? "");
    setSpielerNotizen(s.notizen ?? "");
    setSpielerIban(s.iban ?? "");
    setSpielerMandatsreferenz(s.mandatsreferenz ?? "");
    setSpielerUnterschriftsdatum(s.unterschriftsdatum ?? "");
    setSpielerAbweichenderEmpfaenger(s.abweichenderEmpfaenger ?? false);
    setSpielerEmpfaengerName(s.empfaengerName ?? "");
    setSpielerLabels(s.labels ?? []);
    setNewLabelInput("");
    // Scroll zum Formular
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }

  function saveSpieler() {
    if (!editingSpielerId) return;
    const vorname = spielerVorname.trim();
    const nachname = spielerNachname.trim();
    if (!vorname) return;

    // Duplikatscheck: Vorname+Nachname Kombination muss eindeutig sein
    const fullNameLower = `${vorname} ${nachname}`.toLowerCase().trim();

    const duplicate = spieler.find((s) => {
      // Nicht mit sich selbst vergleichen
      if (s.id === editingSpielerId) return false;

      const existingFullName = `${s.vorname} ${s.nachname || ""}`.toLowerCase().trim();
      return existingFullName === fullNameLower;
    });

    if (duplicate) {
      setSpielerError("Es existiert bereits ein Spieler mit diesem Namen.");
      return;
    }

    setSpielerError(null);

    setSpieler((prev) =>
      prev.map((s) =>
        s.id === editingSpielerId
          ? {
              ...s,
              vorname,
              nachname: nachname || undefined,
              kontaktEmail: spielerEmail.trim() || undefined,
              zusaetzlicheEmails: spielerZusaetzlicheEmails.length > 0 ? spielerZusaetzlicheEmails : undefined,
              kontaktTelefon: spielerTelefon.trim() || undefined,
              rechnungsAdresse: spielerRechnung.trim() || undefined,
              notizen: spielerNotizen.trim() || undefined,
              iban: spielerIban.trim() || undefined,
              mandatsreferenz: spielerMandatsreferenz.trim() || undefined,
              unterschriftsdatum: spielerUnterschriftsdatum.trim() || undefined,
              abweichenderEmpfaenger: spielerAbweichenderEmpfaenger || undefined,
              empfaengerName: spielerEmpfaengerName.trim() || undefined,
              labels: spielerLabels.length > 0 ? spielerLabels : undefined,
            }
          : s
      )
    );

    setEditingSpielerId(null);
    setSpielerVorname("");
    setSpielerNachname("");
    setSpielerEmail("");
    setSpielerZusaetzlicheEmails([]);
    setSpielerNeueEmail("");
    setSpielerTelefon("");
    setSpielerRechnung("");
    setSpielerNotizen("");
    setSpielerIban("");
    setSpielerMandatsreferenz("");
    setSpielerUnterschriftsdatum("");
    setSpielerAbweichenderEmpfaenger(false);
    setSpielerEmpfaengerName("");
    setSpielerLabels([]);
    setNewLabelInput("");
    setShowSpielerForm(false);
  }

  function addTarif() {
    const name = tarifName.trim();
    if (!name) return;

    const neu: Tarif = {
      id: uid(),
      name,
      preisProStunde: Number.isFinite(tarifPreisProStunde)
        ? tarifPreisProStunde
        : 0,
      abrechnung: tarifAbrechnung,
      beschreibung: tarifBeschreibung.trim() || undefined,
    };

    setTarife((prev) => [...prev, neu]);
    setTarifName("");
    setTarifPreisProStunde(60);
    setTarifAbrechnung("proTraining");
    setTarifBeschreibung("");
    setTTarifId((prev) => (prev ? prev : neu.id));
    setEditingTarifId(null);
  }

  function startEditTarif(t: Tarif) {
    setEditingTarifId(t.id);
    setTarifName(t.name);
    setTarifPreisProStunde(t.preisProStunde);
    setTarifAbrechnung(t.abrechnung);
    setTarifBeschreibung(t.beschreibung ?? "");
  }

  function saveTarif() {
    if (!editingTarifId) return;
    const name = tarifName.trim();
    if (!name) return;

    setTarife((prev) =>
      prev.map((t) =>
        t.id === editingTarifId
          ? {
              ...t,
              name,
              preisProStunde: Number.isFinite(tarifPreisProStunde)
                ? tarifPreisProStunde
                : 0,
              abrechnung: tarifAbrechnung,
              beschreibung: tarifBeschreibung.trim() || undefined,
            }
          : t
      )
    );

    setEditingTarifId(null);
    setTarifName("");
    setTarifPreisProStunde(60);
    setTarifAbrechnung("proTraining");
    setTarifBeschreibung("");
  }

  async function fetchRegistrationRequests() {
    if (!authUser?.accountId) return;
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from("registration_requests")
        .select("*")
        .eq("account_id", authUser.accountId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching registration requests:", error);
        return;
      }
      setRegistrationRequests(data || []);
    } catch (err) {
      console.error("Error fetching registration requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function fetchSepaMandates() {
    if (!authUser?.accountId) return;
    setLoadingSepaMandates(true);
    try {
      const { data, error } = await supabase
        .from("sepa_mandates")
        .select("*")
        .eq("account_id", authUser.accountId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching SEPA mandates:", error);
        return;
      }
      setSepaMandates(data || []);
    } catch (err) {
      console.error("Error fetching SEPA mandates:", err);
    } finally {
      setLoadingSepaMandates(false);
    }
  }

  async function fetchTenniscampAnmeldungen() {
    if (!authUser?.accountId) return;
    setLoadingTenniscampAnmeldungen(true);
    try {
      const { data, error } = await supabase
        .from("tenniscamp_anmeldungen")
        .select("*")
        .in("account_id", [authUser.accountId, "public"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching Tenniscamp-Anmeldungen:", error);
        return;
      }
      setTenniscampAnmeldungen(data || []);
    } catch (err) {
      console.error("Error fetching Tenniscamp-Anmeldungen:", err);
    } finally {
      setLoadingTenniscampAnmeldungen(false);
    }
  }

  async function updateTenniscampStatus(anmeldungId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("tenniscamp_anmeldungen")
        .update({ status: newStatus })
        .eq("id", anmeldungId);

      if (error) {
        console.error("Error updating Tenniscamp status:", error);
        return;
      }
      fetchTenniscampAnmeldungen();
    } catch (err) {
      console.error("Error updating Tenniscamp status:", err);
    }
  }

  async function deleteTenniscampAnmeldung(anmeldungId: string) {
    if (!window.confirm("Möchten Sie diese Anmeldung wirklich löschen?")) return;
    try {
      const { error } = await supabase
        .from("tenniscamp_anmeldungen")
        .delete()
        .eq("id", anmeldungId);

      if (error) {
        console.error("Error deleting Tenniscamp-Anmeldung:", error);
        return;
      }
      fetchTenniscampAnmeldungen();
    } catch (err) {
      console.error("Error deleting Tenniscamp-Anmeldung:", err);
    }
  }

  async function fetchProbetrainingAnfragen() {
    if (!authUser?.accountId) return;
    setLoadingProbetrainingAnfragen(true);
    try {
      const { data, error } = await supabase
        .from("probetraining_anfragen")
        .select("*")
        .in("account_id", [authUser.accountId, "public"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching Probetraining-Anfragen:", error);
        return;
      }
      setProbetrainingAnfragen(data || []);
    } catch (err) {
      console.error("Error fetching Probetraining-Anfragen:", err);
    } finally {
      setLoadingProbetrainingAnfragen(false);
    }
  }

  async function updateProbetrainingStatus(anfragenId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("probetraining_anfragen")
        .update({ status: newStatus })
        .eq("id", anfragenId);

      if (error) {
        console.error("Error updating Probetraining status:", error);
        return;
      }
      fetchProbetrainingAnfragen();
    } catch (err) {
      console.error("Error updating Probetraining status:", err);
    }
  }

  async function deleteProbetrainingAnfrage(anfragenId: string) {
    if (!window.confirm("Möchten Sie diese Anfrage wirklich löschen?")) return;
    try {
      const { error } = await supabase
        .from("probetraining_anfragen")
        .delete()
        .eq("id", anfragenId);

      if (error) {
        console.error("Error deleting Probetraining-Anfrage:", error);
        return;
      }
      fetchProbetrainingAnfragen();
    } catch (err) {
      console.error("Error deleting Probetraining-Anfrage:", err);
    }
  }

  async function updateSepaMandateStatus(mandateId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("sepa_mandates")
        .update({ status: newStatus })
        .eq("id", mandateId);

      if (error) {
        console.error("Error updating SEPA mandate status:", error);
        return;
      }

      setSepaMandates((prev) =>
        prev.map((m) => (m.id === mandateId ? { ...m, status: newStatus } : m))
      );
    } catch (err) {
      console.error("Error updating SEPA mandate status:", err);
    }
  }

  async function deleteSepaMandate(mandateId: string) {
    if (!window.confirm("Möchten Sie dieses SEPA-Mandat wirklich löschen?")) {
      return;
    }
    try {
      const { error } = await supabase
        .from("sepa_mandates")
        .delete()
        .eq("id", mandateId);

      if (error) {
        console.error("Error deleting SEPA mandate:", error);
        return;
      }

      setSepaMandates((prev) => prev.filter((m) => m.id !== mandateId));
      setExpandedSepaMandateId(null);
    } catch (err) {
      console.error("Error deleting SEPA mandate:", err);
    }
  }

  async function updateRequestStatus(requestId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("registration_requests")
        .update({ status: newStatus })
        .eq("id", requestId);

      if (error) {
        console.error("Error updating status:", error);
        return;
      }

      setRegistrationRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error("Error updating status:", err);
    }
  }

  async function deleteRegistrationRequest(requestId: string) {
    try {
      const { error } = await supabase
        .from("registration_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        console.error("Error deleting request:", error);
        return;
      }

      setRegistrationRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error deleting request:", err);
    }
  }

  // Spontane Stunden CRUD
  async function fetchSpontaneStunden() {
    if (!authUser?.accountId) return;
    setLoadingSpontaneStunden(true);
    try {
      const { data, error } = await supabase
        .from("spontane_stunden")
        .select("*")
        .eq("account_id", authUser.accountId)
        .order("datum", { ascending: true });

      if (error) {
        console.error("Error fetching spontane stunden:", error);
        return;
      }

      const mapped: SpontaneStunde[] = (data || []).map((row: {
        id: string;
        datum: string;
        uhrzeit_von: string;
        uhrzeit_bis: string;
        trainer_id: string;
        tarif_id?: string;
        custom_preis_pro_stunde?: number;
        status: string;
        anlage: string;
        veroeffentlicht: boolean;
        buchung?: SpontaneStundeBuchung;
        training_id?: string;
      }) => ({
        id: row.id,
        datum: row.datum,
        uhrzeitVon: row.uhrzeit_von,
        uhrzeitBis: row.uhrzeit_bis,
        trainerId: row.trainer_id,
        tarifId: row.tarif_id,
        customPreisProStunde: row.custom_preis_pro_stunde,
        status: row.status as "offen" | "gebucht",
        anlage: row.anlage as "Wedding" | "Britz",
        veroeffentlicht: row.veroeffentlicht,
        buchung: row.buchung,
        trainingId: row.training_id,
      }));
      setSpontaneStunden(mapped);
    } catch (err) {
      console.error("Error fetching spontane stunden:", err);
    } finally {
      setLoadingSpontaneStunden(false);
    }
  }

  async function createSpontaneStunde() {
    if (!authUser?.accountId) return;
    if (!spontanTrainerId) {
      alert("Bitte Trainer auswählen");
      return;
    }

    const neu: Omit<SpontaneStunde, "id"> = {
      datum: spontanDatum,
      uhrzeitVon: spontanVon,
      uhrzeitBis: spontanBis,
      trainerId: spontanTrainerId,
      tarifId: spontanTarifId || undefined,
      customPreisProStunde: spontanCustomPreis === "" ? undefined : spontanCustomPreis,
      status: "offen",
      anlage: spontanAnlage,
      veroeffentlicht: spontanVeroeffentlicht,
    };

    try {
      const { data, error } = await supabase
        .from("spontane_stunden")
        .insert({
          account_id: authUser.accountId,
          datum: neu.datum,
          uhrzeit_von: neu.uhrzeitVon,
          uhrzeit_bis: neu.uhrzeitBis,
          trainer_id: neu.trainerId,
          tarif_id: neu.tarifId || null,
          custom_preis_pro_stunde: neu.customPreisProStunde ?? null,
          status: neu.status,
          anlage: neu.anlage,
          veroeffentlicht: neu.veroeffentlicht,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating spontane stunde:", error);
        alert("Fehler beim Erstellen: " + error.message);
        return;
      }

      const created: SpontaneStunde = {
        id: data.id,
        datum: data.datum,
        uhrzeitVon: data.uhrzeit_von,
        uhrzeitBis: data.uhrzeit_bis,
        trainerId: data.trainer_id,
        tarifId: data.tarif_id,
        customPreisProStunde: data.custom_preis_pro_stunde,
        status: data.status,
        anlage: data.anlage,
        veroeffentlicht: data.veroeffentlicht,
        buchung: data.buchung,
        trainingId: data.training_id,
      };
      setSpontaneStunden((prev) => [...prev, created]);
      resetSpontanForm();
    } catch (err) {
      console.error("Error creating spontane stunde:", err);
    }
  }

  async function updateSpontaneStunde() {
    if (!editingSpontanId || !authUser?.accountId) return;

    try {
      const { error } = await supabase
        .from("spontane_stunden")
        .update({
          datum: spontanDatum,
          uhrzeit_von: spontanVon,
          uhrzeit_bis: spontanBis,
          trainer_id: spontanTrainerId,
          tarif_id: spontanTarifId || null,
          custom_preis_pro_stunde: spontanCustomPreis === "" ? null : spontanCustomPreis,
          anlage: spontanAnlage,
          veroeffentlicht: spontanVeroeffentlicht,
        })
        .eq("id", editingSpontanId);

      if (error) {
        console.error("Error updating spontane stunde:", error);
        alert("Fehler beim Aktualisieren: " + error.message);
        return;
      }

      setSpontaneStunden((prev) =>
        prev.map((s) =>
          s.id === editingSpontanId
            ? {
                ...s,
                datum: spontanDatum,
                uhrzeitVon: spontanVon,
                uhrzeitBis: spontanBis,
                trainerId: spontanTrainerId,
                tarifId: spontanTarifId || undefined,
                customPreisProStunde: spontanCustomPreis === "" ? undefined : spontanCustomPreis,
                anlage: spontanAnlage,
                veroeffentlicht: spontanVeroeffentlicht,
              }
            : s
        )
      );
      resetSpontanForm();
    } catch (err) {
      console.error("Error updating spontane stunde:", err);
    }
  }

  async function deleteSpontaneStunde(id: string) {
    if (!window.confirm("Möchten Sie diese spontane Stunde wirklich löschen?")) {
      return;
    }
    try {
      const { error } = await supabase
        .from("spontane_stunden")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting spontane stunde:", error);
        return;
      }

      setSpontaneStunden((prev) => prev.filter((s) => s.id !== id));
      if (editingSpontanId === id) {
        resetSpontanForm();
      }
    } catch (err) {
      console.error("Error deleting spontane stunde:", err);
    }
  }

  async function toggleSpontanVeroeffentlicht(id: string, current: boolean) {
    try {
      const { error } = await supabase
        .from("spontane_stunden")
        .update({ veroeffentlicht: !current })
        .eq("id", id);

      if (error) {
        console.error("Error toggling veroeffentlicht:", error);
        return;
      }

      setSpontaneStunden((prev) =>
        prev.map((s) => (s.id === id ? { ...s, veroeffentlicht: !current } : s))
      );
    } catch (err) {
      console.error("Error toggling veroeffentlicht:", err);
    }
  }

  function startEditSpontaneStunde(s: SpontaneStunde) {
    setEditingSpontanId(s.id);
    setSpontanDatum(s.datum);
    setSpontanVon(s.uhrzeitVon);
    setSpontanBis(s.uhrzeitBis);
    setSpontanTrainerId(s.trainerId);
    setSpontanTarifId(s.tarifId || "");
    setSpontanCustomPreis(s.customPreisProStunde ?? "");
    setSpontanAnlage(s.anlage);
    setSpontanVeroeffentlicht(s.veroeffentlicht);
  }

  function resetSpontanForm() {
    setEditingSpontanId(null);
    setSpontanDatum(todayISO());
    setSpontanVon("14:00");
    setSpontanBis("15:00");
    setSpontanTrainerId(trainers[0]?.id ?? "");
    setSpontanTarifId("");
    setSpontanCustomPreis("");
    setSpontanAnlage("Wedding");
    setSpontanVeroeffentlicht(false);
  }

  async function uebernehmenSpontanBuchung(s: SpontaneStunde) {
    if (!s.buchung) return;

    const { name, email, telefon } = s.buchung;

    // Name splitten
    const parts = name.trim().split(/\s+/);
    const vorname = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || "Unbekannt";
    const nachname = parts.length > 1 ? parts[parts.length - 1] : undefined;

    // Prüfe ob Spieler mit gleicher Email existiert
    let spielerId: string;
    const existingSpieler = spieler.find(
      (sp) => sp.kontaktEmail?.toLowerCase() === email.toLowerCase()
    );

    if (existingSpieler) {
      spielerId = existingSpieler.id;
    } else {
      // Neuen Spieler erstellen
      const neuerSpieler: Spieler = {
        id: uid(),
        vorname,
        nachname,
        kontaktEmail: email,
        kontaktTelefon: telefon,
        notizen: "Spontanbuchung",
      };
      setSpieler((prev) => [...prev, neuerSpieler]);
      spielerId = neuerSpieler.id;
    }

    // Training erstellen
    const trainingId = uid();
    const neuesTraining: Training = {
      id: trainingId,
      trainerId: s.trainerId,
      datum: s.datum,
      uhrzeitVon: s.uhrzeitVon.slice(0, 5),
      uhrzeitBis: s.uhrzeitBis.slice(0, 5),
      spielerIds: [spielerId],
      tarifId: s.tarifId,
      customPreisProStunde: s.customPreisProStunde,
      status: "geplant",
      anlage: s.anlage,
      isSpontanBuchung: true,
    };
    setTrainings((prev) => [...prev, neuesTraining]);

    // Spontane Stunde mit Training-ID aktualisieren
    try {
      await supabase
        .from("spontane_stunden")
        .update({ training_id: trainingId })
        .eq("id", s.id);
    } catch (err) {
      console.error("Error updating training_id:", err);
    }

    // Lokalen State aktualisieren
    setSpontaneStunden((prev) =>
      prev.map((item) =>
        item.id === s.id ? { ...item, trainingId } : item
      )
    );

    alert(`Training für "${name}" wurde erstellt!`);
  }

  function adoptPlayerFromRequest(req: RegistrationRequest) {
    // Name splitten (einfache Heuristik: letztes Wort ist Nachname)
    const parts = req.name.trim().split(/\s+/);
    let vorname = "";
    let nachname = "";
    
    if (parts.length === 1) {
      vorname = parts[0];
    } else {
      nachname = parts.pop() || "";
      vorname = parts.join(" ");
    }

    setSpielerVorname(vorname);
    setSpielerNachname(nachname);
    setSpielerEmail(req.email);
    setSpielerTelefon(req.telefon || "");
    setSpielerNotizen(""); // Nachricht wird nicht als Notiz übernommen
    
    // Labels vorbereiten
    const newLabels: string[] = [];
    if (req.anlage) {
      newLabels.push(req.anlage); // "Wedding" oder "Britz"
    }
    setSpielerLabels(newLabels);
    
    // UI-State setzen
    setVerwaltungTab("spieler");
    setShowSpielerForm(true);
    setEditingSpielerId(null);
    setSpielerError(null);
    
    // Nach oben scrollen
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function adoptMultiplePlayersFromRequests() {
    const selectedReqs = registrationRequests.filter(r => selectedRequestIds.has(r.id));
    if (selectedReqs.length === 0) return;

    let addedCount = 0;
    let skippedCount = 0;

    selectedReqs.forEach((req) => {
      // Name splitten (einfache Heuristik: letztes Wort ist Nachname)
      const parts = req.name.trim().split(/\s+/);
      let vorname = "";
      let nachname = "";

      if (parts.length === 1) {
        vorname = parts[0];
      } else {
        nachname = parts.pop() || "";
        vorname = parts.join(" ");
      }

      // Duplikatscheck
      const fullNameLower = `${vorname} ${nachname}`.toLowerCase().trim();
      const duplicate = spieler.find((s) => {
        const existingFullName = `${s.vorname} ${s.nachname || ""}`.toLowerCase().trim();
        return existingFullName === fullNameLower;
      });

      if (duplicate) {
        skippedCount++;
        return;
      }

      // Labels vorbereiten
      const newLabels: string[] = [];
      if (req.anlage) {
        newLabels.push(req.anlage);
      }

      const neu: Spieler = {
        id: uid(),
        vorname,
        nachname: nachname || undefined,
        kontaktEmail: req.email || undefined,
        kontaktTelefon: req.telefon || undefined,
        labels: newLabels.length > 0 ? newLabels : undefined,
      };

      setSpieler((prev) => [...prev, neu]);
      addedCount++;
    });

    // Dialog schließen und Auswahl aufheben
    setShowAdoptConfirmDialog(false);
    setSelectedRequestIds(new Set());

    // Feedback anzeigen
    if (skippedCount > 0) {
      alert(`${addedCount} Spieler übernommen. ${skippedCount} übersprungen (bereits vorhanden).`);
    } else {
      alert(`${addedCount} Spieler erfolgreich übernommen!`);
    }
  }

  function toggleSpielerPick(id: string) {
    setTSpielerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }





  const trainingPreisGesamt = useCallback((t: Training) => {
    const cfg = getPreisConfig(t, tarifById);
    if (!cfg) return 0;

    if (cfg.abrechnung === "monatlich") return 0;

    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    const basis = cfg.preisProStunde * (mins / 60);

    if (cfg.abrechnung === "proSpieler") {
      return basis * t.spielerIds.length;
    }
    return basis;
  }, [tarifById]);

  const priceFuerSpieler = useCallback((t: Training) => {
    const cfg = getPreisConfig(t, tarifById);
    if (!cfg) return 0;

    if (cfg.abrechnung === "monatlich") return 0;

    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    const basis = cfg.preisProStunde * (mins / 60);

    if (cfg.abrechnung === "proSpieler") return basis;
    const n = Math.max(1, t.spielerIds.length);
    return basis / n;
  }, [tarifById]);

  const trainerHonorarFuerTraining = useCallback((t: Training) => {
    // Wenn eine Vertretung existiert, den Vertretungstrainer für Honorar verwenden
    const vertretung = vertretungen.find(v => v.trainingId === t.id);
    const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
    const trainer = trainerById.get(tid);
    const rate = trainer?.stundensatz ?? 0;
    const mins = durationMin(t.uhrzeitVon, t.uhrzeitBis);
    return round2(rate * (mins / 60));
  }, [vertretungen, trainerById, defaultTrainerId]);

  function fillTrainingFromSelected(t: Training) {
    if (isTrainer) return;
    // Wenn eine Vertretung existiert, den Vertretungstrainer übernehmen
    const vertretung = vertretungen.find(v => v.trainingId === t.id);
    const effectiveTrainerId = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
    setTTrainerId(effectiveTrainerId);
    setTDatum(t.datum);
    setTVon(t.uhrzeitVon);
    setTBis(t.uhrzeitBis);
    setTTarifId(t.tarifId ?? "");
    setTStatus(t.status);
    setTNotiz(t.notiz ?? "");
    setTSpielerIds(t.spielerIds);
    setSelectedTrainingId(t.id);
    setRepeatWeekly(false);
    setApplySerieScope("nurDieses");
    setTCustomPreisProStunde(
      typeof t.customPreisProStunde === "number" ? t.customPreisProStunde : ""
    );
    setTCustomAbrechnung(t.customAbrechnung ?? "proTraining");
    setTAnlage(t.anlage ?? "Wedding");
    setTab("training");
  }

  function resetTrainingForm() {
    setSelectedTrainingId(null);
    setTTrainerId(defaultTrainerId);
    setTDatum(todayISO());
    setTVon("16:00");
    setTBis("17:00");
    setTStatus("geplant");
    setTNotiz("");
    setSpielerSuche("");
    setTSpielerIds([]);
    setRepeatWeekly(false);
    setRepeatUntil("2026-03-28");
    setRepeatPeriods([]);
    setApplySerieScope("nurDieses");
    setTTarifId("");
    setTCustomPreisProStunde("");
    setTCustomAbrechnung("proTraining");
    setTAnlage("Wedding");
  }

  function deleteTraining(id: string) {
    if (isTrainer) return;
    const existing = trainings.find((t) => t.id === id);
    if (!existing) return;

    saveUndoSnapshot("Training gelöscht");

    // Bei Gruppentraining (mehr als 1 Spieler) mit monatlichem Tarif: Dialog öffnen
    const cfg = getPreisConfig(existing, tarifById);
    if (existing.spielerIds.length > 1 && cfg?.abrechnung === "monatlich") {
      setCancelTrainingDialog({ trainings: [existing], action: 'delete' });
      setCancelAdjustmentAmount("15");
      return;
    }

    if (existing.serieId && applySerieScope === "abHeute") {
      const sid = existing.serieId;
      const cutoff = existing.datum;
      setTrainings((prev) =>
        prev.filter((t) => !(t.serieId === sid && t.datum >= cutoff))
      );
    } else {
      setTrainings((prev) => prev.filter((t) => t.id !== id));
    }

    if (selectedTrainingId === id) {
      resetTrainingForm();
    }
  }

  function executeDeleteTrainings(trainingsList: Training[]) {
    saveUndoSnapshot(`${trainingsList.length} Training(s) gelöscht`);
    const idsToDelete = new Set(trainingsList.map((t) => t.id));
    setTrainings((prev) => prev.filter((t) => !idsToDelete.has(t.id)));
    if (selectedTrainingId && idsToDelete.has(selectedTrainingId)) {
      resetTrainingForm();
    }
  }

  function executeCancelTrainings(trainingsList: Training[]) {
    const idsToCancel = new Set(trainingsList.map((t) => t.id));
    setTrainings((prev) =>
      prev.map((t) =>
        idsToCancel.has(t.id) ? { ...t, status: "abgesagt" as TrainingStatus } : t
      )
    );
  }

  function applyAdjustmentsForTrainings(trainingsList: Training[], amountPerPlayer: number) {
    const newAdjustments = { ...monthlyAdjustments };

    // Ermittle den Monat des ersten Trainings in der Liste
    // Bei monatlichen Tarifen sollte die Erstattung nur für diesen einen Monat gelten
    const firstTraining = trainingsList[0];
    if (!firstTraining || !firstTraining.datum || firstTraining.datum.length < 7) return;

    const targetMonat = firstTraining.datum.substring(0, 7); // YYYY-MM

    // Safety check: ensure monat is valid YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(targetMonat)) return;

    // Sammle alle einzigartigen Spieler-IDs aus allen Trainings
    const uniqueSpielerIds = new Set<string>();
    trainingsList.forEach((training) => {
      training.spielerIds.forEach((spielerId) => uniqueSpielerIds.add(spielerId));
    });

    // Wende die Anpassung nur einmal pro Spieler für den Zielmonat an
    uniqueSpielerIds.forEach((spielerId) => {
      const key = `${targetMonat}__${spielerId}`;
      const currentValue = newAdjustments[key] ?? 0;
      newAdjustments[key] = round2(currentValue - amountPerPlayer);
    });

    setMonthlyAdjustments(newAdjustments);
  }

  function handleCancelDialogConfirm(withAdjustment: boolean) {
    if (!cancelTrainingDialog) return;

    const { trainings: affectedTrainings, action, fromSaveTraining } = cancelTrainingDialog;

    if (withAdjustment) {
      const amount = parseFloat(cancelAdjustmentAmount) || 0;
      if (amount > 0) {
        applyAdjustmentsForTrainings(affectedTrainings, amount);
      }
    }

    if (action === 'delete') {
      executeDeleteTrainings(affectedTrainings);
    } else if (fromSaveTraining) {
      // Wenn vom Training-Tab aufgerufen, saveTraining mit skipCancelCheck aufrufen
      setCancelTrainingDialog(null);
      setCancelAdjustmentAmount("15");
      saveTraining(true);
      return;
    } else {
      executeCancelTrainings(affectedTrainings);
    }

    setCancelTrainingDialog(null);
    setCancelAdjustmentAmount("15");
  }

  function toggleTrainingSelection(id: string) {
    setSelectedTrainingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function clearTrainingSelection() {
    setSelectedTrainingIds([]);
  }

  function batchUpdateStatusForSelected(newStatus: TrainingStatus) {
    if (isTrainer) return;
    if (selectedTrainingIds.length === 0) return;

    // Bei Status "abgesagt": Benachrichtigungs-Dialog anzeigen
    if (newStatus === "abgesagt") {
      const trainingsToCancel = trainings.filter((t) => selectedTrainingIds.includes(t.id));

      // Prüfen ob Spieler mit E-Mail vorhanden sind
      const hasPlayersWithEmail = trainingsToCancel.some((t) =>
        t.spielerIds.some((id) => spielerById.get(id)?.kontaktEmail)
      );

      if (hasPlayersWithEmail) {
        // Dialog anzeigen - Standardtext generieren
        const trainingDetails = trainingsToCancel.map((t) => {
          const [y, m, d] = t.datum.split("-");
          const germanDate = d && m && y ? `${d}.${m}.${y}` : t.datum;
          return { datum: germanDate, uhrzeit: `${t.uhrzeitVon} - ${t.uhrzeitBis}` };
        });

        const defaultSubject = trainingsToCancel.length === 1
          ? `Training am ${trainingDetails[0].datum} abgesagt`
          : `Trainingsabsage`;

        let defaultBody = `Hallo [Name],

leider müssen wir dir mitteilen, dass ${trainingsToCancel.length === 1 ? "dein Training" : "folgende Trainings"} abgesagt ${trainingsToCancel.length === 1 ? "wurde" : "wurden"}:

`;
        trainingDetails.forEach((t) => {
          defaultBody += `📅 ${t.datum} um ${t.uhrzeit} Uhr\n`;
        });
        defaultBody += `
Wir entschuldigen uns für die Unannehmlichkeiten.

Bei Fragen stehen wir dir gerne zur Verfügung.

Sportliche Grüße,
Deine Tennisschule`;

        setCancelNotifySubject(defaultSubject);
        setCancelNotifyBody(defaultBody);
        setCancelNotifyDialog({
          trainings: trainingsToCancel,
          onConfirm: () => {
            executeCancelTrainings(trainingsToCancel);
          }
        });
        clearTrainingSelection();
        return;
      }

      // Keine Spieler mit E-Mail - direkt absagen
      executeCancelTrainings(trainingsToCancel);
      clearTrainingSelection();
      return;
    }

    setTrainings((prev) =>
      prev.map((t) =>
        selectedTrainingIds.includes(t.id) ? { ...t, status: newStatus } : t
      )
    );
    if (newStatus === "durchgefuehrt") {
      selectedTrainingIds.forEach((id) => {
        triggerDonePulse(id);
      });
    }
    clearTrainingSelection();
  }

  function batchSetDurchgefuehrtUndBarBezahlt() {
    if (isTrainer) return;
    if (selectedTrainingIds.length === 0) return;
    
    setTrainings((prev) =>
      prev.map((t) =>
        selectedTrainingIds.includes(t.id)
          ? { ...t, status: "durchgefuehrt", barBezahlt: true }
          : t
      )
    );
    // Kein automatisches Setzen von payments - der Status wird über das Dropdown gesteuert
    
    selectedTrainingIds.forEach((id) => {
      triggerDonePulse(id);
    });
    clearTrainingSelection();
  }

  function batchDeleteSelectedTrainings() {
    if (isTrainer) return;
    if (selectedTrainingIds.length === 0) return;

    // Prüfen ob Gruppentrainings mit monatlichem Tarif dabei sind
    const gruppenTrainingsMonatlich = trainings.filter((t) => {
      if (!selectedTrainingIds.includes(t.id)) return false;
      if (t.spielerIds.length <= 1) return false;
      const cfg = getPreisConfig(t, tarifById);
      return cfg?.abrechnung === "monatlich";
    });
    if (gruppenTrainingsMonatlich.length > 0) {
      setCancelTrainingDialog({ trainings: gruppenTrainingsMonatlich, action: 'delete' });
      setCancelAdjustmentAmount("15");
      // Nicht betroffene Trainings direkt löschen
      const nichtBetroffen = selectedTrainingIds.filter(
        (id) => !gruppenTrainingsMonatlich.some((t) => t.id === id)
      );
      if (nichtBetroffen.length > 0) {
        setTrainings((prev) =>
          prev.filter((t) => !nichtBetroffen.includes(t.id))
        );
        setSelectedTrainingId((prev) =>
          prev && nichtBetroffen.includes(prev) ? null : prev
        );
      }
      clearTrainingSelection();
      return;
    }

    setTrainings((prev) =>
      prev.filter((t) => !selectedTrainingIds.includes(t.id))
    );
    setSelectedTrainingId((prev) =>
      prev && selectedTrainingIds.includes(prev) ? null : prev
    );
    clearTrainingSelection();
  }

  function batchChangeTrainerForSelected() {
    if (isTrainer) return;
    if (selectedTrainingIds.length === 0) return;
    const tid = batchTrainerId || defaultTrainerId;
    if (!tid) return;
    setTrainings((prev) =>
      prev.map((t) =>
        selectedTrainingIds.includes(t.id) ? { ...t, trainerId: tid } : t
      )
    );
    clearTrainingSelection();
  }

  function triggerDonePulse(trainingId: string) {
    setDoneFlashId(trainingId);
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setDoneFlashId((prev) => (prev === trainingId ? null : prev));
    }, 650);

    const el = document.querySelector(
      `[data-training-id="${trainingId}"]`
    ) as HTMLElement | null;
    if (el) {
      el.animate(
        [
          { transform: "scale(1)", filter: "brightness(1)" },
          { transform: "scale(1.06)", filter: "brightness(1.15)" },
          { transform: "scale(1)", filter: "brightness(1)" },
        ],
        { duration: 650, easing: "ease-out" }
      );
    }
  }

  function markTrainingDone(trainingId: string) {
    let changed = false;

    setTrainings((prev) =>
      prev.map((t) => {
        if (t.id !== trainingId) return t;
        if (t.status !== "geplant") return t;
        changed = true;
        return { ...t, status: "durchgefuehrt" };
      })
    );

    if (changed) triggerDonePulse(trainingId);
  }

  function markTrainingDoneAndBarBezahlt(trainingId: string) {
    if (isTrainer) return;
    
    const training = trainings.find((t) => t.id === trainingId);
    if (!training || training.status !== "geplant") return;
    
    setTrainings((prev) =>
      prev.map((t) => {
        if (t.id !== trainingId) return t;
        if (t.status !== "geplant") return t;
        return { ...t, status: "durchgefuehrt", barBezahlt: true };
      })
    );
    // Kein automatisches Setzen von payments - der Status wird über das Dropdown gesteuert

    triggerDonePulse(trainingId);
  }

  function goToToday() {
    const t = todayISO();
    setWeekAnchor(t);
    
    // Immer den aktuellen Wochentag setzen
    const d = new Date(t + "T12:00:00");
    const idx = (d.getDay() + 6) % 7;
    setDayIndex(idx);
  }

  function handleCalendarEventClick(t: Training, e: React.MouseEvent) {
    // Wenn Long-Press gerade ausgelöst wurde, nicht auch noch den Klick verarbeiten
    if (longPressTriggered) {
      setLongPressTriggered(false);
      return;
    }
    
    // Strg+Klick (Windows/Linux) oder Cmd+Klick (Mac) für Mehrfachauswahl
    if ((e.ctrlKey || e.metaKey) && !isTrainer) {
      e.preventDefault();
      e.stopPropagation();
      toggleTrainingSelection(t.id);
      return;
    }
    
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      fillTrainingFromSelected(t);
      clickTimerRef.current = null;
    }, 220);
  }
  
  function handleCalendarEventTouchStart(t: Training) {
    if (isTrainer) return;
    
    // Long-Press Timer starten (500ms)
    setLongPressTriggered(false);
    longPressTimerRef.current = window.setTimeout(() => {
      setLongPressTriggered(true);
      toggleTrainingSelection(t.id);
      // Vibration für haptisches Feedback (falls unterstützt)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  }
  
  function handleCalendarEventTouchEnd() {
    // Long-Press Timer abbrechen wenn Touch endet vor Ablauf
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }
  
  function handleCalendarEventTouchMove() {
    // Long-Press abbrechen bei Bewegung
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleCalendarEventDoubleClick(t: Training) {
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = null;
    markTrainingDone(t.id);
  }

  function saveTraining(skipCancelCheck?: boolean) {
    if (isTrainer) return;
    const hasTarif = !!tTarifId;
    const customPreis =
      !tTarifId &&
      typeof tCustomPreisProStunde === "number" &&
      tCustomPreisProStunde > 0
        ? tCustomPreisProStunde
        : undefined;

    if (!tDatum || !tVon || !tBis || tSpielerIds.length === 0) return;
    const mins = durationMin(tVon, tBis);
    if (mins <= 0) return;
    if (!hasTarif && !customPreis) return;
    const trainerIdForSave = tTrainerId || defaultTrainerId;
    if (!trainerIdForSave) return;

    const existing = selectedTrainingId
      ? trainings.find((x) => x.id === selectedTrainingId)
      : undefined;

    if (selectedTrainingId && existing) {
      saveUndoSnapshot("Training geändert");
      
      // Prüfen ob Status von "abgesagt" auf "geplant" geändert wird - Rücknahme des Abzugs anbieten
      if (
        !skipCancelCheck &&
        existing.status === "abgesagt" &&
        tStatus === "geplant"
      ) {
        // Prüfen ob es Abzüge für dieses Training gab
        const monat = existing.datum.substring(0, 7);
        const hasAdjustments = existing.spielerIds.some((spielerId) => {
          const key = `${monat}__${spielerId}`;
          return (monthlyAdjustments[key] ?? 0) < 0;
        });

        if (hasAdjustments) {
          setReverseAdjustmentDialog({
            training: existing,
            onConfirm: (reverseAdjustment) => {
              if (reverseAdjustment) {
                // Abzüge rückgängig machen (+15€ pro Spieler)
                const newAdjustments = { ...monthlyAdjustments };
                existing.spielerIds.forEach((spielerId) => {
                  const key = `${monat}__${spielerId}`;
                  const currentValue = newAdjustments[key] ?? 0;
                  newAdjustments[key] = round2(currentValue + 15);
                });
                setMonthlyAdjustments(newAdjustments);
              }
              // Training auf geplant setzen
              saveTraining(true);
            }
          });
          return;
        }
      }

      // Prüfen ob Status auf "abgesagt" geändert wird - Benachrichtigungs-Dialog anzeigen
      if (
        !skipCancelCheck &&
        existing.status !== "abgesagt" &&
        tStatus === "abgesagt"
      ) {
        const trainingForDialog: Training = {
          ...existing,
          trainerId: trainerIdForSave,
          datum: tDatum,
          uhrzeitVon: tVon,
          uhrzeitBis: tBis,
          tarifId: hasTarif ? tTarifId : undefined,
          spielerIds: tSpielerIds,
          status: tStatus,
          notiz: tNotiz.trim() || undefined,
          customPreisProStunde: customPreis,
          customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
        };

        // Prüfen ob Spieler mit E-Mail vorhanden sind
        const hasPlayersWithEmail = tSpielerIds.some((id) => spielerById.get(id)?.kontaktEmail);

        if (hasPlayersWithEmail) {
          // Standardtext generieren
          const [y, m, d] = tDatum.split("-");
          const germanDate = d && m && y ? `${d}.${m}.${y}` : tDatum;

          const defaultSubject = `Training am ${germanDate} abgesagt`;
          const defaultBody = `Hallo [Name],

leider müssen wir dir mitteilen, dass dein Training abgesagt wurde:

📅 ${germanDate} um ${tVon} - ${tBis} Uhr

Wir entschuldigen uns für die Unannehmlichkeiten.

Bei Fragen stehen wir dir gerne zur Verfügung.

Sportliche Grüße,
Deine Tennisschule`;

          setCancelNotifySubject(defaultSubject);
          setCancelNotifyBody(defaultBody);
          // Benachrichtigungs-Dialog anzeigen
          setCancelNotifyDialog({
            trainings: [trainingForDialog],
            onConfirm: () => {
              // Nach Bestätigung: Prüfen ob Gruppentraining mit monatlichem Tarif
              const cfgForCheck = getPreisConfig(existing, tarifById);
              if (
                tSpielerIds.length > 1 &&
                cfgForCheck?.abrechnung === "monatlich"
              ) {
                setCancelTrainingDialog({ trainings: [trainingForDialog], action: 'cancel', fromSaveTraining: true });
                setCancelAdjustmentAmount("15");
              } else {
                // Direkt absagen
                saveTraining(true);
              }
            }
          });
          return;
        }

        // Keine Spieler mit E-Mail - Prüfen ob Gruppentraining mit monatlichem Tarif
        const cfgForCheck = getPreisConfig(existing, tarifById);
        if (
          tSpielerIds.length > 1 &&
          cfgForCheck?.abrechnung === "monatlich"
        ) {
          setCancelTrainingDialog({ trainings: [trainingForDialog], action: 'cancel', fromSaveTraining: true });
          setCancelAdjustmentAmount("15");
          return;
        }
      }

      // Vertretungs-Logik prüfen
      const existingVertretung = vertretungen.find(v => v.trainingId === selectedTrainingId);
      const effectiveExistingTrainerId = existingVertretung?.vertretungTrainerId || existing.trainerId || defaultTrainerId;
      
      // Hat sich der Trainer gegenüber dem *aktuell angezeigten* (effektiven) Trainer geändert?
      const hasTrainerChanged = effectiveExistingTrainerId !== trainerIdForSave;

      // Bestimme die Trainer-ID für das Update
      // Wenn eine Vertretung existiert UND der Trainer im Formular nicht geändert wurde:
      // Behalte den ORIGINALEN Trainer bei (nicht den Vertretungstrainer in das Training-Objekt schreiben)
      let finalTrainerId = trainerIdForSave;
      if (existingVertretung && !hasTrainerChanged) {
        finalTrainerId = existing.trainerId || defaultTrainerId;
      }

      const payload: Training = {
        ...existing,
        trainerId: finalTrainerId,
        datum: tDatum,
        uhrzeitVon: tVon,
        uhrzeitBis: tBis,
        tarifId: hasTarif ? tTarifId : undefined,
        spielerIds: tSpielerIds,
        status: tStatus,
        notiz: tNotiz.trim() || undefined,
        customPreisProStunde: customPreis,
        customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
        anlage: tAnlage,
      };

      if (existing.serieId && applySerieScope === "abHeute") {
        const sid = existing.serieId;
        setTrainings((prev) =>
          prev.map((x) => {
            if (!x.serieId || x.serieId !== sid) return x;
            if (x.datum < existing.datum) return x;
            
            // Delta-Logik für Serie: Nur ändern was sich geändert hat
            // Besonders wichtig für Trainer: Nur überschreiben wenn explizit geändert
            
            return {
              ...x,
              // Trainer nur ändern wenn er explizit geändert wurde, sonst den jeweiligen Original-Trainer behalten
              trainerId: hasTrainerChanged ? payload.trainerId : x.trainerId, 
              
              uhrzeitVon: payload.uhrzeitVon,
              uhrzeitBis: payload.uhrzeitBis,
              tarifId: payload.tarifId,
              spielerIds: payload.spielerIds,
              status: payload.status,
              notiz: payload.notiz,
              customPreisProStunde: payload.customPreisProStunde,
              customAbrechnung: payload.customAbrechnung,
              anlage: payload.anlage,
            };
          })
        );
      } else {
        setTrainings((prev) =>
          prev.map((x) => (x.id === selectedTrainingId ? payload : x))
        );
      }

      // Vertretung löschen wenn Datum, Trainer oder Uhrzeit geändert wurde
      const datumChanged = existing.datum !== tDatum;
      const uhrzeitChanged = existing.uhrzeitVon !== tVon || existing.uhrzeitBis !== tBis;

      if (datumChanged || hasTrainerChanged || uhrzeitChanged) {
        if (existing.serieId && applySerieScope === "abHeute") {
          // Bei Serienänderung alle betroffenen Trainings
          const serieTrainingIds = trainings
            .filter((x) => x.serieId === existing.serieId && x.datum >= existing.datum)
            .map((x) => x.id);
          setVertretungen((prev) => prev.filter((v) => !serieTrainingIds.includes(v.trainingId)));
        } else {
          setVertretungen((prev) => prev.filter((v) => v.trainingId !== selectedTrainingId));
        }
      }

      resetTrainingForm();
      setTab("kalender");
      return;
    }

    if (repeatWeekly) {
      const periods = repeatPeriods.length > 0
        ? repeatPeriods.filter(p => p.von && p.bis && p.bis >= p.von)
        : [{ von: tDatum, bis: repeatUntil }];

      if (periods.length === 0) return;

      const serieId = uid();
      const created: Training[] = [];

      for (const period of periods) {
        let d = period.von;
        // Align to the same weekday as tDatum
        const startDay = new Date(tDatum + "T00:00:00").getDay();
        const periodDay = new Date(d + "T00:00:00").getDay();
        let diff = startDay - periodDay;
        if (diff < 0) diff += 7;
        if (diff > 0) d = addDaysISO(d, diff);

        while (d <= period.bis) {
          created.push({
            id: uid(),
            datum: d,
            uhrzeitVon: tVon,
            uhrzeitBis: tBis,
            trainerId: trainerIdForSave,
            tarifId: hasTarif ? tTarifId : undefined,
            spielerIds: tSpielerIds,
            status: tStatus,
            notiz: tNotiz.trim() || undefined,
            serieId,
            customPreisProStunde: customPreis,
            customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
            anlage: tAnlage,
          });
          d = addDaysISO(d, 7);
        }
      }

      setTrainings((prev) => [...prev, ...created]);
      resetTrainingForm();
      setTab("kalender");
      return;
    }

    setTrainings((prev) => [
      ...prev,
      {
        id: uid(),
        trainerId: trainerIdForSave,
        datum: tDatum,
        uhrzeitVon: tVon,
        uhrzeitBis: tBis,
        tarifId: hasTarif ? tTarifId : undefined,
        spielerIds: tSpielerIds,
        status: tStatus,
        notiz: tNotiz.trim() || undefined,
        customPreisProStunde: customPreis,
        customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
        anlage: tAnlage,
      },
    ]);

    resetTrainingForm();
    setTab("kalender");
  }

  const preisVorschau = useMemo(() => {
    if (tSpielerIds.length === 0) return 0;

    const hasTarif = !!tTarifId;
    const customPreis =
      !tTarifId &&
      typeof tCustomPreisProStunde === "number" &&
      tCustomPreisProStunde > 0
        ? tCustomPreisProStunde
        : undefined;

    if (!hasTarif && !customPreis) return 0;

    const fake: Training = {
      id: "x",
      trainerId: tTrainerId || defaultTrainerId,
      datum: tDatum,
      uhrzeitVon: tVon,
      uhrzeitBis: tBis,
      tarifId: hasTarif ? tTarifId : undefined,
      spielerIds: tSpielerIds,
      status: tStatus,
      notiz: tNotiz || undefined,
      customPreisProStunde: customPreis,
      customAbrechnung: !hasTarif ? tCustomAbrechnung : undefined,
    };

    return trainingPreisGesamt(fake);
  }, [
    tDatum,
    tVon,
    tBis,
    tTarifId,
    tSpielerIds,
    tStatus,
    tNotiz,
    tCustomPreisProStunde,
    tCustomAbrechnung,
    tTrainerId,
    defaultTrainerId,
    trainingPreisGesamt,
  ]);

  const trainingsInMonth = useMemo(
    () =>
      trainings
        .filter((t) => t.datum.startsWith(abrechnungMonat))
        .filter((t) => t.status === "durchgefuehrt")
        .filter((t) => {
          if (abrechnungTrainerFilter === "alle") return true;
          // Vertretungstrainer berücksichtigen
          const vertretung = vertretungen.find(v => v.trainingId === t.id);
          const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
          return tid === abrechnungTrainerFilter;
        })
        .sort((a, b) =>
          (a.datum + a.uhrzeitVon).localeCompare(b.datum + b.uhrzeitVon)
        ),
    [trainings, abrechnungMonat, abrechnungTrainerFilter, defaultTrainerId, vertretungen]
  );

  // Berechne für jeden Spieler, an welchen Wochentagen er wiederkehrende Trainings hat
  const spielerWochentage = useMemo(() => {
    const result = new Map<string, Set<number>>();
    trainingsInMonth.forEach((t) => {
      if (t.serieId) {
        const d = new Date(t.datum);
        const wochentag = (d.getDay() + 6) % 7; // 0=Montag, 6=Sonntag
        t.spielerIds.forEach((pid) => {
          if (!result.has(pid)) {
            result.set(pid, new Set());
          }
          result.get(pid)!.add(wochentag);
        });
      }
    });
    return result;
  }, [trainingsInMonth]);

  const trainingsForAbrechnung = useMemo(() => {
    let filtered = trainingsInMonth;

    if (abrechnungTab === "trainer") {
      if (abrechnungFilter === "bezahlt") {
        filtered = filtered.filter(
          (t) => t.barBezahlt || !!trainerPayments[t.id]
        );
      } else if (abrechnungFilter === "offen") {
        filtered = filtered.filter(
          (t) => !(t.barBezahlt || !!trainerPayments[t.id])
        );
      } else if (abrechnungFilter === "bar") {
        filtered = filtered.filter((t) => t.barBezahlt);
      }
    } else {
      if (abrechnungFilter === "bar") {
        filtered = filtered.filter((t) => t.barBezahlt);
      }
    }

    if (abrechnungTab === "spieler" && abrechnungSpielerSuche.trim()) {
      const q = abrechnungSpielerSuche.trim().toLowerCase();
      filtered = filtered.filter((t) =>
        t.spielerIds.some((sid) => {
          const s = spielerById.get(sid);
          return (
            s &&
            (s.vorname.toLowerCase().includes(q) ||
              (s.nachname ?? "").toLowerCase().includes(q) ||
              (s.kontaktEmail ?? "").toLowerCase().includes(q))
          );
        })
      );
    }

    return filtered;
  }, [
    trainingsInMonth,
    abrechnungFilter,
    abrechnungTab,
    trainerPayments,
    abrechnungSpielerSuche,
    spielerById,
  ]);

  const abrechnung = useMemo(() => {
    // 5c: Erweiterte Struktur für Bar/Nicht-Bar Unterscheidung
    const perSpieler = new Map<string, { 
      name: string; 
      sum: number; 
      countsBar: Map<number, number>;      // Beträge für bar bezahlte Trainings
      countsNichtBar: Map<number, number>; // Beträge für nicht bar bezahlte Trainings
    }>();
    // Für monatliche Tarife: Zähle die Anzahl wöchentlicher Trainings pro Spieler+Tarif
    const monthlyWeekdayCounts = new Map<string, Set<string>>(); // key: `${pid}__${tarifKey}`, value: Set von "weekday_timeFrom_timeTo"
    // Für monatliche Tarife: Tracke ob es Bar-Trainings gibt
    const monthlyHasBar = new Map<string, boolean>(); // key: `${pid}__${tarifKey}`

    // Ermittle die gesuchten Spieler-IDs bei aktiver Suche
    const searchQuery = abrechnungSpielerSuche.trim().toLowerCase();
    const searchedSpielerIds = searchQuery
      ? spieler
          .filter(
            (s) =>
              s.vorname.toLowerCase().includes(searchQuery) ||
              (s.nachname ?? "").toLowerCase().includes(searchQuery) ||
              (s.kontaktEmail ?? "").toLowerCase().includes(searchQuery)
          )
          .map((s) => s.id)
      : null; // null bedeutet keine Filterung

    const addShare = (pid: string, name: string, amount: number, isBar: boolean) => {
      const share = round2(amount);
      let entry = perSpieler.get(pid);
      if (!entry) {
        entry = { 
          name, 
          sum: 0, 
          countsBar: new Map<number, number>(),
          countsNichtBar: new Map<number, number>()
        };
        perSpieler.set(pid, entry);
      }
      entry.sum = round2(entry.sum + share);
      
      // 5c: Getrennte Zählung für Bar/Nicht-Bar
      if (isBar) {
        entry.countsBar.set(share, (entry.countsBar.get(share) ?? 0) + 1);
      } else {
        entry.countsNichtBar.set(share, (entry.countsNichtBar.get(share) ?? 0) + 1);
      }
    };

    // Erst alle monatlichen Trainings sammeln um Wochentage zu zählen
    trainingsForAbrechnung.forEach((t) => {
      const cfg = getPreisConfig(t, tarifById);
      if (!cfg) return;

      if (cfg.abrechnung === "monatlich") {
        const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
        const trainingDate = new Date(t.datum + "T12:00:00");
        const weekday = trainingDate.getDay(); // 0 = Sonntag, 1 = Montag, etc.

        t.spielerIds.forEach((pid) => {
          // Bei aktiver Suche nur gesuchte Spieler berücksichtigen
          if (searchedSpielerIds && !searchedSpielerIds.includes(pid)) return;

          const key = `${pid}__${tarifKey}`;
          const weekdays = monthlyWeekdayCounts.get(key) ?? new Set<string>();
          // Zähle Trainings nach Wochentag UND Uhrzeit (2 Trainings am selben Wochentag = 2 wöchentliche Trainings)
          weekdays.add(`${weekday}_${t.uhrzeitVon}_${t.uhrzeitBis}`);
          monthlyWeekdayCounts.set(key, weekdays);
          
          // Tracke ob mindestens ein monatliches Training bar ist
          if (t.barBezahlt) {
            monthlyHasBar.set(key, true);
          }
        });
      }
    });

    // Jetzt die Abrechnung durchführen
    const monthlyProcessed = new Set<string>(); // Um doppelte Verarbeitung zu vermeiden

    trainingsForAbrechnung.forEach((t) => {
      const cfg = getPreisConfig(t, tarifById);
      if (!cfg) return;

      if (cfg.abrechnung === "monatlich") {
        const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
        t.spielerIds.forEach((pid) => {
          // Bei aktiver Suche nur gesuchte Spieler berücksichtigen
          if (searchedSpielerIds && !searchedSpielerIds.includes(pid)) return;
          
          const processKey = `${pid}__${tarifKey}`;
          if (monthlyProcessed.has(processKey)) return;
          monthlyProcessed.add(processKey);
          
          const name = getSpielerFullName(pid);
          const weekdayCount = monthlyWeekdayCounts.get(processKey)?.size ?? 1;
          const totalAmount = cfg.preisProStunde * weekdayCount;
          const isBar = monthlyHasBar.get(processKey) ?? false;
          addShare(pid, name, totalAmount, isBar);
        });
        return;
      }

      const share = priceFuerSpieler(t);
      const isBar = t.barBezahlt === true;
      t.spielerIds.forEach((pid) => {
        // Bei aktiver Suche nur gesuchte Spieler berücksichtigen
        if (searchedSpielerIds && !searchedSpielerIds.includes(pid)) return;
        
        const name = getSpielerFullName(pid);
        addShare(pid, name, share, isBar);
      });
    });

    const spielerRows = Array.from(perSpieler.entries())
      .map(([id, v]) => {
        // 5c: Getrennte Breakdowns für Bar und Nicht-Bar
        const breakdownBar = Array.from(v.countsBar.entries())
          .map(([amount, count]) => ({
            amount,
            count,
            subtotal: round2(amount * count),
            isBar: true,
          }))
          .sort((a, b) => b.amount - a.amount);

        const breakdownNichtBar = Array.from(v.countsNichtBar.entries())
          .map(([amount, count]) => ({
            amount,
            count,
            subtotal: round2(amount * count),
            isBar: false,
          }))
          .sort((a, b) => b.amount - a.amount);

        // Kombiniertes Breakdown für Kompatibilität (ohne isBar Info)
        const allCounts = new Map<number, number>();
        v.countsBar.forEach((count, amount) => {
          allCounts.set(amount, (allCounts.get(amount) ?? 0) + count);
        });
        v.countsNichtBar.forEach((count, amount) => {
          allCounts.set(amount, (allCounts.get(amount) ?? 0) + count);
        });
        const breakdown = Array.from(allCounts.entries())
          .map(([amount, count]) => ({
            amount,
            count,
            subtotal: round2(amount * count),
          }))
          .sort((a, b) => b.amount - a.amount);

        return {
          id,
          name: v.name,
          sum: round2(v.sum),
          breakdown,
          breakdownBar,
          breakdownNichtBar,
        };
      })
      .sort((a, b) => b.sum - a.sum);

    const total = round2(spielerRows.reduce((sum, r) => sum + r.sum, 0));

    // Bar-Total aus den gefilterten spielerRows berechnen (nicht aus trainingsInMonth)
    // damit es korrekt auf den ausgewählten Spieler gefiltert ist
    let barTotal = 0;
    spielerRows.forEach((row) => {
      row.breakdownBar.forEach((item) => {
        barTotal = round2(barTotal + item.subtotal);
      });
    });

    // totalMitBar ist jetzt identisch mit total, da barTotal bereits in total enthalten ist
    // (die spielerRows enthalten bereits alle Beträge inkl. bar)
    // Für die korrekte Anzeige: total ist die Gesamtsumme, barTotal zeigt nur den Bar-Anteil
    const totalMitBar = total; // Bar ist bereits in total enthalten

    return { total, spielerRows, barTotal, totalMitBar };
  }, [
    trainingsForAbrechnung,
    spieler,
    priceFuerSpieler,
    tarifById,
    abrechnungSpielerSuche,
    getSpielerFullName,
  ]);

  const abrechnungTrainer = useMemo(() => {
    type TrainerAbrechnungSummary = {
      name: string;
      sum: number;
      trainings: number;
      honorar: number;
      honorarBezahlt: number;
      honorarOffen: number;
    };

    const perTrainer = new Map<string, TrainerAbrechnungSummary>();
    // Für monatliche Tarife: Zähle die Anzahl wöchentlicher Trainings pro Trainer+Spieler+Tarif
    const monthlyTrainerWeekdays = new Map<string, Set<string>>(); // key: `${tid}__${pid}__${tarifKey}`

    // Erst alle monatlichen Trainings sammeln um Wochentage zu zählen
    trainingsForAbrechnung.forEach((t) => {
      const cfg = getPreisConfig(t, tarifById);
      if (!cfg || cfg.abrechnung !== "monatlich") return;

      // Vertretungstrainer berücksichtigen
      const vertretung = vertretungen.find(v => v.trainingId === t.id);
      const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
      const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
      const trainingDate = new Date(t.datum + "T12:00:00");
      const weekday = trainingDate.getDay();

      t.spielerIds.forEach((pid) => {
        const key = `${tid}__${pid}__${tarifKey}`;
        const weekdays = monthlyTrainerWeekdays.get(key) ?? new Set<string>();
        // Zähle Trainings nach Wochentag UND Uhrzeit
        weekdays.add(`${weekday}_${t.uhrzeitVon}_${t.uhrzeitBis}`);
        monthlyTrainerWeekdays.set(key, weekdays);
      });
    });

    const monthlyTrainerProcessed = new Set<string>();

    trainingsForAbrechnung.forEach((t) => {
      // Vertretungstrainer berücksichtigen
      const vertretung = vertretungen.find(v => v.trainingId === t.id);
      const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
      const name = trainerById.get(tid)?.name ?? "Trainer";
      const cfg = getPreisConfig(t, tarifById);
      if (!cfg) return;

      const honorar = trainerHonorarFuerTraining(t);
      let entry =
        perTrainer.get(tid) ?? {
          name,
          sum: 0,
          trainings: 0,
          honorar: 0,
          honorarBezahlt: 0,
          honorarOffen: 0,
        };

      if (cfg.abrechnung === "monatlich") {
        const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
        t.spielerIds.forEach((pid) => {
          const processKey = `${tid}__${pid}__${tarifKey}`;
          if (monthlyTrainerProcessed.has(processKey)) return;
          monthlyTrainerProcessed.add(processKey);
          
          const weekdayCount = monthlyTrainerWeekdays.get(processKey)?.size ?? 1;
          entry.sum = round2(entry.sum + cfg.preisProStunde * weekdayCount);
        });
      } else {
        const amount = round2(trainingPreisGesamt(t));
        entry.sum = round2(entry.sum + amount);
      }

      entry.trainings += 1;
      entry.honorar = round2(entry.honorar + honorar);

      const paid = t.barBezahlt || !!trainerPayments[t.id];
      if (paid) {
        entry.honorarBezahlt = round2(entry.honorarBezahlt + honorar);
      } else {
        entry.honorarOffen = round2(entry.honorarOffen + honorar);
      }

      perTrainer.set(tid, entry);
    });

    const rows = Array.from(perTrainer.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.sum - a.sum);

    const total = round2(rows.reduce((acc, r) => acc + r.sum, 0));
    const totalHonorar = round2(rows.reduce((acc, r) => acc + r.honorar, 0));
    const totalHonorarBezahlt = round2(
      rows.reduce((acc, r) => acc + r.honorarBezahlt, 0)
    );
    const totalHonorarOffen = round2(
      rows.reduce((acc, r) => acc + r.honorarOffen, 0)
    );

    return {
      total,
      rows,
      totalHonorar,
      totalHonorarBezahlt,
      totalHonorarOffen,
    };
  }, [
    defaultTrainerId,
    trainerById,
    trainingsForAbrechnung,
    tarifById,
    trainerHonorarFuerTraining,
    trainingPreisGesamt,
    vertretungen,
    trainerPayments,
  ]);

  function togglePaidForPlayer(monat: string, spielerId: string) {
    if (isTrainer) return;
    const key = paymentKey(monat, spielerId);
    setPayments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }



  function closePayConfirm() {
    setPayConfirm(null);
  }

  function confirmPay() {
    if (!payConfirm) return;
    togglePaidForPlayer(payConfirm.monat, payConfirm.spielerId);
    setPayConfirm(null);
  }

  function toggleTrainerPaid(trainingId: string) {
    if (isTrainer) return;
    setTrainerPayments((prev) => ({
      ...prev,
      [trainingId]: !prev[trainingId],
    }));
  }

  function toggleBarBezahlt(trainingId: string) {
    if (isTrainer) return;
    
    // Finde das Training um zu prüfen ob wir auf true oder false setzen
    const training = trainings.find((t) => t.id === trainingId);
    if (!training) return;
    
    const newBarBezahlt = !training.barBezahlt;
    
    setTrainings((prev) =>
      prev.map((t) =>
        t.id === trainingId ? { ...t, barBezahlt: newBarBezahlt } : t
      )
    );
    // Kein automatisches Setzen von payments - der Status wird über das Dropdown gesteuert
  }

  /* ::::: Notiz-Funktionen ::::: */

  function addNotiz() {
    const titel = notizTitel.trim();
    if (!titel) return;

    const now = new Date().toISOString();
    const neu: Notiz = {
      id: uid(),
      titel,
      inhalt: notizInhalt.trim(),
      erstelltAm: now,
      aktualisiertAm: now,
    };

    setNotizen((prev) => [neu, ...prev]);
    setNotizTitel("");
    setNotizInhalt("");
    setShowNotizForm(false);
  }

  function startEditNotiz(n: Notiz) {
    setEditingNotizId(n.id);
    setNotizTitel(n.titel);
    setNotizInhalt(n.inhalt);
    setShowNotizForm(true);
  }

  function saveNotiz() {
    if (!editingNotizId) return;
    const titel = notizTitel.trim();
    if (!titel) return;

    setNotizen((prev) =>
      prev.map((n) =>
        n.id === editingNotizId
          ? {
              ...n,
              titel,
              inhalt: notizInhalt.trim(),
              aktualisiertAm: new Date().toISOString(),
            }
          : n
      )
    );

    setEditingNotizId(null);
    setNotizTitel("");
    setNotizInhalt("");
    setShowNotizForm(false);
  }

  function deleteNotiz(id: string) {
    setNotizen((prev) => prev.filter((n) => n.id !== id));
    if (editingNotizId === id) {
      setEditingNotizId(null);
      setNotizTitel("");
      setNotizInhalt("");
      setShowNotizForm(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setAuthUser(null);
    setInitialSynced(false);
    setProfileFinished(false);
  }

  // Hilfsfunktion: Berechnet die Bar-Summe für einen Spieler im Monat
  const getSumBarForSpieler = useCallback(
    (spielerId: string) => {
      let sumBar = 0;
      
      // Für monatliche Tarife: Tracke ob ein monatlicher Betrag bereits gezählt wurde
      const monthlyProcessedForBar = new Set<string>();
      
      trainingsInMonth.forEach((t) => {
        if (!t.barBezahlt) return;
        if (!t.spielerIds.includes(spielerId)) return;
        
        const cfg = getPreisConfig(t, tarifById);
        if (!cfg) return;
        
        if (cfg.abrechnung === "monatlich") {
          // Bei monatlichen Tarifen: Nur einmal pro Tarif+Spieler zählen
          const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
          const processKey = `${spielerId}__${tarifKey}`;
          if (monthlyProcessedForBar.has(processKey)) return;
          monthlyProcessedForBar.add(processKey);
          
          // Für monatliche Tarife: Anzahl wöchentlicher Trainings ermitteln
          const weekdays = new Set<string>();
          trainingsInMonth.forEach((t2) => {
            if (!t2.spielerIds.includes(spielerId)) return;
            const cfg2 = getPreisConfig(t2, tarifById);
            if (!cfg2 || cfg2.abrechnung !== "monatlich") return;
            const tarifKey2 = t2.tarifId || `custom-${cfg2.preisProStunde}`;
            if (tarifKey2 !== tarifKey) return;
            const trainingDate = new Date(t2.datum + "T12:00:00");
            // Zähle Trainings nach Wochentag UND Uhrzeit
            weekdays.add(`${trainingDate.getDay()}_${t2.uhrzeitVon}_${t2.uhrzeitBis}`);
          });
          
          sumBar = round2(sumBar + cfg.preisProStunde * weekdays.size);
        } else {
          // Für normale Tarife: Anteil pro Spieler berechnen
          const share = priceFuerSpieler(t);
          sumBar = round2(sumBar + share);
        }
      });
      
      return sumBar;
    },
    [trainingsInMonth, tarifById, priceFuerSpieler]
  );

  // Bar/Nicht-Bar Trainings für Admin-Ansicht (wenn ein Trainer gefiltert ist)
  const adminTrainerTrainings = useMemo(() => {
    if (abrechnungTrainerFilter === "alle") return [];
    return trainingsForAbrechnung.filter((t) => {
      const vertretung = vertretungen.find(v => v.trainingId === t.id);
      const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
      return tid === abrechnungTrainerFilter;
    });
  }, [trainingsForAbrechnung, abrechnungTrainerFilter, vertretungen, defaultTrainerId]);

  const adminBarTrainings = useMemo(() => adminTrainerTrainings.filter((t) => t.barBezahlt), [adminTrainerTrainings]);
  const adminNichtBarTrainings = useMemo(() => adminTrainerTrainings.filter((t) => !t.barBezahlt), [adminTrainerTrainings]);

  // Bar-Abrechnung Key für Trainer
  const trainerBarSettledKey = useCallback((month: string, trainerId: string) => `${month}__${trainerId}__bar`, []);

    if (authLoading || profileLoading || !initialSynced) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: 60 }}>
          Synchronisiere Daten mit der Cloud ...
        </div>
      </div>
    );
  }


  if (!authUser) {
    return <AuthScreen />;
  }

  // Hilfsfunktion: Ermittle Status für einen Spieler
  const getSpielerStatus = (spielerId: string, sum: number): "komplett_bar" | "teilweise_bar" | "komplett_abgerechnet" | "offen" | "keine_trainings" => {
    const key = paymentKey(abrechnungMonat, spielerId);
    const paymentsFlag = payments[key] ?? false;
    const sumBarSpieler = getSumBarForSpieler(spielerId);
    const sumTotalSpieler = sum;
    
    if (sumTotalSpieler === 0) return "keine_trainings";
    if (sumBarSpieler === sumTotalSpieler) return "komplett_bar";
    if (sumBarSpieler > 0 && sumBarSpieler < sumTotalSpieler) {
      return paymentsFlag ? "komplett_abgerechnet" : "teilweise_bar";
    }
    return paymentsFlag ? "komplett_abgerechnet" : "offen";
  };

  // Hilfsfunktion um den Anpassungsbetrag eines Spielers zu ermitteln
  const getAdjustmentForSpieler = (spielerId: string): number => {
    const adjustmentKey = `${abrechnungMonat}__${spielerId}`;
    return monthlyAdjustments[adjustmentKey] ?? 0;
  };

  const getAdjustedSum = (spielerId: string, baseSum: number): number => {
    const adjustment = getAdjustmentForSpieler(spielerId);
    // Anpassung zur Basissumme addieren (Anpassungen sind i.d.R. negativ bei Absagen)
    return round2(baseSum + adjustment);
  };

  const filteredSpielerRowsForMonth = abrechnung.spielerRows.filter((r) => {
    const adjustedSum = getAdjustedSum(r.id, r.sum);
    const status = getSpielerStatus(r.id, adjustedSum);
    const isBezahlt = status === "komplett_bar" || status === "komplett_abgerechnet";

    // Tagesfilter prüfen
    if (abrechnungTagFilter !== "alle") {
      const tagNum = parseInt(abrechnungTagFilter, 10);
      const spielerTage = spielerWochentage.get(r.id);
      if (!spielerTage || !spielerTage.has(tagNum)) {
        return false;
      }
    }

    // Abgebucht-Filter prüfen
    if (abrechnungAbgebuchtFilter !== "alle") {
      const istAbgebucht = wirdAbgebucht[`${abrechnungMonat}__${r.id}`] ?? false;
      if (abrechnungAbgebuchtFilter === "abgebucht" && !istAbgebucht) return false;
      if (abrechnungAbgebuchtFilter === "nicht_abgebucht" && istAbgebucht) return false;
    }

    if (abrechnungFilter === "alle") return true;
    if (abrechnungFilter === "bezahlt") return isBezahlt;
    if (abrechnungFilter === "offen") return !isBezahlt;
    if (abrechnungFilter === "bar") return status === "komplett_bar" || status === "teilweise_bar";
    return true;
  });

  const sumBezahlt = round2(
    abrechnung.spielerRows.reduce((acc, r) => {
      const adjustedSum = getAdjustedSum(r.id, r.sum);
      const status = getSpielerStatus(r.id, adjustedSum);
      const isBezahlt = status === "komplett_bar" || status === "komplett_abgerechnet";
      return acc + (isBezahlt ? adjustedSum : 0);
    }, 0)
  );

  const sumOffen = round2(
    abrechnung.spielerRows.reduce((acc, r) => {
      const adjustedSum = getAdjustedSum(r.id, r.sum);
      const status = getSpielerStatus(r.id, adjustedSum);
      const isBezahlt = status === "komplett_bar" || status === "komplett_abgerechnet";
      return acc + (!isBezahlt ? adjustedSum : 0);
    }, 0)
  );

  const trainerHonorarBezahltTotal = abrechnungTrainer.totalHonorarBezahlt;
  const trainerHonorarOffenTotal = abrechnungTrainer.totalHonorarOffen;

  const eigeneTrainerRow = abrechnungTrainer.rows.find(
    (r) => r.id === ownTrainerId
  );

  const eigenerHonorarBezahlt = eigeneTrainerRow?.honorarBezahlt ?? 0;
  const eigenerHonorarOffen = eigeneTrainerRow?.honorarOffen ?? 0;

  const rueckzahlungTrainerOffen = round2(
    trainingsForAbrechnung.reduce((acc, t) => {
      // Vertretungstrainer berücksichtigen
      const vertretung = vertretungen.find(v => v.trainingId === t.id);
      const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
      // Berücksichtige den Trainerfilter: wenn "alle" gewählt ist, alle Trainer einbeziehen
      if (abrechnungTrainerFilter !== "alle" && tid !== abrechnungTrainerFilter) return acc;
      if (!t.barBezahlt) return acc;
      const cfg = getPreisConfig(t, tarifById);
      if (!cfg || cfg.abrechnung === "monatlich") return acc;
      const priceNum = round2(trainingPreisGesamt(t));
      const honorarNum = trainerHonorarFuerTraining(t);
      const diff = round2(priceNum - honorarNum);
      return diff > 0 ? acc + diff : acc;
    }, 0)
  );

  // Effektive Rückzahlung (0 wenn bar-abgerechnet)
  const effectiveRueckzahlung = abrechnungTrainerFilter !== "alle" &&
    trainerBarSettled[trainerBarSettledKey(abrechnungMonat, abrechnungTrainerFilter)]
    ? 0
    : rueckzahlungTrainerOffen;

  const eigeneTrainingsImMonat = trainings.filter((t) => {
    if (t.status !== "durchgefuehrt") return false;
    if (!t.datum.startsWith(abrechnungMonat)) return false;
    // Vertretungstrainer berücksichtigen
    const vertretung = vertretungen.find(v => v.trainingId === t.id);
    const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
    return tid === ownTrainerId;
  });

  const nichtBarTrainings = eigeneTrainingsImMonat.filter(
    (t) => !t.barBezahlt
  );
  const barTrainings = eigeneTrainingsImMonat.filter((t) => t.barBezahlt);

  return (
    <>
      <div className="appShell">
        <header className="mobileTopBar">
          <button
            className="iconButton"
            onClick={() => setIsSideNavOpen((v) => !v)}
            aria-label="Navigation öffnen"
          >
            <span className="iconBar" />
            <span className="iconBar" />
            <span className="iconBar" />
          </button>

          <div className="mobileTopTitle">
            <div className="mobileTopMain">Tennistrainer Planung</div>
            <div className="mobileTopSub">
              {roleLabel} · {tab === "kalender" ? kalenderTrainerFilterLabel : trainerFilterLabel}
            </div>
          </div>
        </header>

        <aside className={`sideNav ${isSideNavOpen ? "sideNavOpen" : ""}`}>
          <div className="sideNavHeader">
            <div className="sideTitle">Tennistrainer Planung</div>
            {!isTrainer && (
              <div className="sideSubtitle">
                Mehrere Trainer, wiederkehrende Termine, Tarife pro Stunde.
              </div>
            )}
          </div>

          <span className="pill sideRolePill">
            Rolle: <strong>{roleLabel}</strong>
          </span>

          {isTrainer && ownTrainerId && trainerById.get(ownTrainerId)?.notiz && (
            <div className="card cardInset" style={{ margin: "12px 0", padding: 12 }}>
              <strong>Notiz:</strong>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                {trainerById.get(ownTrainerId)?.notiz}
              </div>
            </div>
          )}

          <nav className="sideTabs">
            {visibleTabs.map((t) => (
              <button
                key={t}
                className={`tabBtn sideTabBtn ${
                  tab === t ? "tabBtnActive" : ""
                }`}
                onClick={() => {
                  setTab(t);
                  setIsSideNavOpen(false);
                }}
              >
                {t === "kalender" && "Kalender"}
                {t === "training" && "Training"}
                {t === "verwaltung" && "Verwaltung"}
                {t === "formulare" && (
                  <>
                    Formulare
                    {(registrationRequests.filter(r => r.status === "neu").length + sepaMandates.filter(m => (m.status || "neu") === "neu").length) > 0 && (
                      <span style={{
                        marginLeft: 6,
                        background: "var(--danger)",
                        color: "white",
                        borderRadius: "50%",
                        width: 18,
                        height: 18,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        {registrationRequests.filter(r => r.status === "neu").length + sepaMandates.filter(m => (m.status || "neu") === "neu").length}
                      </span>
                    )}
                  </>
                )}
                {t === "abrechnung" && "Abrechnung"}
                {t === "weiteres" && "Weiteres"}
              </button>
            ))}
          </nav>

          <button className="btn btnGhost sideLogout" onClick={handleLogout}>
            Logout ({authUser.email ?? "ohne Email"})
          </button>
        </aside>

        {isSideNavOpen && (
          <div
            className="sideNavOverlay"
            onClick={() => setIsSideNavOpen(false)}
          />
        )}

        <main className="mainArea">
          <div className="container">
            <div className="header">
              <div className="hTitle">
                <h1>Tennistrainer Planung</h1>
                {!isTrainer && (
                  <p>
                    Mehrere Trainer, wiederkehrende Termine, Tarife pro Stunde,
                    pro Benutzer gespeichert.
                  </p>
                )}
              </div>
            </div>

            {tab === "kalender" && (
              <div className="card">
                {/* Oberer Bereich: Einstellungen (collapsed auf Mobile) */}
                <div className="calendarSettings">
                  <div className="row">
                    <div className="field" style={{ minWidth: 220 }}>
                      <label>Woche springen</label>
                      <input
                        type="date"
                        value={weekAnchor}
                        onChange={(e) => setWeekAnchor(e.target.value)}
                      />
                    </div>

                    {!isTrainer && trainers.length > 1 && (
                      <div className="field" style={{ minWidth: 200, position: "relative" }}>
                        <label>Trainer Filter</label>
                        <button
                          type="button"
                          className="dropdownToggle"
                          onClick={() => setShowTrainerDropdown(!showTrainerDropdown)}
                        >
                          {kalenderTrainerFilter.length === 0
                            ? "Alle Trainer"
                            : kalenderTrainerFilter.length === 1
                              ? trainerById.get(kalenderTrainerFilter[0])?.name
                              : `${kalenderTrainerFilter.length} Trainer`}
                          <span className="dropdownArrow">▼</span>
                        </button>
                        {showTrainerDropdown && (
                          <div className="dropdownMenu">
                            {trainers.map((tr) => (
                              <label key={tr.id} className="dropdownItem">
                                <input
                                  type="checkbox"
                                  checked={kalenderTrainerFilter.includes(tr.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setKalenderTrainerFilter([...kalenderTrainerFilter, tr.id]);
                                    } else {
                                      setKalenderTrainerFilter(kalenderTrainerFilter.filter(id => id !== tr.id));
                                    }
                                  }}
                                />
                                {tr.name}
                              </label>
                            ))}
                            {kalenderTrainerFilter.length > 0 && (
                              <button
                                type="button"
                                className="dropdownReset"
                                onClick={() => setKalenderTrainerFilter([])}
                              >
                                Auswahl zurücksetzen
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {!isTrainer && (
                      <span className="pill">
                        Trainer gesamt: <strong>{trainers.length}</strong>
                      </span>
                    )}

                    {!isTrainer && (
                      <button
                        className="btn"
                        onClick={() => {
                          resetTrainingForm();
                          setTab("training");
                        }}
                      >
                        Neues Training
                      </button>
                    )}

                    <button
                      className="btn btnGhost"
                      onClick={() => {
                        setWeekPdfDate(weekStart);
                        setShowWeekPdfModal(true);
                      }}
                    >
                      Wochenplan PDF
                    </button>
                  </div>
                </div>

                {/* Batch-Aktionen für ausgewählte Trainings */}
                {!isTrainer && selectedTrainingIds.length > 0 && (
                  <div className="card cardInset" style={{ marginBottom: 12, marginTop: 12 }}>
                    <div
                      className="row"
                      style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}
                    >
                      <span className="pill">
                        Ausgewählte Trainings:{" "}
                        <strong>{selectedTrainingIds.length}</strong>
                      </span>
                      <button
                        className="btn micro"
                        onClick={() =>
                          batchUpdateStatusForSelected("durchgefuehrt")
                        }
                      >
                        Alle durchgeführt
                      </button>
                      <button
                        className="btn micro"
                        style={{
                          backgroundColor: "#8b5cf6",
                          borderColor: "#8b5cf6",
                        }}
                        onClick={batchSetDurchgefuehrtUndBarBezahlt}
                      >
                        Alle durchgeführt + bar
                      </button>
                      <button
                        className="btn micro"
                        onClick={() =>
                          batchUpdateStatusForSelected("geplant")
                        }
                      >
                        Alle geplant
                      </button>
                      <button
                        className="btn micro"
                        style={{
                          backgroundColor: "#ef4444",
                          borderColor: "#ef4444",
                        }}
                        onClick={() =>
                          batchUpdateStatusForSelected("abgesagt")
                        }
                      >
                        Alle abgesagt
                      </button>
                      <button
                        className="btn micro btnWarn"
                        onClick={batchDeleteSelectedTrainings}
                      >
                        Alle löschen
                      </button>
                      <div className="field" style={{ minWidth: 180 }}>
                        <label>Trainer für Auswahl</label>
                        <select
                          value={batchTrainerId}
                          onChange={(e) => setBatchTrainerId(e.target.value)}
                        >
                          <option value="">Standardtrainer</option>
                          {trainers.map((tr) => (
                            <option key={tr.id} value={tr.id}>
                              {tr.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="btn micro"
                        onClick={batchChangeTrainerForSelected}
                      >
                        Trainer übernehmen
                      </button>
                      <button
                        className="btn micro btnGhost"
                        onClick={clearTrainingSelection}
                      >
                        Auswahl aufheben
                      </button>
                    </div>
                  </div>
                )}

                {/* Kalender-Navigation - direkt über dem Grid */}
                <div className="calendarNavCompact">
                  <div className="calendarNavRow">
                    <button
                      className="navArrowBtn"
                      onClick={() => {
                        if (viewMode === "day") {
                          const newIndex = (dayIndex + 7 - 1) % 7;
                          setDayIndex(newIndex);
                          if (newIndex === 6) {
                            setWeekAnchor(addDaysISO(weekStart, -7));
                          }
                        } else {
                          setWeekAnchor(addDaysISO(weekStart, -7));
                        }
                      }}
                      aria-label="Vorheriger Zeitraum"
                    >
                      ‹
                    </button>
                    
                    <div className="calendarNavCenter">
                      <span className="calendarWeekLabel">
                        {viewMode === "day" 
                          ? formatShort(weekDays[dayIndex]) + " " + weekDays[dayIndex].split("-")[0]
                          : formatWeekRange(weekStart)
                        }
                      </span>
                      <div className="viewModeToggle">
                        <button
                          className={`viewModeBtn ${viewMode === "week" ? "viewModeBtnActive" : ""}`}
                          onClick={() => setViewMode("week")}
                        >
                          Woche
                        </button>
                        <button
                          className={`viewModeBtn ${viewMode === "day" ? "viewModeBtnActive" : ""}`}
                          onClick={() => setViewMode("day")}
                        >
                          Tag
                        </button>
                      </div>
                    </div>

                    <button
                      className="navArrowBtn"
                      onClick={() => {
                        if (viewMode === "day") {
                          const newIndex = (dayIndex + 1) % 7;
                          setDayIndex(newIndex);
                          if (newIndex === 0) {
                            setWeekAnchor(addDaysISO(weekStart, 7));
                          }
                        } else {
                          setWeekAnchor(addDaysISO(weekStart, 7));
                        }
                      }}
                      aria-label="Nächster Zeitraum"
                    >
                      ›
                    </button>
                  </div>
                  
                  <button className="todayBtnCompact" onClick={goToToday}>
                    Heute
                  </button>
                </div>

                {/* Swipe-Hinweis für Mobile */}
                <div className="swipeHint">
                  <span>← Wischen für Navigation →</span>
                </div>

                {/* Trainer-Filter für Mobile (nur Hauptaccount) */}
                {!isTrainer && trainers.length > 1 && (
                  <div className="mobileTrainerFilter" style={{ position: "relative" }}>
                    <button
                      type="button"
                      className="dropdownToggle"
                      onClick={() => setShowTrainerDropdown(!showTrainerDropdown)}
                    >
                      {kalenderTrainerFilter.length === 0
                        ? "Alle Trainer"
                        : kalenderTrainerFilter.length === 1
                          ? trainerById.get(kalenderTrainerFilter[0])?.name
                          : `${kalenderTrainerFilter.length} Trainer`}
                      <span className="dropdownArrow">▼</span>
                    </button>
                    {showTrainerDropdown && (
                      <div className="dropdownMenu">
                        {trainers.map((tr) => (
                          <label key={tr.id} className="dropdownItem">
                            <input
                              type="checkbox"
                              checked={kalenderTrainerFilter.includes(tr.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setKalenderTrainerFilter([...kalenderTrainerFilter, tr.id]);
                                } else {
                                  setKalenderTrainerFilter(kalenderTrainerFilter.filter(id => id !== tr.id));
                                }
                              }}
                            />
                            {tr.name}
                          </label>
                        ))}
                        {kalenderTrainerFilter.length > 0 && (
                          <button
                            type="button"
                            className="dropdownReset"
                            onClick={() => setKalenderTrainerFilter([])}
                          >
                            Auswahl zurücksetzen
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div 
                  className={`kgrid ${viewMode === "day" ? "kgridDay" : ""}`}
                  onTouchStart={calendarSwipeHandlers.onTouchStart}
                  onTouchMove={calendarSwipeHandlers.onTouchMove}
                  onTouchEnd={calendarSwipeHandlers.onTouchEnd}
                >
                  <div className="kHead">
                    <div className="kHeadCell">Zeit</div>
                    {(viewMode === "week" ? weekDays : [weekDays[dayIndex]]).map(
                      (d) => (
                        <div key={d} className="kHeadCell">
                          {formatShort(d)}
                        </div>
                      )
                    )}
                  </div>

                  <div className="kBody">
                    <div className="kTimeCol">
                      {hours.map((h) => (
                        <div key={h} className="kTime">
                          {pad2(h)}:00
                        </div>
                      ))}
                    </div>

                    {(viewMode === "week" ? weekDays : [weekDays[dayIndex]]).map(
                      (day) => {
                        const dayEvents = trainingsInWeek.filter(
                          (t) => t.datum === day
                        );
                        const startMin = 7 * 60;

                        // Überlappende Trainings für parallele Darstellung gruppieren
                        const groupedEvents: Training[][] = [];
                        dayEvents.forEach((training) => {
                          const startA = toMinutes(training.uhrzeitVon);
                          const endA = toMinutes(training.uhrzeitBis);

                          let placed = false;
                          for (const group of groupedEvents) {
                            const hasOverlap = group.some((t) => {
                              const startB = toMinutes(t.uhrzeitVon);
                              const endB = toMinutes(t.uhrzeitBis);
                              return startA < endB && endA > startB;
                            });

                            if (hasOverlap) {
                              group.push(training);
                              placed = true;
                              break;
                            }
                          }

                          if (!placed) {
                            groupedEvents.push([training]);
                          }
                        });

                        return (
                          <div key={day} className="kDayCol">
                            {hours.map((h) => (
                              <div key={h} className="kHourLine" />
                            ))}

                            {dayEvents.map((t) => {
                              const top =
                                Math.max(
                                  0,
                                  (toMinutes(t.uhrzeitVon) - startMin) / 60
                                ) * 40;
                              const height = Math.max(
                                26,
                                ((toMinutes(t.uhrzeitBis) -
                                  toMinutes(t.uhrzeitVon)) /
                                  60) *
                                  40
                              );
                              const tarif = t.tarifId
                                ? tarifById.get(t.tarifId)
                                : undefined;
                              const ta = tarif
                                ? tarif.abrechnung === "monatlich"
                                  ? `${tarif.name} (monatlich ${tarif.preisProStunde} EUR)`
                                  : tarif.name
                                : t.customPreisProStunde
                                ? `Individuell (${t.customPreisProStunde} EUR pro Stunde)`
                                : "Tarif";
                              const sp = t.spielerIds
                                .map(
                                  (id) =>
                                    getSpielerDisplayName(id)
                                )
                                .join(", ");
                              const trainerName =
                                trainerById.get(
                                  t.trainerId ?? defaultTrainerId
                                )?.name ?? "Trainer";

                              // Vertretung prüfen
                              const trainingVertretung = vertretungen.find((v) => v.trainingId === t.id);
                              const vertretungTrainerObj = trainingVertretung?.vertretungTrainerId
                                ? trainerById.get(trainingVertretung.vertretungTrainerId)
                                : null;
                              const isVertretungOffen = trainingVertretung && !trainingVertretung.vertretungTrainerId;

                              const taLine = isTrainer
                                ? `Trainer: ${trainerName}`
                                : trainers.length > 1
                                ? trainingVertretung
                                  ? isVertretungOffen
                                    ? `${ta} | (V offen)`
                                    : `${ta} | ${vertretungTrainerObj?.name ?? "Vertretung"} (V)`
                                  : `${ta} | ${trainerName}`
                                : ta;

                              const isDone = t.status === "durchgefuehrt";
                              const isCancel = t.status === "abgesagt";
                              const isPulse = doneFlashId === t.id;
                              const hasVertretung = !!trainingVertretung;

                              const isSelected = selectedTrainingIds.includes(
                                t.id
                              );

                              // Ausgewählte Trainings haben eine violette Hintergrundfarbe
                              // Vertretungen bekommen einen roten Rand + "V"
                              const bg = isSelected
                                ? "rgba(139, 92, 246, 0.35)"
                                : isDone
                                ? "rgba(34, 197, 94, 0.22)"
                                : isCancel
                                ? "rgba(239, 68, 68, 0.14)"
                                : "rgba(59, 130, 246, 0.18)";
                              const border = hasVertretung
                                ? isVertretungOffen ? "rgba(220, 38, 38, 0.8)" : "rgba(34, 197, 94, 0.8)"
                                : isSelected
                                ? "rgba(139, 92, 246, 0.6)"
                                : isDone
                                ? "rgba(34, 197, 94, 0.45)"
                                : isCancel
                                ? "rgba(239, 68, 68, 0.34)"
                                : "rgba(59, 130, 246, 0.30)";

                              // Position für überlappende Trainings berechnen
                              let groupSize = 1;
                              let indexInGroup = 0;

                              for (const group of groupedEvents) {
                                if (group.includes(t)) {
                                  groupSize = group.length;
                                  indexInGroup = group.indexOf(t);
                                  break;
                                }
                              }

                              const widthPercent =
                                groupSize > 1 ? 100 / groupSize : 100;
                              const leftPercent =
                                groupSize > 1 ? indexInGroup * widthPercent : 0;

                              return (
                                <div
                                  key={t.id}
                                  data-training-id={t.id}
                                  className="kEvent"
                                  style={{
                                    top,
                                    height,
                                    width: `${widthPercent}%`,
                                    left: `${leftPercent}%`,
                                    backgroundColor: bg,
                                    border: hasVertretung ? `2px solid ${border}` : `1px solid ${border}`,
                                    opacity: isCancel ? 0.85 : 1,
                                    transform: isPulse
                                      ? "scale(1.06)"
                                      : undefined,
                                    filter: isPulse
                                      ? "brightness(1.15)"
                                      : undefined,
                                    transition:
                                      "transform 160ms ease, filter 160ms ease, background-color 180ms ease, border-color 180ms ease",
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    overflow: "hidden",
                                    padding: 8,
                                    gap: 6,
                                  }}
                                  onClick={(e) => handleCalendarEventClick(t, e)}
                                  onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCalendarEventDoubleClick(t);
                                  }}
                                  onTouchStart={() => handleCalendarEventTouchStart(t)}
                                  onTouchEnd={handleCalendarEventTouchEnd}
                                  onTouchMove={handleCalendarEventTouchMove}
                                  title={`Spieler: ${sp}\nZeit: ${t.uhrzeitVon} bis ${
                                    t.uhrzeitBis
                                  }${
                                    isTrainer ? "" : `\nTarif: ${ta}`
                                  }\nTrainer: ${trainerName}${
                                    hasVertretung
                                      ? `\nVertretung: ${isVertretungOffen ? "offen" : vertretungTrainerObj?.name ?? "Vertretung"}`
                                      : ""
                                  }\nStatus: ${statusLabel(
                                    t.status
                                  )}`}
                                >
                                  <div
                                    style={{
                                      flex: "1 1 auto",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {sp}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 11,
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {taLine}
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
                                    {t.isSpontanBuchung && (
                                      <span
                                        style={{
                                          fontSize: 8,
                                          fontWeight: 700,
                                          background: "#eab308",
                                          color: "white",
                                          padding: "1px 3px",
                                          borderRadius: 2,
                                        }}
                                      >
                                        S
                                      </span>
                                    )}
                                    {hasVertretung && (
                                      <span
                                        style={{
                                          fontSize: 8,
                                          fontWeight: 700,
                                          background: isVertretungOffen ? "#dc2626" : "#22c55e",
                                          color: "white",
                                          padding: "1px 3px",
                                          borderRadius: 2,
                                        }}
                                      >
                                        V
                                      </span>
                                    )}
                                    <div
                                      style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: "999px",
                                        border: "2px solid white",
                                        boxShadow:
                                          "0 0 0 1px rgba(15,23,42,0.15)",
                                        backgroundColor: statusDotColor(t.status),
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                <div style={{ height: 12 }} />
                {!isTrainer && (
                  <div className="muted">
                    Hinweis: Klick: Bearbeiten, Doppelklick: Abschließen. Mehrfachauswahl: Strg+Klick (PC) oder lange gedrückt halten (Handy).
                  </div>
                )}
              </div>
            )}

            {tab === "training" &&
              (isTrainer ? (
                <div className="card">
                  <h2>Nur Lesen für Trainer</h2>
                  <p className="muted">
                    Trainings können nur vom Hauptaccount angelegt oder
                    bearbeitet werden.
                  </p>
                </div>
              ) : (
                <div className="grid2">
                  <div className="card">
                    <h2>
                      {selectedTrainingId
                        ? "Training bearbeiten"
                        : "Training anlegen"}
                    </h2>
                    <div className="row">
                      <div className="field">
                        <label>Datum</label>
                        <input
                          type="date"
                          value={tDatum}
                          onChange={(e) => setTDatum(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Von</label>
                        <input
                          type="time"
                          value={tVon}
                          onChange={(e) => {
                            const newVon = e.target.value;
                            setTVon(newVon);
                            // Automatisch Endzeit auf +60 Minuten setzen
                            const vonMinutes = toMinutes(newVon);
                            const bisMinutes = vonMinutes + 60;
                            const bisH = Math.floor(bisMinutes / 60);
                            const bisM = bisMinutes % 60;
                            setTBis(`${pad2(bisH)}:${pad2(bisM)}`);
                          }}
                        />
                      </div>
                      <div className="field">
                        <label>Bis</label>
                        <input
                          type="time"
                          value={tBis}
                          onChange={(e) => setTBis(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Trainer</label>
                        <select
                          value={tTrainerId}
                          disabled={isTrainer}
                          onChange={(e) => setTTrainerId(e.target.value)}
                        >
                          {trainerOptionsForSelect.map((tr) => (
                            <option key={tr.id} value={tr.id}>
                              {tr.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Anlage</label>
                        <select
                          value={tAnlage}
                          onChange={(e) => setTAnlage(e.target.value)}
                        >
                          <option value="Wedding">Wedding</option>
                          <option value="Britz">Britz</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field">
                        <label>Tarif (optional)</label>
                        <select
                          value={tTarifId}
                          onChange={(e) => setTTarifId(e.target.value)}
                        >
                          <option value="">
                            Kein Tarif ausgewählt
                          </option>
                          {tarife.map((t) => {
                            const beschreibung =
                              t.abrechnung === "monatlich"
                                ? `${t.preisProStunde} EUR monatlich`
                                : `${t.preisProStunde} EUR pro Stunde, ${
                                    t.abrechnung === "proSpieler"
                                      ? "pro Spieler"
                                      : "pro Training"
                                  }`;
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name}, {beschreibung}
                              </option>
                            );
                          })}
                        </select>
                        <div className="muted">
                          Entweder einen Tarif auswählen oder unten einen
                          individuellen Preis pro Stunde eingeben.
                        </div>
                      </div>

                      <div className="field">
                        <label>Status</label>
                        <select
                          value={tStatus}
                          onChange={(e) =>
                            setTStatus(e.target.value as TrainingStatus)
                          }
                        >
                          <option value="geplant">Geplant</option>
                          <option value="durchgefuehrt">Durchgeführt</option>
                          <option value="abgesagt">Abgesagt</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field">
                        <label>Individueller Preis pro Stunde</label>
                        <input
                          type="number"
                          value={
                            tCustomPreisProStunde === ""
                              ? ""
                              : tCustomPreisProStunde
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "") {
                              setTCustomPreisProStunde("");
                            } else {
                              const n = Number(v);
                              setTCustomPreisProStunde(
                                Number.isFinite(n) ? n : ""
                              );
                            }
                          }}
                          placeholder="z.B. 60"
                          disabled={!!tTarifId}
                        />
                      </div>
                      <div className="field">
                        <label>Individuelle Abrechnung</label>
                        <select
                          value={tCustomAbrechnung}
                          onChange={(e) =>
                            setTCustomAbrechnung(
                              e.target.value as "proTraining" | "proSpieler"
                            )
                          }
                          disabled={!!tTarifId}
                        >
                          <option value="proTraining">Pro Training</option>
                          <option value="proSpieler">Pro Spieler</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field" style={{ minWidth: 260 }}>
                        <label>Notiz</label>
                        <input
                          value={tNotiz}
                          onChange={(e) => setTNotiz(e.target.value)}
                          placeholder="optional"
                        />
                      </div>
                    </div>

                    <div style={{ height: 10 }} />

                    {!selectedTrainingId && (
                      <div className="card cardInset">
                        <h2>Wiederholung</h2>
                        <div className="row">
                          <label
                            className="pill"
                            style={{ cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={repeatWeekly}
                              onChange={(e) =>
                                setRepeatWeekly(e.target.checked)
                              }
                              style={{ marginRight: 8 }}
                            />
                            Wöchentlich wiederholen
                          </label>
                          {repeatPeriods.length === 0 && (
                            <div className="field" style={{ minWidth: 220 }}>
                              <label>Bis Datum</label>
                              <input
                                type="date"
                                value={repeatUntil}
                                onChange={(e) =>
                                  setRepeatUntil(e.target.value)
                                }
                                disabled={!repeatWeekly}
                              />
                            </div>
                          )}
                          <span className="pill">
                            Trainer: <strong>{selectedTrainerName}</strong>
                          </span>
                        </div>

                        {repeatWeekly && repeatPeriods.length > 0 && (
                          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                            {repeatPeriods.map((period, idx) => (
                              <div key={idx} className="row" style={{ alignItems: "end" }}>
                                <div className="field" style={{ minWidth: 180 }}>
                                  <label>Zeitraum {idx + 1} – Von</label>
                                  <input
                                    type="date"
                                    value={period.von}
                                    onChange={(e) => {
                                      const updated = [...repeatPeriods];
                                      updated[idx] = { ...updated[idx], von: e.target.value };
                                      setRepeatPeriods(updated);
                                    }}
                                  />
                                </div>
                                <div className="field" style={{ minWidth: 180 }}>
                                  <label>Bis</label>
                                  <input
                                    type="date"
                                    value={period.bis}
                                    onChange={(e) => {
                                      const updated = [...repeatPeriods];
                                      updated[idx] = { ...updated[idx], bis: e.target.value };
                                      setRepeatPeriods(updated);
                                    }}
                                  />
                                </div>
                                <button
                                  className="btn btnWarn"
                                  style={{ padding: "6px 12px", minWidth: "auto" }}
                                  onClick={() => {
                                    setRepeatPeriods(repeatPeriods.filter((_, i) => i !== idx));
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {repeatWeekly && (
                          <div style={{ marginTop: 8 }}>
                            <button
                              className="btn btnGhost"
                              style={{ padding: "4px 12px", fontSize: 13 }}
                              onClick={() => {
                                const lastPeriod = repeatPeriods[repeatPeriods.length - 1];
                                const newVon = lastPeriod ? addDaysISO(lastPeriod.bis, 1) : tDatum;
                                const newBis = repeatPeriods.length === 0 ? repeatUntil : addDaysISO(newVon, 90);
                                setRepeatPeriods([...repeatPeriods, { von: newVon, bis: newBis }]);
                              }}
                            >
                              + Zeitraum hinzufügen
                            </button>
                          </div>
                        )}

                        <div className="muted" style={{ marginTop: 6 }}>
                          {repeatPeriods.length > 0
                            ? `Trainings werden wöchentlich in ${repeatPeriods.length} Zeiträumen angelegt (z.B. Ferien auslassen).`
                            : "Wenn aktiv: Es werden alle Termine wöchentlich bis zum Bis Datum angelegt."}
                        </div>
                      </div>
                    )}

                    {selectedTrainingId &&
                      (() => {
                        const ex = trainings.find(
                          (x) => x.id === selectedTrainingId
                        );
                        if (!ex?.serieId) return null;
                        return (
                          <div className="card cardInset">
                            <h2>Serie bearbeiten</h2>
                            <div className="row">
                              <div className="field">
                                <label>Änderungen anwenden</label>
                                <select
                                  value={applySerieScope}
                                  onChange={(e) =>
                                    setApplySerieScope(
                                      e.target.value as
                                        | "nurDieses"
                                        | "abHeute"
                                    )
                                  }
                                >
                                  <option value="nurDieses">
                                    Nur diesen Termin
                                  </option>
                                  <option value="abHeute">
                                    Alle Termine der Serie ab diesem Datum
                                  </option>
                                </select>
                              </div>
                              <span className="pill">
                                Serie:{" "}
                                <strong>{ex.serieId.slice(0, 8)}</strong>
                              </span>
                            </div>
                            <div className="muted">
                              Bei ab diesem Datum: Uhrzeiten, Spieler, Tarif,
                              Status und Notiz werden für alle zukünftigen
                              Termine übernommen. Beim Löschen mit dieser Option
                              werden alle zukünftigen Termine der Serie entfernt.
                            </div>
                          </div>
                        );
                      })()}

                    <div style={{ height: 10 }} />

                    <div className="row">
                      <button className="btn" onClick={() => saveTraining()}>
                        {selectedTrainingId
                          ? "Änderungen speichern"
                          : "Training speichern"}
                      </button>
                      <button
                        className="btn btnGhost"
                        onClick={() => {
                          resetTrainingForm();
                          setTab("kalender");
                        }}
                      >
                        Zurück zum Kalender
                      </button>
                      {selectedTrainingId && (
                        <button
                          className="btn btnWarn"
                          onClick={() => deleteTraining(selectedTrainingId)}
                        >
                          Training löschen
                        </button>
                      )}
                      {tSpielerIds.length > 0 && tSpielerIds.some(id => spielerById.get(id)?.kontaktEmail) && (
                        <button
                          className="btn"
                          style={{
                            backgroundColor: "#0891b2",
                            borderColor: "#0891b2",
                          }}
                          onClick={() => {
                            const trainerName = trainerById.get(tTrainerId)?.name ?? "Trainer";
                            const datum = new Date(tDatum + "T12:00:00");
                            const wochentag = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][datum.getDay()];
                            const sepaLink = tAnlage === "Britz"
                              ? `${window.location.origin}/sepa-britz`
                              : `${window.location.origin}/sepa`;

                            setTrainingInfoEmailSubject(`Trainingszeit Sommer 2026`);
                            setTrainingInfoEmailBody(
`Hallo {SPIELERNAME},

hiermit informiere ich dich über dein Training für die Sommersaison:

Tag: ${wochentag}
Uhrzeit: ${tVon} - ${tBis} Uhr
Trainer: ${trainerName}
Teilnehmer: {ANDERE_TEILNEHMER}
Startdatum: Erste Woche nach den Osterferien

Für die Abrechnung erteile uns bitte vor dem ersten Training ein SEPA-Lastschriftmandat:
${sepaLink}

Solltest du dies schon in einer vorherigen Saison erledigt haben, so kann dieses wieder benutzt werden und eine neue Erteilung ist nicht nötig.

In den Sommerferien findet das Training nur nach vorheriger Absprache statt, dazu wird es ein separates Tool geben. Nach den Sommerferien geht das Tennistraining dann regulär weiter.

Einige Gruppen (z.B. 20-21 Uhr) können aufgrund von Lichtverhältnissen zur späteren Sommerzeit nicht durchgeführt werden. Mit den Spielern dieser späten Gruppen wird rechtzeitig für die betroffene Zeit ein Ersatztermin vereinbart.

Eine Vereinsmitgliedschaft ist für die regelmäßige Teilnahme Voraussetzung.

Eine Rückbestätigung der Trainingszeit ist nicht nötig. Solltest du Fragen haben, so antworte bitte auf diese E-Mail.

Sportliche Grüße
Trainerteam A bis Z`
                            );
                            setShowTrainingInfoEmail(true);
                          }}
                        >
                          Spieler informieren
                        </button>
                      )}
                      {selectedTrainingId && tStatus === "geplant" && (
                        <button
                          className="btn"
                          style={{
                            backgroundColor: "#8b5cf6",
                            borderColor: "#8b5cf6",
                          }}
                          onClick={() => {
                            markTrainingDoneAndBarBezahlt(selectedTrainingId);
                            resetTrainingForm();
                            setTab("kalender");
                          }}
                        >
                          Durchgeführt + bar
                        </button>
                      )}
                      {selectedTrainingId && tStatus === "durchgefuehrt" && (
                        <button
                          className="btn"
                          style={{
                            backgroundColor: trainings.find(t => t.id === selectedTrainingId)?.barBezahlt ? "#f97316" : "#8b5cf6",
                            borderColor: trainings.find(t => t.id === selectedTrainingId)?.barBezahlt ? "#f97316" : "#8b5cf6",
                          }}
                          onClick={() => toggleBarBezahlt(selectedTrainingId)}
                        >
                          {trainings.find(t => t.id === selectedTrainingId)?.barBezahlt
                            ? "Bar-Zahlung zurücknehmen"
                            : "Als bar bezahlt markieren"}
                        </button>
                      )}
                      <span className="pill">
                        Preis Vorschau:{" "}
                        <strong>{euro(preisVorschau)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="card">
                    <h2>Spieler auswählen</h2>
                    <div className="row">
                      <div className="field" style={{ flex: 1 }}>
                        <label>Spieler hinzufügen</label>
                        <input
                          value={spielerSuche}
                          onChange={(e) => setSpielerSuche(e.target.value)}
                          placeholder="Suche nach Name oder Email..."
                        />
                      </div>
                      <span className="pill">
                        Ausgewählt:{" "}
                        <strong>{tSpielerIds.length}</strong>
                      </span>
                    </div>

                    {/* Dropdown-Liste nur wenn Suche aktiv */}
                    {spielerSuche.trim() && (
                      <div style={{ 
                        maxHeight: 200, 
                        overflowY: "auto", 
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        marginTop: 8,
                        background: "var(--bg-card)"
                      }}>
                        {filteredSpielerForPick
                          .filter((s) => !tSpielerIds.includes(s.id))
                          .slice()
                          .sort((a, b) => getFullName(a).localeCompare(getFullName(b)))
                          .map((s) => (
                          <div
                            key={s.id}
                            style={{
                              padding: "10px 14px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border-light)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                            onClick={() => {
                              toggleSpielerPick(s.id);
                              setSpielerSuche("");
                            }}
                          >
                            <div>
                              <strong>{getFullName(s)}</strong>
                              {s.kontaktEmail && (
                                <span className="muted" style={{ marginLeft: 8 }}>
                                  {s.kontaktEmail}
                                </span>
                              )}
                            </div>
                            <span style={{ color: "var(--primary)", fontSize: 12 }}>
                              + Hinzufügen
                            </span>
                          </div>
                        ))}
                        {filteredSpielerForPick.filter((s) => !tSpielerIds.includes(s.id)).length === 0 && (
                          <div style={{ padding: "10px 14px", color: "var(--text-muted)" }}>
                            Keine Spieler gefunden
                          </div>
                        )}
                      </div>
                    )}

                    {/* Dropdown ohne Suche - alle verfügbaren Spieler */}
                    {!spielerSuche.trim() && (
                      <div className="field" style={{ marginTop: 8 }}>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              toggleSpielerPick(e.target.value);
                            }
                          }}
                          style={{ width: "100%" }}
                        >
                          <option value="">Spieler auswählen...</option>
                          {spieler
                            .filter((s) => !tSpielerIds.includes(s.id))
                            .slice()
                            .sort((a, b) => getFullName(a).localeCompare(getFullName(b)))
                            .map((s) => (
                            <option key={s.id} value={s.id}>
                              {getFullName(s)}{s.kontaktEmail ? ` (${s.kontaktEmail})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Ausgewählte Spieler anzeigen */}
                    {tSpielerIds.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div className="muted" style={{ marginBottom: 8 }}>Ausgewählte Spieler:</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {tSpielerIds.map((id) => {
                            const s = spielerById.get(id);
                            if (!s) return null;
                            return (
                              <span
                                key={id}
                                className="pill"
                                style={{ 
                                  display: "inline-flex", 
                                  alignItems: "center", 
                                  gap: 6,
                                  background: "rgba(34, 197, 94, 0.15)",
                                  color: "#15803d"
                                }}
                              >
                                {getDisplayName(s)}
                                <button
                                  type="button"
                                  onClick={() => toggleSpielerPick(id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    fontSize: 14,
                                    lineHeight: 1,
                                    color: "#991b1b"
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

            {tab === "verwaltung" && !isTrainer && (
              <>
                <div className="subTabs">
                  <button
                    className={`tabBtn ${
                      verwaltungTab === "trainer" ? "tabBtnActive" : ""
                    }`}
                    onClick={() => setVerwaltungTab("trainer")}
                  >
                    Trainer
                  </button>
                  <button
                    className={`tabBtn ${
                      verwaltungTab === "spieler" ? "tabBtnActive" : ""
                    }`}
                    onClick={() => setVerwaltungTab("spieler")}
                  >
                    Spieler
                  </button>
                  <button
                    className={`tabBtn ${
                      verwaltungTab === "tarife" ? "tabBtnActive" : ""
                    }`}
                    onClick={() => setVerwaltungTab("tarife")}
                  >
                    Tarife
                  </button>
                  <button
                    className={`tabBtn ${
                      verwaltungTab === "newsletter" ? "tabBtnActive" : ""
                    }`}
                    onClick={() => setVerwaltungTab("newsletter")}
                  >
                    Newsletter
                  </button>
                </div>

                <div style={{ height: 12 }} />

                {verwaltungTab === "trainer" && (
                  <div className="card">
                    <h2>Trainer verwalten</h2>
                    
                    <ul className="list">
                      {trainers.map((t) => (
                        <li key={t.id} className="listItem">
                          <div>
                            <strong>{t.name}</strong>
                            {t.email && (
                              <div className="muted">{t.email}</div>
                            )}
                            <div className="muted">
                              Honorar: {euro(t.stundensatz ?? 0)} pro Stunde
                            </div>
                          </div>
                          <div className="smallActions">
                            <button
                              className="btn micro btnGhost"
                              onClick={() => {
                                startEditTrainer(t);
                                setShowTrainerForm(true);
                              }}
                            >
                              Bearbeiten
                            </button>
                            {trainers.length > 1 && (
                              <button
                                className="btn micro btnWarn"
                                onClick={() => deleteTrainer(t.id)}
                              >
                                Löschen
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {!showTrainerForm && !editingTrainerId && (
                      <div style={{ marginTop: 16 }}>
                        <button
                          className="btn"
                          onClick={() => setShowTrainerForm(true)}
                        >
                          Neuen Trainer hinzufügen
                        </button>
                      </div>
                    )}

                    {(showTrainerForm || editingTrainerId) && (
                      <div className="card cardInset" style={{ marginTop: 16 }}>
                        <h3>{editingTrainerId ? "Trainer bearbeiten" : "Neuen Trainer hinzufügen"}</h3>
                        <div className="row">
                          <div className="field">
                            <label>Name</label>
                            <input
                              value={trainerName}
                              onChange={(e) => setTrainerName(e.target.value)}
                              placeholder="z.B. Jesper"
                            />
                          </div>
                          <div className="field">
                            <label>Nachname</label>
                            <input
                              value={trainerNachname}
                              onChange={(e) => setTrainerNachname(e.target.value)}
                              placeholder="Mustermann"
                            />
                          </div>
                          <div className="field">
                            <label>Email</label>
                            <input
                              value={trainerEmail}
                              onChange={(e) => setTrainerEmail(e.target.value)}
                              placeholder="z.B. trainer@example.com"
                            />
                          </div>
                          <div className="field">
                            <label>Stundensatz Trainer Honorar</label>
                            <input
                              type="number"
                              value={
                                trainerStundensatz === ""
                                  ? ""
                                  : trainerStundensatz
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") {
                                  setTrainerStundensatz("");
                                } else {
                                  const n = Number(v);
                                  setTrainerStundensatz(
                                    Number.isFinite(n) ? n : ""
                                  );
                                }
                              }}
                              placeholder="z.B. 20"
                            />
                          </div>
                        </div>
                        <div className="field" style={{ marginTop: 8 }}>
                          <label>Notiz für Trainer</label>
                          <textarea
                            rows={3}
                            value={trainerNotiz}
                            onChange={(e) => setTrainerNotiz(e.target.value)}
                            placeholder="Interne Notiz für diesen Trainer..."
                          />
                        </div>
                        <div className="field" style={{ marginTop: 8 }}>
                          <label>Rechnungsadresse des Trainers</label>
                          <textarea
                            rows={3}
                            value={trainerAdresse}
                            onChange={(e) => setTrainerAdresse(e.target.value)}
                            placeholder="Max Mustermann&#10;Musterstraße 123&#10;12345 Berlin"
                          />
                        </div>
                        <div className="row" style={{ marginTop: 8 }}>
                          <div className="field">
                            <label>IBAN</label>
                            <input
                              value={trainerIban}
                              onChange={(e) => setTrainerIban(e.target.value)}
                              placeholder="DE89 3704 0044 0532 0130 00"
                            />
                          </div>
                          <div className="field">
                            <label>Steuernummer</label>
                            <input
                              value={trainerUstIdNr}
                              onChange={(e) => setTrainerUstIdNr(e.target.value)}
                              placeholder="123/456/78901"
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={trainerKleinunternehmer}
                              onChange={(e) => setTrainerKleinunternehmer(e.target.checked)}
                            />
                            <span>Kleinunternehmerregelung (keine MwSt.)</span>
                          </label>
                        </div>

                        <div className="row" style={{ marginTop: 12 }}>
                          <button
                            className="btn"
                            onClick={() => {
                              if (editingTrainerId) {
                                saveTrainer();
                              } else {
                                addTrainer();
                              }
                              setShowTrainerForm(false);
                            }}
                          >
                            {editingTrainerId
                              ? "Trainer speichern"
                              : "Trainer hinzufügen"}
                          </button>
                          <button
                            className="btn btnGhost"
                            onClick={() => {
                              setEditingTrainerId(null);
                              setTrainerName("");
                              setTrainerNachname("");
                              setTrainerEmail("");
                              setTrainerStundensatz(0);
                              setTrainerNotiz("");
                              setTrainerAdresse("");
                              setTrainerIban("");
                              setTrainerUstIdNr("");
                              setTrainerKleinunternehmer(false);
                              setShowTrainerForm(false);
                            }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {verwaltungTab === "spieler" && (
                  <div className="card">
                    <h2>Spieler verwalten</h2>

                    <div className="row" style={{ marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div className="field" style={{ flex: 1, minWidth: 150 }}>
                        <label>Suche</label>
                        <input
                          value={verwaltungSpielerSuche}
                          onChange={(e) => setVerwaltungSpielerSuche(e.target.value)}
                          placeholder="Name oder Email suchen..."
                        />
                      </div>
                      <div className="field" style={{ minWidth: 120 }}>
                        <label>Label</label>
                        <select
                          value={verwaltungLabelFilter}
                          onChange={(e) => setVerwaltungLabelFilter(e.target.value)}
                        >
                          <option value="alle">Alle Labels</option>
                          <option value="ohne">Ohne Label</option>
                          {allLabels.map((label) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <span className="pill" style={{ alignSelf: "flex-end", marginBottom: 4 }}>
                        Gesamt: <strong>{spieler.length}</strong>
                      </span>
                      {!showSpielerForm && !editingSpielerId && (
                        <>
                          <button
                            className="btn"
                            onClick={() => {
                              setSpielerError(null);
                              setShowSpielerForm(true);
                            }}
                          >
                            Neuen Spieler hinzufügen
                          </button>
                          <button
                            className="btn btnGhost"
                            onClick={async () => {
                              const XLSX = await import('xlsx');

                              // Filter Spieler basierend auf aktuellem Label-Filter
                              const filteredSpieler = spieler.filter(s => {
                                if (verwaltungLabelFilter === "alle") return true;
                                if (verwaltungLabelFilter === "ohne") return !s.labels || s.labels.length === 0;
                                return s.labels?.includes(verwaltungLabelFilter);
                              });

                              const data = filteredSpieler.map((s, idx) => ({
                                'Nr.': idx + 1,
                                'Vorname': s.vorname,
                                'Nachname': s.nachname || '',
                                'E-Mail': s.kontaktEmail || '',
                                'Telefon': s.kontaktTelefon || '',
                                'Labels': s.labels?.join(', ') || ''
                              }));

                              const ws = XLSX.utils.json_to_sheet(data);
                              const wb = XLSX.utils.book_new();
                              XLSX.utils.book_append_sheet(wb, ws, 'Spieler');

                              // Spaltenbreiten anpassen
                              ws['!cols'] = [
                                { wch: 5 },   // Nr.
                                { wch: 15 },  // Vorname
                                { wch: 15 },  // Nachname
                                { wch: 25 },  // E-Mail
                                { wch: 15 },  // Telefon
                                { wch: 20 }   // Labels
                              ];

                              XLSX.writeFile(wb, `Spielerliste_${new Date().toISOString().split('T')[0]}.xlsx`);
                            }}
                          >
                            Excel exportieren
                          </button>
                        </>
                      )}
                    </div>

                    {(showSpielerForm || editingSpielerId) && (
                      <div className="card cardInset" style={{ marginBottom: 16 }}>
                        <h3>{editingSpielerId ? "Spieler bearbeiten" : "Neuen Spieler hinzufügen"}</h3>
                        
                        {spielerError && (
                          <div style={{
                            backgroundColor: "#fee2e2",
                            border: "1px solid #dc2626",
                            borderRadius: "var(--radius-md)",
                            padding: "12px 16px",
                            marginBottom: 12,
                            color: "#991b1b",
                            fontWeight: 500
                          }}>
                            {spielerError}
                          </div>
                        )}
                        
                        <div className="row">
                          <div className="field">
                            <label>Vorname</label>
                            <input
                              value={spielerVorname}
                              onChange={(e) => {
                                setSpielerVorname(e.target.value);
                                setSpielerError(null);
                              }}
                              placeholder="Vorname"
                            />
                          </div>
                          <div className="field">
                            <label>Nachname</label>
                            <input
                              value={spielerNachname}
                              onChange={(e) => {
                                setSpielerNachname(e.target.value);
                                setSpielerError(null);
                              }}
                              placeholder="Nachname (optional)"
                            />
                          </div>
                          <div className="field">
                            <label>Email</label>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                value={spielerEmail}
                                onChange={(e) => {
                                  setSpielerEmail(e.target.value);
                                  setSpielerError(null);
                                }}
                                placeholder="Kontakt Email"
                                style={{ flex: 1 }}
                              />
                              {spielerEmail && (
                                <button
                                  type="button"
                                  title="E-Mail senden"
                                  onClick={() => {
                                    const name = `${spielerVorname}${spielerNachname ? " " + spielerNachname : ""}`;
                                    const allEmails = [spielerEmail, ...spielerZusaetzlicheEmails].filter(Boolean);
                                    setNewsletterExtraEmails(prev => {
                                      const existingEmails = new Set(prev.map(e => e.email));
                                      const newEntries = allEmails
                                        .filter(email => !existingEmails.has(email))
                                        .map(email => ({ email, name }));
                                      return [...prev, ...newEntries];
                                    });
                                    setNewsletterSubject("Anfrage zum Tennistraining");
                                    setNewsletterLabelFilter("keine");
                                    setTab("verwaltung");
                                    setVerwaltungTab("newsletter");
                                  }}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 36,
                                    height: 36,
                                    borderRadius: "var(--radius-md)",
                                    background: "var(--primary)",
                                    color: "#fff",
                                    border: "none",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                  }}
                                >
                                  ✉
                                </button>
                              )}
                            </div>
                            {/* Zusätzliche E-Mail-Adressen */}
                            {spielerZusaetzlicheEmails.length > 0 && (
                              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {spielerZusaetzlicheEmails.map((email, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      padding: "4px 8px",
                                      background: "var(--surface)",
                                      borderRadius: "var(--radius-sm)",
                                      fontSize: 13,
                                    }}
                                  >
                                    {email}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSpielerZusaetzlicheEmails(prev => prev.filter((_, i) => i !== idx));
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        color: "var(--danger)",
                                        fontSize: 14,
                                        lineHeight: 1,
                                      }}
                                      title="Entfernen"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                            <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                              <input
                                value={spielerNeueEmail}
                                onChange={(e) => setSpielerNeueEmail(e.target.value)}
                                placeholder="Weitere E-Mail hinzufügen"
                                style={{ flex: 1, fontSize: 13 }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const email = spielerNeueEmail.trim();
                                    if (!email) return;
                                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
                                    if (email === spielerEmail.trim()) return;
                                    if (spielerZusaetzlicheEmails.includes(email)) return;
                                    setSpielerZusaetzlicheEmails(prev => [...prev, email]);
                                    setSpielerNeueEmail("");
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const email = spielerNeueEmail.trim();
                                  if (!email) return;
                                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
                                  if (email === spielerEmail.trim()) return;
                                  if (spielerZusaetzlicheEmails.includes(email)) return;
                                  setSpielerZusaetzlicheEmails(prev => [...prev, email]);
                                  setSpielerNeueEmail("");
                                }}
                                style={{
                                  padding: "4px 10px",
                                  fontSize: 13,
                                  background: "var(--surface)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "var(--radius-sm)",
                                  cursor: "pointer",
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="field">
                            <label>Telefon</label>
                            <input
                              value={spielerTelefon}
                              onChange={(e) => setSpielerTelefon(e.target.value)}
                              placeholder="Telefon"
                            />
                          </div>
                        </div>

                        <div className="row">
                          <div className="field" style={{ minWidth: 260 }}>
                            <label>Rechnungsadresse</label>
                            <input
                              value={spielerRechnung}
                              onChange={(e) => setSpielerRechnung(e.target.value)}
                              placeholder="optional"
                            />
                          </div>
                        </div>

                        <div className="row">
                          <div className="field" style={{ minWidth: 260 }}>
                            <label>Notizen</label>
                            <input
                              value={spielerNotizen}
                              onChange={(e) => setSpielerNotizen(e.target.value)}
                              placeholder="optional"
                            />
                          </div>
                        </div>

                        <h4 style={{ marginTop: 20, marginBottom: 12, color: "var(--text-muted)" }}>Standort</h4>
                        <div className="row">
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                              type="radio"
                              name="standort"
                              checked={spielerLabels.includes("Wedding")}
                              onChange={() => {
                                const newLabels = spielerLabels.filter(l => l !== "Britz" && l !== "Wedding");
                                newLabels.push("Wedding");
                                setSpielerLabels(newLabels);
                              }}
                            />
                            Wedding
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginLeft: 16 }}>
                            <input
                              type="radio"
                              name="standort"
                              checked={spielerLabels.includes("Britz")}
                              onChange={() => {
                                const newLabels = spielerLabels.filter(l => l !== "Britz" && l !== "Wedding");
                                newLabels.push("Britz");
                                setSpielerLabels(newLabels);
                              }}
                            />
                            Britz
                          </label>
                        </div>

                        <h4 style={{ marginTop: 20, marginBottom: 12, color: "var(--text-muted)" }}>Labels (für Newsletter)</h4>
                        <div className="row" style={{ alignItems: "flex-start" }}>
                          <div className="field" style={{ flex: 1 }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                              {spielerLabels.map((label, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    background: "var(--primary)",
                                    color: "#fff",
                                    padding: "4px 10px",
                                    borderRadius: 12,
                                    fontSize: 13,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  {label}
                                  <button
                                    type="button"
                                    onClick={() => setSpielerLabels(spielerLabels.filter((_, i) => i !== idx))}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#fff",
                                      cursor: "pointer",
                                      padding: 0,
                                      fontSize: 14,
                                      lineHeight: 1,
                                    }}
                                  >
                                    &times;
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <input
                                value={newLabelInput}
                                onChange={(e) => setNewLabelInput(e.target.value)}
                                placeholder="Neues Label eingeben..."
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    const label = newLabelInput.trim();
                                    if (label && !spielerLabels.includes(label)) {
                                      setSpielerLabels([...spielerLabels, label]);
                                      setNewLabelInput("");
                                    }
                                  }
                                }}
                                list="available-labels"
                                style={{ flex: 1 }}
                              />
                              <datalist id="available-labels">
                                {allLabels.filter(l => !spielerLabels.includes(l)).map((label) => (
                                  <option key={label} value={label} />
                                ))}
                              </datalist>
                              <button
                                type="button"
                                className="btn btnGhost"
                                onClick={() => {
                                  const label = newLabelInput.trim();
                                  if (label && !spielerLabels.includes(label)) {
                                    setSpielerLabels([...spielerLabels, label]);
                                    setNewLabelInput("");
                                  }
                                }}
                              >
                                Hinzufügen
                              </button>
                            </div>
                          </div>
                        </div>

                        <h4 style={{ marginTop: 20, marginBottom: 12, color: "var(--text-muted)" }}>SEPA-Lastschrift Daten</h4>
                        <div className="row">
                          <div className="field" style={{ minWidth: 280 }}>
                            <label>IBAN</label>
                            <input
                              value={spielerIban}
                              onChange={(e) => setSpielerIban(e.target.value)}
                              placeholder="DE89 3704 0044 0532 0130 00"
                            />
                          </div>
                          <div className="field" style={{ minWidth: 180 }}>
                            <label>Mandatsreferenz</label>
                            <input
                              value={spielerMandatsreferenz}
                              onChange={(e) => setSpielerMandatsreferenz(e.target.value)}
                              placeholder="z.B. MANDAT-001"
                            />
                          </div>
                          <div className="field" style={{ minWidth: 160 }}>
                            <label>Unterschriftsdatum</label>
                            <input
                              type="date"
                              value={spielerUnterschriftsdatum}
                              onChange={(e) => setSpielerUnterschriftsdatum(e.target.value)}
                            />
                          </div>
                        </div>

                        <h4 style={{ marginTop: 20, marginBottom: 12, color: "var(--text-muted)" }}>Rechnungsempfänger</h4>
                        <div className="row" style={{ alignItems: "center" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                            <input
                              type="checkbox"
                              checked={spielerAbweichenderEmpfaenger}
                              onChange={(e) => setSpielerAbweichenderEmpfaenger(e.target.checked)}
                            />
                            Abweichender Rechnungsempfänger (z.B. Eltern bei Kindern)
                          </label>
                        </div>
                        {spielerAbweichenderEmpfaenger && (
                          <div className="row" style={{ marginTop: 12 }}>
                            <div className="field" style={{ minWidth: 280 }}>
                              <label>Name des Empfängers</label>
                              <input
                                value={spielerEmpfaengerName}
                                onChange={(e) => setSpielerEmpfaengerName(e.target.value)}
                                placeholder="z.B. Familie Müller"
                              />
                            </div>
                          </div>
                        )}

                        <div className="row" style={{ marginTop: 20 }}>
                          <button
                            className="btn"
                            onClick={() => {
                              if (editingSpielerId) {
                                saveSpieler();
                              } else {
                                addSpieler();
                              }
                            }}
                          >
                            {editingSpielerId
                              ? "Spieler speichern"
                              : "Spieler hinzufügen"}
                          </button>
                          <button
                            className="btn btnGhost"
                            onClick={() => {
                              setEditingSpielerId(null);
                              setSpielerVorname("");
                              setSpielerNachname("");
                              setSpielerEmail("");
                              setSpielerTelefon("");
                              setSpielerRechnung("");
                              setSpielerNotizen("");
                              setSpielerIban("");
                              setSpielerMandatsreferenz("");
                              setSpielerUnterschriftsdatum("");
                              setSpielerAbweichenderEmpfaenger(false);
                              setSpielerEmpfaengerName("");
                              setSpielerError(null);
                              setShowSpielerForm(false);
                            }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}

                    <ul className="list">
                      {spieler
                        .slice()
                        .filter((s) => {
                          // Label-Filter
                          if (verwaltungLabelFilter === "ohne") {
                            if (s.labels && s.labels.length > 0) return false;
                          } else if (verwaltungLabelFilter !== "alle") {
                            if (!s.labels?.includes(verwaltungLabelFilter)) return false;
                          }
                          // Suche
                          const q = verwaltungSpielerSuche.trim().toLowerCase();
                          if (!q) return true;
                          return (
                            s.vorname.toLowerCase().includes(q) ||
                            (s.nachname ?? "").toLowerCase().includes(q) ||
                            (s.kontaktEmail ?? "").toLowerCase().includes(q) ||
                            (s.kontaktTelefon ?? "").toLowerCase().includes(q)
                          );
                        })
                        .sort((a, b) => getFullName(a).localeCompare(getFullName(b)))
                        .map((s) => (
                        <li key={s.id} className="listItem">
                          <div>
                            <strong>{getFullName(s)}</strong>
                            <div className="muted">
                              {s.kontaktEmail ?? ""}
                              {s.kontaktTelefon
                                ? `, ${s.kontaktTelefon}`
                                : ""}
                            </div>
                            {s.rechnungsAdresse && (
                              <div className="muted">
                                Rechnungsadresse: {s.rechnungsAdresse}
                              </div>
                            )}
                            {s.notizen && (
                              <div className="muted">{s.notizen}</div>
                            )}
                            {s.labels && s.labels.length > 0 && (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                                {s.labels.map((label, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      background: "var(--primary)",
                                      color: "#fff",
                                      padding: "2px 8px",
                                      borderRadius: 10,
                                      fontSize: 11,
                                    }}
                                  >
                                    {label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="smallActions">
                            <button
                              className="btn micro btnGhost"
                              onClick={() => {
                                startEditSpieler(s);
                                setSpielerError(null);
                                setShowSpielerForm(true);
                              }}
                            >
                              Bearbeiten
                            </button>
                            <button
                              className="btn micro btnWarn"
                              onClick={() => deleteSpieler(s.id)}
                            >
                              Löschen
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {verwaltungTab === "tarife" && (
                  <div className="card">
                    <h2>Tarife verwalten</h2>

                    <ul className="list">
                      {tarife.map((t) => (
                        <li key={t.id} className="listItem">
                          <div>
                            <strong>{t.name}</strong>
                            <div className="muted">
                              {t.abrechnung === "monatlich"
                                ? `${t.preisProStunde} EUR monatlich`
                                : `${t.preisProStunde} EUR pro Stunde, ${
                                    t.abrechnung === "proSpieler"
                                      ? "pro Spieler"
                                      : "pro Training"
                                  }`}
                            </div>
                            {t.beschreibung && (
                              <div className="muted">{t.beschreibung}</div>
                            )}
                          </div>
                          <div className="smallActions">
                            <button
                              className="btn micro btnGhost"
                              onClick={() => {
                                startEditTarif(t);
                                setShowTarifForm(true);
                              }}
                            >
                              Bearbeiten
                            </button>
                            <button
                              className="btn micro btnWarn"
                              onClick={() => deleteTarif(t.id)}
                            >
                              Löschen
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {!showTarifForm && !editingTarifId && (
                      <div style={{ marginTop: 16 }}>
                        <button
                          className="btn"
                          onClick={() => setShowTarifForm(true)}
                        >
                          Neuen Tarif hinzufügen
                        </button>
                      </div>
                    )}

                    {(showTarifForm || editingTarifId) && (
                      <div className="card cardInset" style={{ marginTop: 16 }}>
                        <h3>{editingTarifId ? "Tarif bearbeiten" : "Neuen Tarif hinzufügen"}</h3>
                        <div className="row">
                          <div className="field">
                            <label>Name</label>
                            <input
                              value={tarifName}
                              onChange={(e) => setTarifName(e.target.value)}
                              placeholder="z.B. Gruppentraining"
                            />
                          </div>
                          <div className="field">
                            <label>Preis pro Stunde</label>
                            <input
                              type="number"
                              value={tarifPreisProStunde}
                              onChange={(e) =>
                                setTarifPreisProStunde(
                                  Number(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                          <div className="field">
                            <label>Abrechnung</label>
                            <select
                              value={tarifAbrechnung}
                              onChange={(e) =>
                                setTarifAbrechnung(
                                  e.target.value as
                                    | "proTraining"
                                    | "proSpieler"
                                    | "monatlich"
                                )
                              }
                            >
                              <option value="proTraining">Pro Training</option>
                              <option value="proSpieler">Pro Spieler</option>
                              <option value="monatlich">Monatlich</option>
                            </select>
                          </div>
                        </div>

                        <div className="row">
                          <div className="field" style={{ minWidth: 260 }}>
                            <label>Beschreibung</label>
                            <input
                              value={tarifBeschreibung}
                              onChange={(e) =>
                                setTarifBeschreibung(e.target.value)
                              }
                              placeholder="optional"
                            />
                          </div>
                        </div>

                        <div className="row">
                          <button
                            className="btn"
                            onClick={() => {
                              if (editingTarifId) {
                                saveTarif();
                              } else {
                                addTarif();
                              }
                              setShowTarifForm(false);
                            }}
                          >
                            {editingTarifId
                              ? "Tarif speichern"
                              : "Tarif hinzufügen"}
                          </button>
                          <button
                            className="btn btnGhost"
                            onClick={() => {
                              setEditingTarifId(null);
                              setTarifName("");
                              setTarifPreisProStunde(60);
                              setTarifAbrechnung("proTraining");
                              setTarifBeschreibung("");
                              setShowTarifForm(false);
                            }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </>
            )}

            {tab === "formulare" && !isTrainer && (
              <>
                <div className="card">
                  <h2>Formulare</h2>

                  {/* Sub-Tabs für Formulare */}
                    <div className="tabBar" style={{ marginBottom: 20 }}>
                      <button
                        className={`tabBtn ${formulareTab === "anmeldung" ? "tabBtnActive" : ""}`}
                        onClick={() => setFormulareTab("anmeldung")}
                      >
                        Anmeldung
                        {registrationRequests.filter(r => r.status === "neu").length > 0 && (
                          <span style={{
                            marginLeft: 6,
                            background: "var(--danger)",
                            color: "white",
                            borderRadius: "50%",
                            width: 18,
                            height: 18,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11
                          }}>
                            {registrationRequests.filter(r => r.status === "neu").length}
                          </span>
                        )}
                      </button>
                      <button
                        className={`tabBtn ${formulareTab === "sepa" ? "tabBtnActive" : ""}`}
                        onClick={() => setFormulareTab("sepa")}
                      >
                        SEPA-Mandat
                        {sepaMandates.filter(m => (m.status || "neu") === "neu").length > 0 && (
                          <span style={{
                            marginLeft: 6,
                            background: "var(--primary)",
                            color: "#fff",
                            borderRadius: 10,
                            padding: "2px 6px",
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {sepaMandates.filter(m => (m.status || "neu") === "neu").length}
                          </span>
                        )}
                      </button>
                      <button
                        className={`tabBtn ${formulareTab === "tenniscamp" ? "tabBtnActive" : ""}`}
                        onClick={() => setFormulareTab("tenniscamp")}
                      >
                        Tenniscamp
                        {tenniscampAnmeldungen.filter(a => a.status === "neu").length > 0 && (
                          <span style={{
                            marginLeft: 6,
                            background: "#22c55e",
                            color: "#fff",
                            borderRadius: 10,
                            padding: "2px 6px",
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {tenniscampAnmeldungen.filter(a => a.status === "neu").length}
                          </span>
                        )}
                      </button>
                      <button
                        className={`tabBtn ${formulareTab === "probetraining" ? "tabBtnActive" : ""}`}
                        onClick={() => setFormulareTab("probetraining")}
                      >
                        Probetraining (pw)
                        {probetrainingAnfragen.filter(a => a.status === "neu").length > 0 && (
                          <span style={{
                            marginLeft: 6,
                            background: "#f59e0b",
                            color: "#fff",
                            borderRadius: 10,
                            padding: "2px 6px",
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {probetrainingAnfragen.filter(a => a.status === "neu").length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Anmeldung Tab */}
                    {formulareTab === "anmeldung" && (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <p className="muted" style={{ marginBottom: 8 }}>
                            <strong>Anmeldung Wedding:</strong>{" "}
                            <code style={{
                              background: "var(--bg-inset)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                            }}>
                              {window.location.origin}/anmeldung-wedding
                            </code>
                            <button
                              className="btn micro btnGhost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/anmeldung-wedding`
                                );
                              }}
                            >
                              Kopieren
                            </button>
                          </p>
                          <p className="muted" style={{ marginBottom: 8 }}>
                            <strong>Anmeldung Britz:</strong>{" "}
                            <code style={{
                              background: "var(--bg-inset)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                            }}>
                              {window.location.origin}/anmeldung-britz
                            </code>
                            <button
                              className="btn micro btnGhost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/anmeldung-britz`
                                );
                              }}
                            >
                              Kopieren
                            </button>
                          </p>
                        </div>

                        <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                          <div className="field" style={{ margin: 0 }}>
                            <label>Suche</label>
                            <input
                              type="text"
                              placeholder="Name suchen..."
                              value={anmeldungNameSuche}
                              onChange={(e) => setAnmeldungNameSuche(e.target.value)}
                              style={{ padding: "4px 8px", width: 150 }}
                            />
                          </div>
                          <div className="field" style={{ margin: 0 }}>
                            <label>Anlage</label>
                            <select
                              value={anmeldungAnlageFilter}
                              onChange={(e) => setAnmeldungAnlageFilter(e.target.value as "alle" | "Wedding" | "Britz")}
                              style={{ padding: "4px 8px" }}
                            >
                              <option value="alle">Alle</option>
                              <option value="Wedding">Wedding</option>
                              <option value="Britz">Britz</option>
                            </select>
                          </div>
                          <div className="field" style={{ margin: 0 }}>
                            <label>Verfügbar am</label>
                            <select
                              value={anmeldungTagFilter}
                              onChange={(e) => setAnmeldungTagFilter(e.target.value as typeof anmeldungTagFilter)}
                              style={{ padding: "4px 8px" }}
                            >
                              <option value="alle">Alle Tage</option>
                              <option value="montag">Montag</option>
                              <option value="dienstag">Dienstag</option>
                              <option value="mittwoch">Mittwoch</option>
                              <option value="donnerstag">Donnerstag</option>
                              <option value="freitag">Freitag</option>
                              <option value="samstag">Samstag</option>
                              <option value="sonntag">Sonntag</option>
                            </select>
                          </div>
                          <div className="field" style={{ margin: 0 }}>
                            <label>Status</label>
                            <select
                              value={anmeldungStatusFilter}
                              onChange={(e) => setAnmeldungStatusFilter(e.target.value as typeof anmeldungStatusFilter)}
                              style={{ padding: "4px 8px" }}
                            >
                              <option value="alle">Alle</option>
                              <option value="offen">Offen</option>
                              <option value="erledigt">Erledigt</option>
                            </select>
                          </div>
                        </div>

                        {/* Auswahl-Toolbar */}
                        {registrationRequests.length > 0 && (
                          <div style={{
                            marginBottom: 16,
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                            padding: "8px 12px",
                            background: "var(--bg-inset)",
                            borderRadius: 8
                          }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                              <input
                                type="checkbox"
                                checked={(() => {
                                  const filtered = registrationRequests.filter(r => {
                                    if (anmeldungAnlageFilter !== "alle" && r.anlage !== anmeldungAnlageFilter) return false;
                                    if (anmeldungNameSuche && !r.name.toLowerCase().includes(anmeldungNameSuche.toLowerCase())) return false;
                                    if (anmeldungTagFilter !== "alle" && r.verfuegbarkeit) {
                                      const tagWert = r.verfuegbarkeit[anmeldungTagFilter];
                                      if (!tagWert || tagWert === "" || tagWert.toLowerCase() === "nicht verfügbar") return false;
                                    }
                                    if (anmeldungStatusFilter === "offen" && r.status === "erledigt") return false;
                                    if (anmeldungStatusFilter === "erledigt" && r.status !== "erledigt") return false;
                                    return true;
                                  });
                                  return filtered.length > 0 && filtered.every(r => selectedRequestIds.has(r.id));
                                })()}
                                onChange={(e) => {
                                  const filtered = registrationRequests.filter(r => {
                                    if (anmeldungAnlageFilter !== "alle" && r.anlage !== anmeldungAnlageFilter) return false;
                                    if (anmeldungNameSuche && !r.name.toLowerCase().includes(anmeldungNameSuche.toLowerCase())) return false;
                                    if (anmeldungTagFilter !== "alle" && r.verfuegbarkeit) {
                                      const tagWert = r.verfuegbarkeit[anmeldungTagFilter];
                                      if (!tagWert || tagWert === "" || tagWert.toLowerCase() === "nicht verfügbar") return false;
                                    }
                                    if (anmeldungStatusFilter === "offen" && r.status === "erledigt") return false;
                                    if (anmeldungStatusFilter === "erledigt" && r.status !== "erledigt") return false;
                                    return true;
                                  });
                                  if (e.target.checked) {
                                    setSelectedRequestIds(new Set([...Array.from(selectedRequestIds), ...filtered.map(r => r.id)]));
                                  } else {
                                    const newSet = new Set(selectedRequestIds);
                                    filtered.forEach(r => newSet.delete(r.id));
                                    setSelectedRequestIds(newSet);
                                  }
                                }}
                              />
                              <span style={{ fontSize: 13 }}>Alle auswählen</span>
                            </label>
                            {selectedRequestIds.size > 0 && (
                              <>
                                <span className="muted" style={{ fontSize: 13 }}>
                                  {selectedRequestIds.size} ausgewählt
                                </span>
                                <button
                                  className="btn micro btnGhost"
                                  onClick={async () => {
                                    const selectedReqs = registrationRequests.filter(r => selectedRequestIds.has(r.id));
                                    if (selectedReqs.length === 0) return;

                                    const generateCardHTML = (req: typeof selectedReqs[0]) => {
                                      const trainingsartText = req.trainingsart === "einzel"
                                        ? "Einzeltraining"
                                        : req.trainingsart === "gruppe"
                                        ? "Gruppentraining"
                                        : req.trainingsart === "beides"
                                        ? "Beides"
                                        : "-";
                                      const erfahrungText = req.erfahrungslevel === "anfaenger"
                                        ? "Anfänger"
                                        : req.erfahrungslevel === "fortgeschritten"
                                        ? "Fortgeschritten"
                                        : req.erfahrungslevel === "profi"
                                        ? "Profi"
                                        : "-";
                                      const verfuegbarkeitRows = req.verfuegbarkeit ? [
                                        req.verfuegbarkeit.montag ? `<tr><td style="padding:1px 6px 1px 0;font-weight:500;">Mo</td><td style="padding:1px 0;">${escapeHtml(req.verfuegbarkeit.montag)}</td></tr>` : "",
                                        req.verfuegbarkeit.dienstag ? `<tr><td style="padding:1px 6px 1px 0;font-weight:500;">Di</td><td style="padding:1px 0;">${escapeHtml(req.verfuegbarkeit.dienstag)}</td></tr>` : "",
                                        req.verfuegbarkeit.mittwoch ? `<tr><td style="padding:1px 6px 1px 0;font-weight:500;">Mi</td><td style="padding:1px 0;">${escapeHtml(req.verfuegbarkeit.mittwoch)}</td></tr>` : "",
                                        req.verfuegbarkeit.donnerstag ? `<tr><td style="padding:1px 6px 1px 0;font-weight:500;">Do</td><td style="padding:1px 0;">${escapeHtml(req.verfuegbarkeit.donnerstag)}</td></tr>` : "",
                                        req.verfuegbarkeit.freitag ? `<tr><td style="padding:1px 6px 1px 0;font-weight:500;">Fr</td><td style="padding:1px 0;">${escapeHtml(req.verfuegbarkeit.freitag)}</td></tr>` : "",
                                        req.verfuegbarkeit.samstag ? `<tr><td style="padding:1px 6px 1px 0;font-weight:500;">Sa</td><td style="padding:1px 0;">${escapeHtml(req.verfuegbarkeit.samstag)}</td></tr>` : "",
                                        req.verfuegbarkeit.sonntag ? `<tr><td style="padding:1px 6px 1px 0;font-weight:500;">So</td><td style="padding:1px 0;">${escapeHtml(req.verfuegbarkeit.sonntag)}</td></tr>` : "",
                                      ].filter(Boolean).join("") : "";

                                      return `
                                        <div class="card">
                                          <div class="header">
                                            <p class="name">${escapeHtml(req.name)}</p>
                                            ${req.anlage ? `<span class="anlage" style="background:${req.anlage === "Britz" ? "#f59e0b" : "#2563eb"};">${escapeHtml(req.anlage)}</span>` : ""}
                                          </div>
                                          <div class="info-grid">
                                            <div class="info-item"><label>Telefon</label><span>${escapeHtml(req.telefon) || "-"}</span></div>
                                            <div class="info-item"><label>E-Mail</label><span style="font-size:7pt;word-break:break-all;">${escapeHtml(req.email)}</span></div>
                                            <div class="info-item"><label>Alter</label><span>${req.alter_jahre ? escapeHtml(req.alter_jahre) + " J." : "-"}</span></div>
                                            <div class="info-item"><label>Art</label><span>${trainingsartText}</span></div>
                                            <div class="info-item"><label>Level</label><span>${erfahrungText}</span></div>
                                            <div class="info-item"><label>Pro Woche</label><span>${req.trainings_pro_woche ? escapeHtml(req.trainings_pro_woche) + "x" : "-"}</span></div>
                                          </div>
                                          ${verfuegbarkeitRows ? `<div class="verfuegbarkeit"><h4>Verfügbarkeit</h4><table>${verfuegbarkeitRows}</table></div>` : ""}
                                          ${req.nachricht ? `<div class="nachricht"><label>Nachricht</label><span>${escapeHtml(req.nachricht)}</span></div>` : ""}
                                          <div class="footer">Anmeldung vom ${new Date(req.created_at).toLocaleDateString("de-DE")}</div>
                                        </div>
                                      `;
                                    };

                                    // Karten in 4er-Gruppen aufteilen
                                    const cardGroups: typeof selectedReqs[] = [];
                                    for (let i = 0; i < selectedReqs.length; i += 4) {
                                      cardGroups.push(selectedReqs.slice(i, i + 4));
                                    }

                                    const cardsHTML = `
                                      <div style="font-family: Arial, sans-serif;">
                                        <style>
                                          .print-page {
                                            width: 190mm;
                                            display: grid;
                                            grid-template-columns: 1fr 1fr;
                                            gap: 4mm;
                                            margin-bottom: 10mm;
                                          }
                                          .card {
                                            border: 1px solid #ccc;
                                            border-radius: 3px;
                                            padding: 3mm;
                                            box-sizing: border-box;
                                            font-size: 8pt;
                                            height: 134mm;
                                            overflow: hidden;
                                          }
                                          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ddd; padding-bottom: 1.5mm; margin-bottom: 1.5mm; }
                                          .name { font-size: 10pt; font-weight: bold; margin: 0; }
                                          .anlage { color: white; padding: 1px 5px; border-radius: 2px; font-size: 7pt; }
                                          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm; margin-bottom: 1.5mm; }
                                          .info-item label { font-size: 6pt; color: #666; display: block; }
                                          .info-item span { font-size: 8pt; }
                                          .verfuegbarkeit { margin-top: 1mm; }
                                          .verfuegbarkeit h4 { font-size: 7pt; margin: 0 0 0.5mm 0; color: #666; }
                                          .verfuegbarkeit table { font-size: 7pt; border-collapse: collapse; }
                                          .nachricht { margin-top: 1.5mm; padding-top: 1.5mm; border-top: 1px dashed #ddd; }
                                          .nachricht label { font-size: 6pt; color: #666; display: block; margin-bottom: 0.5mm; }
                                          .nachricht span { font-size: 7pt; display: block; white-space: pre-wrap; }
                                          .footer { font-size: 6pt; color: #999; margin-top: 1mm; text-align: right; }
                                        </style>
                                        ${cardGroups.map(group => `
                                          <div class="print-page">
                                            ${group.map(generateCardHTML).join("")}
                                          </div>
                                        `).join("")}
                                      </div>
                                    `;

                                    const html2pdf = (await import('html2pdf.js')).default;
                                    const container = document.createElement('div');
                                    container.innerHTML = cardsHTML;
                                    document.body.appendChild(container);

                                    await html2pdf()
                                      .set({
                                        margin: 10,
                                        filename: `Anmeldungen_${new Date().toISOString().split('T')[0]}.pdf`,
                                        html2canvas: { scale: 2 },
                                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
                                      })
                                      .from(container.firstElementChild as HTMLElement)
                                      .save();

                                    document.body.removeChild(container);
                                  }}
                                >
                                  Ausgewählte drucken
                                </button>
                                <button
                                  className="btn micro"
                                  style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                                  onClick={() => setShowAdoptConfirmDialog(true)}
                                >
                                  Als Spieler übernehmen
                                </button>
                                <button
                                  className="btn micro btnGhost"
                                  onClick={() => setSelectedRequestIds(new Set())}
                                >
                                  Auswahl aufheben
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {loadingRequests ? (
                          <p className="muted">Laden...</p>
                        ) : registrationRequests.filter(r => {
                          // Anlage Filter
                          if (anmeldungAnlageFilter !== "alle" && r.anlage !== anmeldungAnlageFilter) return false;
                          // Name Suche
                          if (anmeldungNameSuche && !r.name.toLowerCase().includes(anmeldungNameSuche.toLowerCase())) return false;
                          // Tag Filter - prüfe ob an diesem Tag eine gültige Zeit eingetragen ist (nicht leer und nicht "nicht verfügbar")
                          if (anmeldungTagFilter !== "alle" && r.verfuegbarkeit) {
                            const tagWert = r.verfuegbarkeit[anmeldungTagFilter];
                            if (!tagWert || tagWert === "" || tagWert.toLowerCase() === "nicht verfügbar") return false;
                          }
                          // Status Filter
                          if (anmeldungStatusFilter === "offen" && r.status === "erledigt") return false;
                          if (anmeldungStatusFilter === "erledigt" && r.status !== "erledigt") return false;
                          return true;
                        }).length === 0 ? (
                          <p className="muted">Keine Anmeldungen für diesen Filter.</p>
                        ) : (
                          <ul className="list">
                            {registrationRequests.filter(r => {
                              if (anmeldungAnlageFilter !== "alle" && r.anlage !== anmeldungAnlageFilter) return false;
                              if (anmeldungNameSuche && !r.name.toLowerCase().includes(anmeldungNameSuche.toLowerCase())) return false;
                              if (anmeldungTagFilter !== "alle" && r.verfuegbarkeit) {
                                const tagWert = r.verfuegbarkeit[anmeldungTagFilter];
                                if (!tagWert || tagWert === "" || tagWert.toLowerCase() === "nicht verfügbar") return false;
                              }
                              if (anmeldungStatusFilter === "offen" && r.status === "erledigt") return false;
                              if (anmeldungStatusFilter === "erledigt" && r.status !== "erledigt") return false;
                              return true;
                            }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((req) => (
                              <li key={req.id} className="listItem" style={{ flexDirection: "column", alignItems: "stretch", padding: expandedRequestId === req.id ? undefined : "8px 12px" }}>
                                <div
                                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                  onClick={() => setExpandedRequestId(expandedRequestId === req.id ? null : req.id)}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <input
                                      type="checkbox"
                                      checked={selectedRequestIds.has(req.id)}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const newSet = new Set(selectedRequestIds);
                                        if (e.target.checked) {
                                          newSet.add(req.id);
                                        } else {
                                          newSet.delete(req.id);
                                        }
                                        setSelectedRequestIds(newSet);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span style={{ fontWeight: 500 }}>{req.name}</span>
                                    {req.alter_jahre && (
                                      <span className="muted" style={{ fontSize: 13 }}>
                                        {req.alter_jahre}J
                                      </span>
                                    )}
                                    {req.anlage && (
                                      <span style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        background: req.anlage === "Britz" ? "var(--warning)" : "var(--primary)",
                                        color: req.anlage === "Britz" ? "#000" : "#fff",
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        minWidth: 16,
                                        textAlign: "center"
                                      }}>
                                        {req.anlage === "Britz" ? "B" : "W"}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.2s", transform: expandedRequestId === req.id ? "rotate(90deg)" : "rotate(0deg)" }}>
                                    ▶
                                  </span>
                                </div>

                                {expandedRequestId === req.id && (
                                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span className="muted">{req.email}</span>
                                        <button
                                          type="button"
                                          title="E-Mail senden"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNewsletterExtraEmails(prev =>
                                              prev.some(em => em.email === req.email)
                                                ? prev
                                                : [...prev, { email: req.email, name: req.name }]
                                            );
                                            setNewsletterSubject("Anfrage zum Tennistraining");
                                            setNewsletterLabelFilter("keine");
                                            setTab("verwaltung");
                                            setVerwaltungTab("newsletter");
                                          }}
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            width: 22,
                                            height: 22,
                                            borderRadius: 4,
                                            background: "var(--primary)",
                                            color: "#fff",
                                            border: "none",
                                            cursor: "pointer",
                                            fontSize: 12,
                                          }}
                                        >
                                          ✉
                                        </button>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span className="muted" style={{ fontSize: 12 }}>
                                          {new Date(req.created_at).toLocaleDateString("de-DE", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                          })}
                                        </span>
                                        <span
                                          className="pill"
                                          style={{
                                            background: req.status === "erledigt" ? "var(--success)" : "var(--danger)",
                                            color: "white",
                                            fontSize: 12,
                                            padding: "4px 10px"
                                          }}
                                        >
                                          {req.status === "erledigt" ? "Erledigt" : "Offen"}
                                        </span>
                                      </div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                                      {req.telefon && (
                                        <div>
                                          <div className="muted" style={{ fontSize: 11 }}>Telefon</div>
                                          <div>{req.telefon}</div>
                                        </div>
                                      )}
                                      {req.alter_jahre && (
                                        <div>
                                          <div className="muted" style={{ fontSize: 11 }}>Alter</div>
                                          <div>{req.alter_jahre} Jahre</div>
                                        </div>
                                      )}
                                      {req.trainingsart && (
                                        <div>
                                          <div className="muted" style={{ fontSize: 11 }}>Trainingsart</div>
                                          <div>
                                            {req.trainingsart === "einzel"
                                              ? "Einzeltraining"
                                              : req.trainingsart === "gruppe"
                                              ? "Gruppentraining"
                                              : "Beides möglich"}
                                          </div>
                                        </div>
                                      )}
                                      {req.trainings_pro_woche && (
                                        <div>
                                          <div className="muted" style={{ fontSize: 11 }}>Trainings pro Woche</div>
                                          <div>{req.trainings_pro_woche}x</div>
                                        </div>
                                      )}
                                      {req.erfahrungslevel && (
                                        <div>
                                          <div className="muted" style={{ fontSize: 11 }}>Erfahrungslevel</div>
                                          <div>
                                            {req.erfahrungslevel === "anfaenger"
                                              ? "Anfänger"
                                              : req.erfahrungslevel === "fortgeschritten"
                                              ? "Fortgeschritten"
                                              : "Profi"}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    {req.verfuegbarkeit && (
                                      <div style={{ marginBottom: 12 }}>
                                        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Verfügbarkeit</div>
                                        <table className="verfuegbarkeitTable" style={{ fontSize: 13 }}>
                                          <tbody>
                                            {req.verfuegbarkeit.montag && (
                                              <tr><td>Montag</td><td>{req.verfuegbarkeit.montag}</td></tr>
                                            )}
                                            {req.verfuegbarkeit.dienstag && (
                                              <tr><td>Dienstag</td><td>{req.verfuegbarkeit.dienstag}</td></tr>
                                            )}
                                            {req.verfuegbarkeit.mittwoch && (
                                              <tr><td>Mittwoch</td><td>{req.verfuegbarkeit.mittwoch}</td></tr>
                                            )}
                                            {req.verfuegbarkeit.donnerstag && (
                                              <tr><td>Donnerstag</td><td>{req.verfuegbarkeit.donnerstag}</td></tr>
                                            )}
                                            {req.verfuegbarkeit.freitag && (
                                              <tr><td>Freitag</td><td>{req.verfuegbarkeit.freitag}</td></tr>
                                            )}
                                            {req.verfuegbarkeit.samstag && (
                                              <tr><td>Samstag</td><td>{req.verfuegbarkeit.samstag}</td></tr>
                                            )}
                                            {req.verfuegbarkeit.sonntag && (
                                              <tr><td>Sonntag</td><td>{req.verfuegbarkeit.sonntag}</td></tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                    {req.nachricht && (
                                      <div style={{ marginBottom: 12 }}>
                                        <div className="muted" style={{ fontSize: 11 }}>Nachricht</div>
                                        <div style={{ whiteSpace: "pre-wrap" }}>{req.nachricht}</div>
                                      </div>
                                    )}
                                    <div className="smallActions">
                                      <button
                                        className="btn micro"
                                        style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                                        onClick={() => adoptPlayerFromRequest(req)}
                                      >
                                        Als Spieler übernehmen
                                      </button>
                                      <select
                                        value={req.status === "erledigt" ? "erledigt" : "offen"}
                                        onChange={(e) => updateRequestStatus(req.id, e.target.value)}
                                        style={{ padding: "6px 10px", borderRadius: 8 }}
                                      >
                                        <option value="offen">Offen</option>
                                        <option value="erledigt">Erledigt</option>
                                      </select>
                                      <button
                                        className="btn micro btnGhost"
                                        onClick={async () => {
                                          const trainingsartText = req.trainingsart === "einzel"
                                            ? "Einzeltraining"
                                            : req.trainingsart === "gruppe"
                                            ? "Gruppentraining"
                                            : req.trainingsart === "beides"
                                            ? "Beides"
                                            : "-";
                                          const erfahrungText = req.erfahrungslevel === "anfaenger"
                                            ? "Anfänger"
                                            : req.erfahrungslevel === "fortgeschritten"
                                            ? "Fortgeschritten"
                                            : req.erfahrungslevel === "profi"
                                            ? "Profi"
                                            : "-";

                                          const verfuegbarkeitRows = req.verfuegbarkeit ? [
                                            req.verfuegbarkeit.montag ? `<tr><td style="padding:2px 8px 2px 0;font-weight:500;">Mo</td><td style="padding:2px 0;">${escapeHtml(req.verfuegbarkeit.montag)}</td></tr>` : "",
                                            req.verfuegbarkeit.dienstag ? `<tr><td style="padding:2px 8px 2px 0;font-weight:500;">Di</td><td style="padding:2px 0;">${escapeHtml(req.verfuegbarkeit.dienstag)}</td></tr>` : "",
                                            req.verfuegbarkeit.mittwoch ? `<tr><td style="padding:2px 8px 2px 0;font-weight:500;">Mi</td><td style="padding:2px 0;">${escapeHtml(req.verfuegbarkeit.mittwoch)}</td></tr>` : "",
                                            req.verfuegbarkeit.donnerstag ? `<tr><td style="padding:2px 8px 2px 0;font-weight:500;">Do</td><td style="padding:2px 0;">${escapeHtml(req.verfuegbarkeit.donnerstag)}</td></tr>` : "",
                                            req.verfuegbarkeit.freitag ? `<tr><td style="padding:2px 8px 2px 0;font-weight:500;">Fr</td><td style="padding:2px 0;">${escapeHtml(req.verfuegbarkeit.freitag)}</td></tr>` : "",
                                            req.verfuegbarkeit.samstag ? `<tr><td style="padding:2px 8px 2px 0;font-weight:500;">Sa</td><td style="padding:2px 0;">${escapeHtml(req.verfuegbarkeit.samstag)}</td></tr>` : "",
                                            req.verfuegbarkeit.sonntag ? `<tr><td style="padding:2px 8px 2px 0;font-weight:500;">So</td><td style="padding:2px 0;">${escapeHtml(req.verfuegbarkeit.sonntag)}</td></tr>` : "",
                                          ].filter(Boolean).join("") : "";

                                          const cardHTML = `
                                            <!DOCTYPE html>
                                            <html>
                                            <head>
                                              <style>
                                                @page { size: 95mm 140mm; margin: 0; }
                                                body {
                                                  font-family: Arial, sans-serif;
                                                  margin: 0;
                                                  padding: 3mm;
                                                  box-sizing: border-box;
                                                }
                                                .card {
                                                  width: 89mm;
                                                  height: 134mm;
                                                  border: 1px solid #ccc;
                                                  border-radius: 3px;
                                                  padding: 3mm;
                                                  box-sizing: border-box;
                                                  font-size: 8pt;
                                                  overflow: hidden;
                                                }
                                                .header {
                                                  display: flex;
                                                  justify-content: space-between;
                                                  align-items: flex-start;
                                                  border-bottom: 1px solid #ddd;
                                                  padding-bottom: 2mm;
                                                  margin-bottom: 2mm;
                                                }
                                                .name { font-size: 10pt; font-weight: bold; margin: 0; }
                                                .anlage {
                                                  background: ${req.anlage === "Britz" ? "#f59e0b" : "#2563eb"};
                                                  color: white;
                                                  padding: 2px 6px;
                                                  border-radius: 3px;
                                                  font-size: 8pt;
                                                }
                                                .info-grid {
                                                  display: grid;
                                                  grid-template-columns: 1fr 1fr;
                                                  gap: 2mm;
                                                  margin-bottom: 2mm;
                                                }
                                                .info-item label { font-size: 7pt; color: #666; display: block; }
                                                .info-item span { font-size: 9pt; }
                                                .verfuegbarkeit { margin-top: 2mm; }
                                                .verfuegbarkeit h4 { font-size: 8pt; margin: 0 0 1mm 0; color: #666; }
                                                .verfuegbarkeit table { font-size: 8pt; border-collapse: collapse; }
                                                .nachricht {
                                                  margin-top: 2mm;
                                                  font-size: 8pt;
                                                  color: #333;
                                                  border-top: 1px dashed #ddd;
                                                  padding-top: 2mm;
                                                }
                                                .footer { font-size: 7pt; color: #999; margin-top: 2mm; text-align: right; }
                                              </style>
                                            </head>
                                            <body>
                                              <div class="card">
                                                <div class="header">
                                                  <p class="name">${escapeHtml(req.name)}</p>
                                                  ${req.anlage ? `<span class="anlage">${escapeHtml(req.anlage)}</span>` : ""}
                                                </div>
                                                <div class="info-grid">
                                                  <div class="info-item">
                                                    <label>Telefon</label>
                                                    <span>${escapeHtml(req.telefon) || "-"}</span>
                                                  </div>
                                                  <div class="info-item">
                                                    <label>E-Mail</label>
                                                    <span>${escapeHtml(req.email)}</span>
                                                  </div>
                                                  <div class="info-item">
                                                    <label>Alter</label>
                                                    <span>${req.alter_jahre ? escapeHtml(req.alter_jahre) + " Jahre" : "-"}</span>
                                                  </div>
                                                  <div class="info-item">
                                                    <label>Trainingsart</label>
                                                    <span>${trainingsartText}</span>
                                                  </div>
                                                  <div class="info-item">
                                                    <label>Level</label>
                                                    <span>${erfahrungText}</span>
                                                  </div>
                                                  <div class="info-item">
                                                    <label>Pro Woche</label>
                                                    <span>${req.trainings_pro_woche ? escapeHtml(req.trainings_pro_woche) + "x" : "-"}</span>
                                                  </div>
                                                </div>
                                                ${verfuegbarkeitRows ? `
                                                  <div class="verfuegbarkeit">
                                                    <h4>Verfügbarkeit</h4>
                                                    <table>${verfuegbarkeitRows}</table>
                                                  </div>
                                                ` : ""}
                                                ${req.nachricht ? `<div class="nachricht"><strong>Nachricht:</strong> ${escapeHtml(req.nachricht)}</div>` : ""}
                                                <div class="footer">Anmeldung vom ${new Date(req.created_at).toLocaleDateString("de-DE")}</div>
                                              </div>
                                            </body>
                                            </html>
                                          `;

                                          const html2pdf = (await import('html2pdf.js')).default;
                                          const container = document.createElement('div');
                                          container.innerHTML = cardHTML;
                                          document.body.appendChild(container);
                                          const cardEl = container.querySelector('.card') as HTMLElement;

                                          await html2pdf()
                                            .set({
                                              margin: 0,
                                              filename: `Anmeldung_${req.name.replace(/\s+/g, "_")}.pdf`,
                                              html2canvas: { scale: 2, useCORS: true },
                                              jsPDF: { unit: 'mm', format: [95, 140], orientation: 'portrait' }
                                            })
                                            .from(cardEl)
                                            .save();

                                          document.body.removeChild(container);
                                        }}
                                      >
                                        Drucken
                                      </button>
                                      <button
                                        className="btn micro btnWarn"
                                        onClick={() => {
                                          if (window.confirm("Anmeldung wirklich löschen?")) {
                                            deleteRegistrationRequest(req.id);
                                          }
                                        }}
                                      >
                                        Löschen
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}

                    {/* SEPA-Mandat Tab */}
                    {formulareTab === "sepa" && (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <p className="muted" style={{ marginBottom: 8 }}>
                            <strong>SEPA-Mandat Wedding:</strong>{" "}
                            <code style={{
                              background: "var(--bg-inset)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                            }}>
                              {window.location.origin}/sepa
                            </code>
                            <button
                              className="btn micro btnGhost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/sepa`
                                );
                              }}
                            >
                              Kopieren
                            </button>
                          </p>
                          <p className="muted">
                            <strong>SEPA-Mandat Britz:</strong>{" "}
                            <code style={{
                              background: "var(--bg-inset)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                            }}>
                              {window.location.origin}/sepa-britz
                            </code>
                            <button
                              className="btn micro btnGhost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/sepa-britz`
                                );
                              }}
                            >
                              Kopieren
                            </button>
                          </p>
                        </div>

                        {loadingSepaMandates ? (
                          <p className="muted">Lade SEPA-Mandate...</p>
                        ) : sepaMandates.length === 0 ? (
                          <div style={{
                            textAlign: "center",
                            padding: "40px 20px",
                            color: "var(--text-muted)"
                          }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                            <div>Noch keine SEPA-Mandate eingegangen.</div>
                          </div>
                        ) : (
                          <ul className="simpleList">
                            {sepaMandates.map((mandate) => (
                              <li key={mandate.id} className="listItem" style={{ flexDirection: "column", alignItems: "stretch" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                  <div
                                    style={{ flex: 1, cursor: "pointer" }}
                                    onClick={() => setExpandedSepaMandateId(
                                      expandedSepaMandateId === mandate.id ? null : mandate.id
                                    )}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <strong>{mandate.vorname} {mandate.nachname}</strong>
                                      {mandate.ist_kind && (
                                        <span style={{
                                          fontSize: 11,
                                          background: "var(--warning)",
                                          color: "#000",
                                          padding: "2px 6px",
                                          borderRadius: 4
                                        }}>
                                          Kind
                                        </span>
                                      )}
                                      {mandate.anlage && (
                                        <span style={{
                                          fontSize: 11,
                                          background: mandate.anlage === "Britz" ? "#8b5cf6" : "#3b82f6",
                                          color: "#fff",
                                          padding: "2px 6px",
                                          borderRadius: 4
                                        }}>
                                          {mandate.anlage}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: 11,
                                        background: (mandate.status || "neu") === "neu" ? "var(--primary)" :
                                                   (mandate.status || "neu") === "zugeordnet" ? "var(--success)" : "var(--text-muted)",
                                        color: "#fff",
                                        padding: "2px 6px",
                                        borderRadius: 4
                                      }}>
                                        {(mandate.status || "neu") === "neu" ? "Neu" :
                                         (mandate.status || "neu") === "zugeordnet" ? "Zugeordnet" : mandate.status}
                                      </span>
                                    </div>
                                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                                      {mandate.email} • Mandat vom {new Date(mandate.unterschriftsdatum).toLocaleDateString("de-DE")}
                                    </div>
                                  </div>
                                </div>

                                {expandedSepaMandateId === mandate.id && (
                                  <div style={{
                                    marginTop: 12,
                                    padding: 12,
                                    background: "var(--bg-inset)",
                                    borderRadius: 8,
                                    fontSize: 13
                                  }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                                      <div><strong>Name:</strong> {mandate.vorname} {mandate.nachname}</div>
                                      {mandate.ist_kind && mandate.elternteil_name && (
                                        <div><strong>Elternteil:</strong> {mandate.elternteil_name}</div>
                                      )}
                                      <div><strong>E-Mail:</strong> {mandate.email}</div>
                                      <div><strong>IBAN:</strong> <span style={{ fontFamily: "monospace" }}>{mandate.iban.replace(/(.{4})/g, "$1 ").trim()}</span></div>
                                      <div style={{ gridColumn: "1 / -1" }}>
                                        <strong>Adresse:</strong> {mandate.strasse}, {mandate.plz} {mandate.ort}
                                      </div>
                                      <div><strong>Mandatsreferenz:</strong> {mandate.mandatsreferenz}</div>
                                      <div><strong>Unterschrieben:</strong> {new Date(mandate.unterschriftsdatum).toLocaleDateString("de-DE")}</div>
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <select
                                        value={mandate.status || "neu"}
                                        onChange={(e) => updateSepaMandateStatus(mandate.id, e.target.value)}
                                        style={{ fontSize: 13, padding: "4px 8px" }}
                                      >
                                        <option value="neu">Neu</option>
                                        <option value="zugeordnet">Zugeordnet</option>
                                        <option value="erledigt">Erledigt</option>
                                      </select>
                                      <button
                                        className="btn danger"
                                        style={{ fontSize: 13, padding: "4px 12px" }}
                                        onClick={() => deleteSepaMandate(mandate.id)}
                                      >
                                        Löschen
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}

                    {/* Tenniscamp Tab */}
                    {formulareTab === "tenniscamp" && (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <p className="muted" style={{ marginBottom: 12 }}>
                            <strong>Tenniscamp-Anmeldung:</strong>{" "}
                            <code style={{
                              background: "var(--bg-inset)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                            }}>
                              {window.location.origin}/tenniscamp
                            </code>
                            <button
                              className="btn micro btnGhost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/tenniscamp`
                                );
                              }}
                            >
                              Kopieren
                            </button>
                          </p>
                          <p className="muted" style={{ marginBottom: 12 }}>
                            <strong>Tenniscamp-Info:</strong>{" "}
                            <code style={{
                              background: "var(--bg-inset)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                            }}>
                              {window.location.origin}/tenniscamp-info
                            </code>
                            <button
                              className="btn micro btnGhost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/tenniscamp-info`
                                );
                              }}
                            >
                              Kopieren
                            </button>
                          </p>
                        </div>

                        {loadingTenniscampAnmeldungen ? (
                          <p className="muted">Laden...</p>
                        ) : tenniscampAnmeldungen.length === 0 ? (
                          <p className="muted">Keine Tenniscamp-Anmeldungen vorhanden.</p>
                        ) : (
                          <ul className="list">
                            {tenniscampAnmeldungen.map((anmeldung) => (
                              <li key={anmeldung.id} className="listItem" style={{ flexDirection: "column", alignItems: "stretch" }}>
                                <div
                                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                  onClick={() => setExpandedTenniscampId(expandedTenniscampId === anmeldung.id ? null : anmeldung.id)}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontWeight: 500 }}>
                                      {anmeldung.teilnehmer_vorname} {anmeldung.teilnehmer_nachname}
                                    </span>
                                    <span className="muted" style={{ fontSize: 13 }}>
                                      {anmeldung.alter}J
                                    </span>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: anmeldung.camp_type === "kind" ? "#8b5cf6" : "#06b6d4",
                                      color: "#fff",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                    }}>
                                      {anmeldung.camp_type === "kind" ? "Kind" : "Erwachsen"}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: anmeldung.status === "neu" ? "var(--danger)" : anmeldung.status === "bestaetigt" ? "var(--success)" : "var(--text-muted)",
                                      color: "#fff",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                    }}>
                                      {anmeldung.status === "neu" ? "Neu" : anmeldung.status === "bestaetigt" ? "Bestätigt" : anmeldung.status}
                                    </span>
                                    <span style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.2s", transform: expandedTenniscampId === anmeldung.id ? "rotate(90deg)" : "rotate(0deg)" }}>
                                      ▶
                                    </span>
                                  </div>
                                </div>

                                {expandedTenniscampId === anmeldung.id && (
                                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                                      <div>
                                        <div className="muted" style={{ fontSize: 11 }}>Camp</div>
                                        <div style={{ fontWeight: 500 }}>{anmeldung.camp_label}</div>
                                      </div>
                                      <div>
                                        <div className="muted" style={{ fontSize: 11 }}>Zeitraum</div>
                                        <div>{anmeldung.camp_dates}</div>
                                      </div>
                                      <div>
                                        <div className="muted" style={{ fontSize: 11 }}>E-Mail</div>
                                        <div>{anmeldung.email}</div>
                                      </div>
                                      <div>
                                        <div className="muted" style={{ fontSize: 11 }}>Telefon</div>
                                        <div>{anmeldung.telefon}</div>
                                      </div>
                                      {anmeldung.zahlungspflichtiger_vorname && (
                                        <div style={{ gridColumn: "1 / -1" }}>
                                          <div className="muted" style={{ fontSize: 11 }}>Zahlungspflichtiger</div>
                                          <div>{anmeldung.zahlungspflichtiger_vorname} {anmeldung.zahlungspflichtiger_nachname}</div>
                                        </div>
                                      )}
                                      {anmeldung.niveau && (
                                        <div>
                                          <div className="muted" style={{ fontSize: 11 }}>Niveau</div>
                                          <div style={{ fontWeight: 500 }}>{anmeldung.niveau}</div>
                                        </div>
                                      )}
                                      <div style={{ gridColumn: "1 / -1" }}>
                                        <div className="muted" style={{ fontSize: 11 }}>IBAN</div>
                                        <div style={{ fontFamily: "monospace" }}>{anmeldung.iban.replace(/(.{4})/g, "$1 ").trim()}</div>
                                      </div>
                                      <div style={{ gridColumn: "1 / -1" }}>
                                        <div className="muted" style={{ fontSize: 11 }}>Mandatsreferenz</div>
                                        <div style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--primary)" }}>{anmeldung.mandatsreferenz}</div>
                                      </div>
                                      {anmeldung.bemerkungen && (
                                        <div style={{ gridColumn: "1 / -1" }}>
                                          <div className="muted" style={{ fontSize: 11 }}>Bemerkungen</div>
                                          <div style={{ background: "var(--bg-inset)", padding: 8, borderRadius: 4, fontSize: 13 }}>{anmeldung.bemerkungen}</div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
                                      Angemeldet am: {new Date(anmeldung.created_at).toLocaleDateString("de-DE", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <select
                                        value={anmeldung.status}
                                        onChange={(e) => updateTenniscampStatus(anmeldung.id, e.target.value)}
                                        style={{ fontSize: 13, padding: "4px 8px" }}
                                      >
                                        <option value="neu">Neu</option>
                                        <option value="bestaetigt">Bestätigt</option>
                                        <option value="storniert">Storniert</option>
                                      </select>
                                      <button
                                        className="btn micro btnGhost"
                                        onClick={() => {
                                          setNewsletterExtraEmails(prev =>
                                            prev.some(em => em.email === anmeldung.email)
                                              ? prev
                                              : [...prev, { email: anmeldung.email, name: `${anmeldung.teilnehmer_vorname} ${anmeldung.teilnehmer_nachname}` }]
                                          );
                                          setNewsletterSubject(`Tenniscamp ${anmeldung.camp_label}`);
                                          setNewsletterLabelFilter("keine");
                                          setTab("verwaltung");
                                          setVerwaltungTab("newsletter");
                                        }}
                                      >
                                        E-Mail senden
                                      </button>
                                      <button
                                        className="btn danger"
                                        style={{ fontSize: 13, padding: "4px 12px" }}
                                        onClick={() => deleteTenniscampAnmeldung(anmeldung.id)}
                                      >
                                        Löschen
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}

                    {/* Probetraining Tab */}
                    {formulareTab === "probetraining" && (
                      <>
                        <div style={{ marginBottom: 16 }}>
                          <p className="muted" style={{ marginBottom: 12 }}>
                            <strong>Probetraining Wedding:</strong>{" "}
                            <code style={{
                              background: "var(--bg-inset)",
                              padding: "4px 8px",
                              borderRadius: 4,
                              fontSize: 13,
                            }}>
                              {window.location.origin}/anmeldung-wedding-probetraining
                            </code>
                            <button
                              className="btn micro btnGhost"
                              style={{ marginLeft: 8 }}
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/anmeldung-wedding-probetraining`
                                );
                              }}
                            >
                              Kopieren
                            </button>
                          </p>
                        </div>

                        {loadingProbetrainingAnfragen ? (
                          <p className="muted">Laden...</p>
                        ) : probetrainingAnfragen.length === 0 ? (
                          <p className="muted">Keine Probetraining-Anfragen vorhanden.</p>
                        ) : (
                          <ul className="list">
                            {probetrainingAnfragen.map((anfrage) => (
                              <li key={anfrage.id} className="listItem" style={{ flexDirection: "column", alignItems: "stretch" }}>
                                <div
                                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                  onClick={() => setExpandedProbetrainingId(expandedProbetrainingId === anfrage.id ? null : anfrage.id)}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontWeight: 500 }}>
                                      {anfrage.vorname} {anfrage.nachname}
                                    </span>
                                    <span className="muted" style={{ fontSize: 13 }}>
                                      {anfrage.alter}J
                                    </span>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: anfrage.spielstand === "anfaenger" ? "#8b5cf6" : anfrage.spielstand === "fortgeschritten" ? "#06b6d4" : "#22c55e",
                                      color: "#fff",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                    }}>
                                      {anfrage.spielstand === "anfaenger" ? "Anfänger" : anfrage.spielstand === "fortgeschritten" ? "Fortgeschritten" : "Wettkampf"}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      background: anfrage.status === "neu" ? "#f59e0b" : anfrage.status === "kontaktiert" ? "#3b82f6" : anfrage.status === "erledigt" ? "#22c55e" : "var(--text-muted)",
                                      color: "#fff",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                    }}>
                                      {anfrage.status === "neu" ? "Neu" : anfrage.status === "kontaktiert" ? "Kontaktiert" : anfrage.status === "erledigt" ? "Erledigt" : anfrage.status}
                                    </span>
                                    <span style={{ fontSize: 18, color: "var(--text-muted)", transition: "transform 0.2s", transform: expandedProbetrainingId === anfrage.id ? "rotate(90deg)" : "rotate(0deg)" }}>
                                      ▶
                                    </span>
                                  </div>
                                </div>

                                {expandedProbetrainingId === anfrage.id && (
                                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                                      <div>
                                        <span className="muted">E-Mail:</span>{" "}
                                        <span style={{ fontWeight: 500 }}>{anfrage.email || "-"}</span>
                                      </div>
                                      <div>
                                        <span className="muted">Telefon:</span>{" "}
                                        <span style={{ fontWeight: 500 }}>{anfrage.telefon || "-"}</span>
                                      </div>
                                      <div>
                                        <span className="muted">Tennis gespielt:</span>{" "}
                                        <span style={{ fontWeight: 500 }}>{anfrage.hat_tennis_gespielt ? "Ja" : "Nein"}</span>
                                      </div>
                                      <div>
                                        <span className="muted">Vereinsmitglied:</span>{" "}
                                        <span style={{ fontWeight: 500 }}>{anfrage.ist_vereinsmitglied ? "Ja" : "Nein"}</span>
                                      </div>
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                      <span className="muted" style={{ fontSize: 13 }}>Verfügbarkeit:</span>
                                      <div style={{ marginTop: 4, fontSize: 13 }}>
                                        {Object.entries(anfrage.verfuegbarkeit || {}).map(([tag, zeit]) => (
                                          zeit && zeit !== "nicht verfügbar" && (
                                            <span key={tag} style={{
                                              display: "inline-block",
                                              background: "var(--bg-inset)",
                                              padding: "2px 8px",
                                              borderRadius: 4,
                                              marginRight: 6,
                                              marginBottom: 4,
                                            }}>
                                              {tag.charAt(0).toUpperCase() + tag.slice(1)}: {zeit}
                                            </span>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      <select
                                        value={anfrage.status}
                                        onChange={(e) => updateProbetrainingStatus(anfrage.id, e.target.value)}
                                        style={{ fontSize: 13, padding: "6px 10px" }}
                                      >
                                        <option value="neu">Neu</option>
                                        <option value="kontaktiert">Kontaktiert</option>
                                        <option value="erledigt">Erledigt</option>
                                      </select>
                                      <button
                                        className="btn micro btnGhost"
                                        style={{ color: "var(--danger)" }}
                                        onClick={() => deleteProbetrainingAnfrage(anfrage.id)}
                                      >
                                        Löschen
                                      </button>
                                    </div>
                                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                                      Anfrage vom {new Date(anfrage.created_at).toLocaleDateString("de-DE")}
                                    </div>
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                </div>
              </>
            )}

            {tab === "verwaltung" && !isTrainer && verwaltungTab === "newsletter" && (
              <div className="card">
                <h2>Newsletter versenden</h2>
                    <p className="muted" style={{ marginBottom: 16 }}>
                      Senden Sie E-Mails an Ihre Spieler. Wählen Sie optional ein Label um nur bestimmte Spieler anzuschreiben.
                    </p>

                    {newsletterSuccess && (
                      <div style={{
                        background: "#d1fae5",
                        border: "1px solid #10b981",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 16,
                        color: "#065f46"
                      }}>
                        Newsletter erfolgreich versendet!
                        <button
                          className="btn btnGhost"
                          style={{ marginLeft: 12, fontSize: 12 }}
                          onClick={() => setNewsletterSuccess(false)}
                        >
                          Schließen
                        </button>
                      </div>
                    )}

                    {newsletterError && (
                      <div style={{
                        background: "#fee2e2",
                        border: "1px solid #dc2626",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 16,
                        color: "#991b1b"
                      }}>
                        {newsletterError}
                        <button
                          className="btn btnGhost"
                          style={{ marginLeft: 12, fontSize: 12 }}
                          onClick={() => setNewsletterError(null)}
                        >
                          Schließen
                        </button>
                      </div>
                    )}

                    {/* Spieler-Suche und Auswahl */}
                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>Einzelne Spieler suchen und hinzufügen</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          value={newsletterPlayerSearch}
                          onChange={(e) => setNewsletterPlayerSearch(e.target.value)}
                          placeholder="Spielername eingeben..."
                        />
                        {newsletterPlayerSearch.trim() && (
                          <div style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            right: 0,
                            background: "#ffffff",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            maxHeight: 200,
                            overflowY: "auto",
                            zIndex: 9999,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                          }}>
                            {spieler
                              .filter(s =>
                                s.kontaktEmail &&
                                (s.vorname.toLowerCase().includes(newsletterPlayerSearch.toLowerCase()) ||
                                  (s.nachname ?? "").toLowerCase().includes(newsletterPlayerSearch.toLowerCase())) &&
                                !newsletterSelectedPlayers.includes(s.id)
                              )
                              .slice(0, 10)
                              .map(s => (
                                <div
                                  key={s.id}
                                  style={{
                                    padding: "10px 12px",
                                    cursor: "pointer",
                                    borderBottom: "1px solid var(--border)",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 2
                                  }}
                                  onClick={() => {
                                    setNewsletterSelectedPlayers(prev => [...prev, s.id]);
                                    setNewsletterPlayerSearch("");
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <strong style={{ display: "block" }}>{getFullName(s)}</strong>
                                  <span style={{ color: "var(--text-muted)", fontSize: 12, display: "block" }}>
                                    {s.kontaktEmail}
                                  </span>
                                </div>
                              ))}
                            {spieler.filter(s =>
                              s.kontaktEmail &&
                              (s.vorname.toLowerCase().includes(newsletterPlayerSearch.toLowerCase()) ||
                                (s.nachname ?? "").toLowerCase().includes(newsletterPlayerSearch.toLowerCase())) &&
                              !newsletterSelectedPlayers.includes(s.id)
                            ).length === 0 && (
                              <div style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                                Kein Spieler gefunden
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ausgewählte Spieler anzeigen */}
                    {newsletterSelectedPlayers.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", marginBottom: 8 }}>
                          Ausgewählte Spieler ({newsletterSelectedPlayers.length})
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {newsletterSelectedPlayers.map(id => {
                            const s = spielerById.get(id);
                            if (!s) return null;
                            return (
                              <span
                                key={id}
                                style={{
                                  background: "var(--primary)",
                                  color: "white",
                                  padding: "4px 10px",
                                  borderRadius: 16,
                                  fontSize: 13,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6
                                }}
                              >
                                {getFullName(s)}
                                <button
                                  type="button"
                                  onClick={() => setNewsletterSelectedPlayers(prev => prev.filter(pid => pid !== id))}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "white",
                                    cursor: "pointer",
                                    padding: 0,
                                    fontSize: 16,
                                    lineHeight: 1
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                          <button
                            type="button"
                            className="btn btnGhost"
                            style={{ fontSize: 12, padding: "4px 10px" }}
                            onClick={() => setNewsletterSelectedPlayers([])}
                          >
                            Alle entfernen
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Extra E-Mails anzeigen (nicht-Spieler) */}
                    {newsletterExtraEmails.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: "block", marginBottom: 8 }}>
                          Weitere Empfänger ({newsletterExtraEmails.length})
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {newsletterExtraEmails.map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: "#059669",
                                color: "white",
                                padding: "4px 10px",
                                borderRadius: 16,
                                fontSize: 13,
                                display: "flex",
                                alignItems: "center",
                                gap: 6
                              }}
                            >
                              {item.name || item.email}
                              <button
                                type="button"
                                onClick={() => setNewsletterExtraEmails(prev => prev.filter((_, i) => i !== idx))}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "white",
                                  cursor: "pointer",
                                  padding: 0,
                                  fontSize: 16,
                                  lineHeight: 1
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            className="btn btnGhost"
                            style={{ fontSize: 12, padding: "4px 10px" }}
                            onClick={() => setNewsletterExtraEmails([])}
                          >
                            Alle entfernen
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{
                      borderTop: "1px solid var(--border)",
                      paddingTop: 16,
                      marginBottom: 16,
                      display: (newsletterSelectedPlayers.length > 0 || newsletterExtraEmails.length > 0) ? "block" : "none"
                    }}>
                      <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                        — oder zusätzlich per Label filtern —
                      </p>
                    </div>

                    <div className="row" style={{ marginBottom: 16 }}>
                      <div className="field">
                        <label>Empfänger filtern nach Label</label>
                        <select
                          value={newsletterLabelFilter}
                          onChange={(e) => setNewsletterLabelFilter(e.target.value)}
                        >
                          <option value="alle">Alle Spieler mit E-Mail</option>
                          <option value="keine">Keine (nur ausgewählte Spieler)</option>
                          {allLabels.map((label) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field" style={{ alignSelf: "flex-end" }}>
                        <span style={{
                          background: "var(--bg-inset)",
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: 14
                        }}>
                          {getNewsletterRecipients().length} Empfänger
                        </span>
                      </div>
                    </div>

                    {/* Empfänger-Vorschau */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12
                      }}>
                        <label style={{ margin: 0 }}>
                          Empfänger-Vorschau ({getNewsletterRecipients().length})
                        </label>
                        {newsletterExcludedPlayers.length > 0 && (
                          <button
                            type="button"
                            className="btn-text"
                            onClick={() => setNewsletterExcludedPlayers([])}
                            style={{ fontSize: 14 }}
                          >
                            Alle zurücksetzen
                          </button>
                        )}
                      </div>

                      <div style={{
                        background: "var(--bg-inset)",
                        borderRadius: 8,
                        maxHeight: 300,
                        overflowY: "auto",
                        border: "1px solid var(--border-light)"
                      }}>
                        {(() => {
                          const recipients = getNewsletterRecipients();
                          if (recipients.length === 0) {
                            return (
                              <div style={{
                                padding: 24,
                                textAlign: "center",
                                color: "var(--text-muted)"
                              }}>
                                Keine Empfänger ausgewählt...
                              </div>
                            );
                          }

                          // Alphabetisch sortieren
                          const sortedRecipients = [...recipients].sort((a, b) => {
                            const nameA = `${a.vorname} ${a.nachname || ""}`.trim();
                            const nameB = `${b.vorname} ${b.nachname || ""}`.trim();
                            return nameA.localeCompare(nameB);
                          });

                          return sortedRecipients.map((recipient, idx) => (
                            <div
                              key={recipient.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "12px 16px",
                                borderBottom: idx < sortedRecipients.length - 1
                                  ? "1px solid var(--border-light)"
                                  : "none"
                              }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                                  {recipient.vorname} {recipient.nachname || ""}
                                </div>
                                <div style={{
                                  fontSize: 13,
                                  color: "var(--text-muted)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}>
                                  {[recipient.kontaktEmail, ...(recipient.zusaetzlicheEmails || [])].filter(Boolean).join(", ")}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewsletterExcludedPlayers(prev => [...prev, recipient.id]);
                                }}
                                style={{
                                  marginLeft: 12,
                                  padding: "4px 8px",
                                  background: "transparent",
                                  border: "1px solid var(--border-light)",
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  fontSize: 18,
                                  lineHeight: 1,
                                  color: "var(--text-muted)"
                                }}
                                title="Empfänger entfernen"
                              >
                                ×
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>Betreff *</label>
                      <input
                        value={newsletterSubject}
                        onChange={(e) => setNewsletterSubject(e.target.value)}
                        placeholder="E-Mail Betreff eingeben..."
                      />
                    </div>

                    <div className="field" style={{ marginBottom: 16 }}>
                      <label>Nachricht *</label>
                      <textarea
                        rows={10}
                        value={newsletterBody}
                        onChange={(e) => setNewsletterBody(e.target.value)}
                        placeholder="Ihre Nachricht hier eingeben..."
                        style={{ fontFamily: "inherit", resize: "vertical" }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <button
                        className="btn"
                        disabled={newsletterSending || !newsletterSubject.trim() || !newsletterBody.trim() || (getNewsletterRecipients().length === 0 && newsletterExtraEmails.length === 0)}
                        onClick={async () => {
                          const recipients = getNewsletterRecipients();
                          const allEmails = [
                            ...recipients.flatMap(r => [
                              r.kontaktEmail,
                              ...(r.zusaetzlicheEmails || [])
                            ].filter(Boolean)),
                            ...newsletterExtraEmails.map(e => e.email)
                          ];

                          if (allEmails.length === 0) {
                            setNewsletterError("Keine Empfänger mit E-Mail-Adresse gefunden.");
                            return;
                          }

                          if (!window.confirm(`Newsletter an ${allEmails.length} Empfänger senden?`)) {
                            return;
                          }

                          setNewsletterSending(true);
                          setNewsletterError(null);
                          setNewsletterSuccess(false);

                          try {
                            const response = await fetch("/api/send-newsletter", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                to: allEmails,
                                subject: newsletterSubject.trim(),
                                body: newsletterBody.trim(),
                                html: newsletterBody.trim().replace(/\n/g, "<br>"),
                                fromName: "Tennisschule A bis Z"
                              })
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.message || "Fehler beim Versenden");
                            }

                            setNewsletterSuccess(true);
                            setNewsletterSubject("");
                            setNewsletterBody("");
                            setNewsletterSelectedPlayers([]);
                            setNewsletterExcludedPlayers([]);
                            setNewsletterExtraEmails([]);
                          } catch (err) {
                            setNewsletterError(err instanceof Error ? err.message : "Unbekannter Fehler");
                          } finally {
                            setNewsletterSending(false);
                          }
                        }}
                      >
                        {newsletterSending ? "Wird gesendet..." : "Newsletter senden"}
                      </button>

                      {getNewsletterRecipients().length === 0 && newsletterExtraEmails.length === 0 && (
                        <span className="muted">Keine Empfänger ausgewählt.</span>
                      )}
                    </div>

                    {allLabels.length === 0 && (
                      <p className="muted" style={{ marginTop: 20, fontSize: 13 }}>
                        Tipp: Sie können Spielern Labels zuweisen (z.B. "Erwachsene", "Kinder", "Anfänger")
                        um Newsletter gezielt an bestimmte Gruppen zu senden.
                      </p>
                    )}
              </div>
            )}

            {tab === "verwaltung" && isTrainer && (
              <div className="card">
                <h2>Kein Zugriff</h2>
                <p className="muted">
                  Die Verwaltung ist nur für den Hauptaccount verfügbar.
                </p>
              </div>
            )}

            {tab === "abrechnung" && (
              <div className="card">
                <h2>Abrechnung</h2>

                <div className="row">
                  <div className="field">
                    <label>Monat</label>
                    <input
                      type="month"
                      value={abrechnungMonat}
                      onChange={(e) => setAbrechnungMonat(e.target.value)}
                    />
                  </div>
                  {!isTrainer && (
                    <div className="field">
                      <label>Filter</label>
                      <select
                        value={abrechnungFilter}
                        onChange={(e) =>
                          setAbrechnungFilter(
                            e.target.value as AbrechnungFilter
                          )
                        }
                      >
                        <option value="alle">Alle</option>
                        <option value="bezahlt">Nur bezahlt</option>
                        <option value="offen">Nur offen</option>
                        <option value="bar">Nur bar bezahlt</option>
                      </select>
                    </div>
                  )}
                  {!isTrainer && trainers.length > 1 && (
                    <div className="field">
                      <label>Trainer</label>
                      <select
                        value={abrechnungTrainerFilter}
                        onChange={(e) =>
                          setAbrechnungTrainerFilter(e.target.value)
                        }
                      >
                        <option value="alle">Alle Trainer</option>
                        {trainers.map((tr) => (
                          <option key={tr.id} value={tr.id}>
                            {tr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!isTrainer && abrechnungTab === "spieler" && (
                    <div className="field">
                      <label>Spieler Suche</label>
                      <input
                        value={abrechnungSpielerSuche}
                        onChange={(e) =>
                          setAbrechnungSpielerSuche(e.target.value)
                        }
                        placeholder="Name oder Email"
                      />
                    </div>
                  )}
                  {!isTrainer && abrechnungTab === "spieler" && (
                    <div className="field">
                      <label>Tag (wiederkehrend)</label>
                      <select
                        value={abrechnungTagFilter}
                        onChange={(e) => setAbrechnungTagFilter(e.target.value)}
                      >
                        <option value="alle">Alle Tage</option>
                        <option value="0">Montag</option>
                        <option value="1">Dienstag</option>
                        <option value="2">Mittwoch</option>
                        <option value="3">Donnerstag</option>
                        <option value="4">Freitag</option>
                        <option value="5">Samstag</option>
                        <option value="6">Sonntag</option>
                      </select>
                    </div>
                  )}
                  {!isTrainer && abrechnungTab === "spieler" && (
                    <div className="field">
                      <label>Abgebucht</label>
                      <select
                        value={abrechnungAbgebuchtFilter}
                        onChange={(e) => setAbrechnungAbgebuchtFilter(e.target.value)}
                      >
                        <option value="alle">Alle</option>
                        <option value="abgebucht">Abgebucht</option>
                        <option value="nicht_abgebucht">Nicht abgebucht</option>
                      </select>
                    </div>
                  )}
                </div>

                {!isTrainer && (
                  <div className="subTabs">
                    <button
                      className={`tabBtn ${
                        abrechnungTab === "spieler" ? "tabBtnActive" : ""
                      }`}
                      onClick={() => setAbrechnungTab("spieler")}
                    >
                      Spieler Abrechnung
                    </button>
                    <button
                      className={`tabBtn ${
                        abrechnungTab === "trainer" ? "tabBtnActive" : ""
                      }`}
                      onClick={() => setAbrechnungTab("trainer")}
                    >
                      Trainer Abrechnung
                    </button>
                  </div>
                )}

                {abrechnungTab === "spieler" && !isTrainer && (
                  <>
                    <div className="row" style={{ marginTop: 12 }}>
                      <span className="pill">
                        Umsatz gesamt:{" "}
                        <strong>{euro(abrechnung.total)}</strong>
                      </span>

                      {abrechnung.barTotal > 0 && (
                        <>
                          <span className="pill">
                            Bar bezahlt (Stunden):{" "}
                            <strong>{euro(abrechnung.barTotal)}</strong>
                          </span>
                          <span className="pill">
                            Umsatz inkl. Bar:{" "}
                            <strong>{euro(abrechnung.totalMitBar)}</strong>
                          </span>
                        </>
                      )}

                      <span className="pill">
                        Bereits bezahlt: <strong>{euro(sumBezahlt)}</strong>
                      </span>
                      <span className="pill">
                        Offen: <strong>{euro(sumOffen)}</strong>
                      </span>
                    </div>

                    <div style={{ height: 10 }} />
                    <div className="muted">
                      Hinweis: Der Status bezahlt gilt immer für einen Spieler
                      im ausgewählten Monat.
                    </div>

                    <div style={{ height: 14 }} />
                    <div className="card cardInset">
                      <h2>Summe pro Spieler</h2>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Spieler</th>
                            <th>Aufstellung</th>
                            <th>Summe</th>
                            <th>Status</th>
                            <th>Aktion</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSpielerRowsForMonth.map((r) => {
                            // 5c: Getrennte Aufstellung für Bar und Nicht-Bar
                            const barParts = r.breakdownBar
                              .map((b) => `${b.count} × ${euro(b.amount)} bar`)
                              .join(" + ");
                            const nichtBarParts = r.breakdownNichtBar
                              .map((b) => `${b.count} × ${euro(b.amount)}`)
                              .join(" + ");

                            // Anpassung für diesen Spieler/Monat
                            const adjustmentKey = `${abrechnungMonat}__${r.id}`;
                            const adjustment = getAdjustmentForSpieler(r.id);
                            const hasAdjustment = adjustment !== 0;

                            let breakdownText = "-";
                            if (barParts && nichtBarParts) {
                              // Gemischter Fall: beide Teile anzeigen
                              breakdownText = `${barParts} + ${nichtBarParts}`;
                            } else if (barParts) {
                              // Nur Bar
                              breakdownText = barParts;
                            } else if (nichtBarParts) {
                              // Nur Nicht-Bar
                              breakdownText = nichtBarParts;
                            }

                            // Anpassung zum Breakdown hinzufügen wenn vorhanden
                            if (hasAdjustment) {
                              const adjustmentStr = adjustment < 0
                                ? `${euro(adjustment)}`
                                : `+${euro(adjustment)}`;
                              if (breakdownText === "-") {
                                breakdownText = adjustmentStr;
                              } else {
                                breakdownText = `${breakdownText} ${adjustmentStr}`;
                              }
                            }

                            const key = paymentKey(abrechnungMonat, r.id);
                            const paymentsFlag = payments[key] ?? false;

                            // Berechne Bar-Summen
                            const sumBarSpieler = getSumBarForSpieler(r.id);
                            const sumTotalSpieler = r.sum;
                            const adjustedSum = getAdjustedSum(r.id, sumTotalSpieler);
                            const restOffen = round2(adjustedSum - sumBarSpieler);
                            
                            // Status-Logik gemäß Spezifikation (mit angepasster Summe):
                            // 1. "komplett bar": sumBarSpieler === adjustedSum && adjustedSum > 0
                            // 2. "teilweise bar bezahlt": 0 < sumBarSpieler < adjustedSum
                            // 3. "komplett abgerechnet": paymentsFlag === true && adjustedSum > sumBarSpieler
                            // 4. "offen": paymentsFlag === false && adjustedSum > sumBarSpieler

                            type SpielerStatus = "komplett_bar" | "teilweise_bar" | "komplett_abgerechnet" | "offen" | "keine_trainings";

                            let status: SpielerStatus;
                            if (adjustedSum === 0) {
                              status = "keine_trainings";
                            } else if (sumBarSpieler >= adjustedSum && adjustedSum > 0) {
                              status = "komplett_bar";
                            } else if (sumBarSpieler > 0 && sumBarSpieler < adjustedSum) {
                              // Teilweise bar - prüfe ob Rest abgerechnet wurde
                              if (paymentsFlag) {
                                status = "komplett_abgerechnet";
                              } else {
                                status = "teilweise_bar";
                              }
                            } else {
                              // Keine Bar-Zahlungen
                              if (paymentsFlag) {
                                status = "komplett_abgerechnet";
                              } else {
                                status = "offen";
                              }
                            }
                            
                            // Status-Badge Konfiguration
                            let statusLabel: string;
                            let statusClass: string;
                            let statusStyle: React.CSSProperties = {};
                            
                            switch (status) {
                              case "komplett_bar":
                                statusLabel = "komplett bar";
                                statusClass = "badge";
                                statusStyle = { backgroundColor: "#dc2626", color: "white" };
                                break;
                              case "teilweise_bar":
                                statusLabel = `teilw. bar (${euro(sumBarSpieler)})`;
                                statusClass = "badge";
                                statusStyle = { backgroundColor: "#f59e0b", color: "white" };
                                break;
                              case "komplett_abgerechnet":
                                statusLabel = "abgerechnet";
                                statusClass = "badge badgeOk";
                                break;
                              case "offen":
                                statusLabel = "offen";
                                statusClass = "badge";
                                break;
                              case "keine_trainings":
                                statusLabel = "keine Trainings";
                                statusClass = "badge";
                                statusStyle = { backgroundColor: "#9ca3af", color: "white" };
                                break;
                            }
                            
                            // Dropdown-Styling
                            let selectStyle: React.CSSProperties = {
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid #d1d5db",
                              fontSize: 13,
                              cursor: "pointer",
                              minWidth: 180,
                            };
                            
                            if (status === "komplett_bar") {
                              selectStyle = {
                                ...selectStyle,
                                backgroundColor: "#dc2626",
                                color: "white",
                                borderColor: "#dc2626",
                              };
                            } else if (status === "teilweise_bar") {
                              selectStyle = {
                                ...selectStyle,
                                backgroundColor: "#f59e0b",
                                color: "white",
                                borderColor: "#f59e0b",
                              };
                            } else if (status === "komplett_abgerechnet") {
                              selectStyle = {
                                ...selectStyle,
                                backgroundColor: "#16a34a",
                                color: "white",
                                borderColor: "#16a34a",
                              };
                            }

                            // Dropdown-Wert
                            const dropdownValue = status === "komplett_abgerechnet" ? "abgerechnet" : status;

                            const isEditingThis = editingAdjustment?.spielerId === r.id;

                            return (
                              <tr key={r.id}>
                                <td>
                                  <span
                                    style={{
                                      cursor: "pointer",
                                      color: "var(--primary)",
                                      textDecoration: "underline",
                                    }}
                                    onClick={() => setSelectedSpielerForDetail(r.id)}
                                  >
                                    {r.name}
                                  </span>
                                </td>
                                <td>{breakdownText}</td>
                                <td>
                                  {isEditingThis ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                      <input
                                        type="text"
                                        style={{
                                          width: 80,
                                          padding: "4px 6px",
                                          fontSize: 13,
                                          border: "1px solid var(--primary)",
                                          borderRadius: 4,
                                        }}
                                        value={editingAdjustment.value}
                                        onChange={(e) => setEditingAdjustment({
                                          ...editingAdjustment,
                                          value: e.target.value,
                                        })}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            const desiredSum = parseFloat(editingAdjustment.value.replace(",", "."));
                                            if (!isNaN(desiredSum)) {
                                              // Benutzer gibt gewünschte Endsumme ein, wir berechnen das Delta
                                              const newAdjustment = round2(desiredSum - sumTotalSpieler);
                                              setMonthlyAdjustments((prev) => ({
                                                ...prev,
                                                [adjustmentKey]: newAdjustment,
                                              }));
                                            }
                                            setEditingAdjustment(null);
                                          }
                                          if (e.key === "Escape") {
                                            setEditingAdjustment(null);
                                          }
                                        }}
                                        onBlur={() => {
                                          const desiredSum = parseFloat(editingAdjustment.value.replace(",", "."));
                                          if (!isNaN(desiredSum)) {
                                            // Benutzer gibt gewünschte Endsumme ein, wir berechnen das Delta
                                            const newAdjustment = round2(desiredSum - sumTotalSpieler);
                                            setMonthlyAdjustments((prev) => ({
                                              ...prev,
                                              [adjustmentKey]: newAdjustment,
                                            }));
                                          }
                                          setEditingAdjustment(null);
                                        }}
                                        autoFocus
                                        placeholder={euro(sumTotalSpieler)}
                                      />
                                    </div>
                                  ) : (
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                    >
                                      <span style={{ fontWeight: hasAdjustment ? 600 : 400 }}>
                                        {euro(adjustedSum)}
                                      </span>
                                      {hasAdjustment && (
                                        <button
                                          style={{
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 2,
                                            fontSize: 12,
                                            color: "#9ca3af",
                                          }}
                                          onClick={() => {
                                            setMonthlyAdjustments((prev) => {
                                              const next = { ...prev };
                                              delete next[adjustmentKey];
                                              return next;
                                            });
                                          }}
                                          title="Zurücksetzen auf berechnet"
                                        >
                                          ✕
                                        </button>
                                      )}
                                      <button
                                        style={{
                                          background: "none",
                                          border: "none",
                                          cursor: "pointer",
                                          padding: 2,
                                          fontSize: 12,
                                          color: hasAdjustment ? "var(--primary)" : "#9ca3af",
                                        }}
                                        onClick={() => setEditingAdjustment({
                                          spielerId: r.id,
                                          value: String(adjustedSum),
                                        })}
                                        title="Summe anpassen"
                                      >
                                        ✎
                                      </button>
                                    </div>
                                  )}
                                  {status === "teilweise_bar" && (
                                    <div style={{ fontSize: 11, color: "#f59e0b" }}>
                                      (Rest: {euro(restOffen)})
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span className={statusClass} style={statusStyle}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <select
                                      style={selectStyle}
                                      value={dropdownValue}
                                      onChange={(e) => {
                                        const newVal = e.target.value;
                                        if (newVal === "abgerechnet") {
                                          if (!paymentsFlag) {
                                            togglePaidForPlayer(abrechnungMonat, r.id);
                                          }
                                        } else if (newVal === "offen" || newVal === "teilweise_bar") {
                                          if (paymentsFlag) {
                                            togglePaidForPlayer(abrechnungMonat, r.id);
                                          }
                                        }
                                      }}
                                    >
                                      {status === "komplett_bar" && (
                                        <option value="komplett_bar">✓ Komplett bar bezahlt</option>
                                      )}
                                      {(status === "teilweise_bar") && (
                                        <option value="teilweise_bar">⚠ Teilweise bar ({euro(sumBarSpieler)})</option>
                                      )}
                                      <option value="abgerechnet">
                                        ✓ Komplett abgerechnet
                                      </option>
                                      <option value="offen">○ Offen</option>
                                    </select>
                                    <label style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 4,
                                      fontSize: 12,
                                      cursor: "pointer",
                                      whiteSpace: "nowrap",
                                      color: wirdAbgebucht[`${abrechnungMonat}__${r.id}`] ? "var(--primary)" : "var(--text-muted)"
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={wirdAbgebucht[`${abrechnungMonat}__${r.id}`] ?? false}
                                        onChange={(e) => {
                                          setWirdAbgebucht((prev) => ({
                                            ...prev,
                                            [`${abrechnungMonat}__${r.id}`]: e.target.checked,
                                          }));
                                        }}
                                        style={{ width: "auto" }}
                                      />
                                      abgebucht
                                    </label>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Detail-Ansicht für ausgewählten Spieler */}
                    {selectedSpielerForDetail && (() => {
                      const spielerData = spielerById.get(selectedSpielerForDetail);
                      const spielerName = spielerData ? getFullName(spielerData) : "Unbekannt";

                      // Trainings dieses Spielers im gewählten Monat
                      const spielerTrainings = trainingsForAbrechnung.filter(
                        (t) => t.spielerIds.includes(selectedSpielerForDetail)
                      );

                      // Sortiere nach Datum
                      const sortedTrainings = [...spielerTrainings].sort(
                        (a, b) => a.datum.localeCompare(b.datum)
                      );

                      // Monatliche Tarife: Berechne Wochentage pro Tarif
                      const monthlyTarifSummary = new Map<string, {
                        tarifName: string;
                        preisProStunde: number;
                        weekdays: Set<string>;
                      }>();

                      sortedTrainings.forEach((t) => {
                        const cfg = getPreisConfig(t, tarifById);
                        if (cfg?.abrechnung === "monatlich") {
                          const tarifKey = t.tarifId || `custom-${cfg.preisProStunde}`;
                          const trainingDate = new Date(t.datum + "T12:00:00");
                          const weekday = trainingDate.getDay();

                          if (!monthlyTarifSummary.has(tarifKey)) {
                            const tarifData = t.tarifId ? tarifById.get(t.tarifId) : null;
                            monthlyTarifSummary.set(tarifKey, {
                              tarifName: tarifData?.name || "Monatlich",
                              preisProStunde: cfg.preisProStunde,
                              weekdays: new Set<string>(),
                            });
                          }
                          // Zähle Trainings nach Wochentag UND Uhrzeit
                          monthlyTarifSummary.get(tarifKey)!.weekdays.add(`${weekday}_${t.uhrzeitVon}_${t.uhrzeitBis}`);
                        }
                      });

                      // Gesamt monatliche Summe berechnen
                      let monthlyTotal = 0;
                      monthlyTarifSummary.forEach((entry) => {
                        monthlyTotal += entry.preisProStunde * entry.weekdays.size;
                      });

                      // Nicht-monatliche Trainings Summe
                      let regularTotal = 0;
                      sortedTrainings.forEach((t) => {
                        const cfg = getPreisConfig(t, tarifById);
                        if (cfg && cfg.abrechnung !== "monatlich") {
                          regularTotal += priceFuerSpieler(t);
                        }
                      });

                      return (
                        <div
                          className="modalOverlay"
                          onClick={() => setSelectedSpielerForDetail(null)}
                        >
                          <div
                            className="modalCard"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: 700, maxHeight: "85vh", overflow: "auto" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                              <h2 style={{ margin: 0 }}>
                                Trainings von {spielerName}
                              </h2>
                              <button
                                onClick={() => setSelectedSpielerForDetail(null)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  fontSize: 24,
                                  cursor: "pointer",
                                  color: "#666",
                                }}
                              >
                                ×
                              </button>
                            </div>
                            <div className="muted" style={{ marginBottom: 12 }}>
                              {abrechnungMonat} • {sortedTrainings.length} Training{sortedTrainings.length !== 1 ? "s" : ""}
                            </div>

                            {sortedTrainings.length === 0 ? (
                              <p>Keine Trainings in diesem Monat.</p>
                            ) : (
                              <>
                                <table className="table">
                                  <thead>
                                    <tr>
                                      <th>Datum</th>
                                      <th>Uhrzeit</th>
                                      <th>Trainer</th>
                                      <th>Preis</th>
                                      <th>Bar</th>
                                      <th>Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedTrainings.map((t) => {
                                      const vertretung = vertretungen.find(v => v.trainingId === t.id);
                                      const trainerId = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
                                      const trainerName = trainerById.get(trainerId)?.name ?? "Unbekannt";
                                      const cfg = getPreisConfig(t, tarifById);
                                      const isMonthly = cfg?.abrechnung === "monatlich";
                                      const preis = isMonthly ? null : priceFuerSpieler(t);
                                      const datum = new Date(t.datum);
                                      const wochentag = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][datum.getDay()];

                                      return (
                                        <tr key={t.id}>
                                          <td>{wochentag}, {t.datum.split("-").reverse().join(".")}</td>
                                          <td>{t.uhrzeitVon} - {t.uhrzeitBis}</td>
                                          <td>
                                            {trainerName}
                                            {vertretung && (
                                              <span style={{ color: "#dc2626", marginLeft: 4 }} title="Vertretung">V</span>
                                            )}
                                          </td>
                                          <td>
                                            {isMonthly ? (
                                              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>mtl.</span>
                                            ) : (
                                              euro(preis ?? 0)
                                            )}
                                          </td>
                                          <td>{t.barBezahlt ? "Ja" : "Nein"}</td>
                                          <td>
                                            <span className={`badge ${t.status === "durchgefuehrt" ? "badgeOk" : t.status === "abgesagt" ? "badgeError" : ""}`}>
                                              {t.status === "durchgefuehrt" ? "durchgeführt" : t.status === "abgesagt" ? "abgesagt" : t.status}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>

                                {/* Zusammenfassung */}
                                <div style={{
                                  marginTop: 16,
                                  padding: 12,
                                  background: "var(--bg-inset)",
                                  borderRadius: "var(--radius-md)"
                                }}>
                                  {monthlyTarifSummary.size > 0 && (
                                    <div style={{ marginBottom: regularTotal > 0 ? 8 : 0 }}>
                                      {Array.from(monthlyTarifSummary.entries()).map(([key, entry]) => (
                                        <div key={key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                          <span>{entry.tarifName} ({entry.weekdays.size}x Wochentag á {euro(entry.preisProStunde)})</span>
                                          <strong>{euro(entry.preisProStunde * entry.weekdays.size)}</strong>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {regularTotal > 0 && (
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                      <span>Einzeltrainings</span>
                                      <strong>{euro(regularTotal)}</strong>
                                    </div>
                                  )}
                                  <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    borderTop: "1px solid var(--border)",
                                    paddingTop: 8,
                                    marginTop: 8,
                                    fontWeight: 600
                                  }}>
                                    <span>Gesamt</span>
                                    <span style={{ color: "var(--primary)" }}>{euro(monthlyTotal + regularTotal)}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                                {abrechnungTab === "trainer" && (
                  <>
                    {!isTrainer &&
                      !(
                        abrechnungTrainerFilter !== "alle" &&
                        (trainerById.get(abrechnungTrainerFilter)?.name ?? "")
                          .trim()
                          .toLowerCase() === "sascha"
                      ) && (
                        <div className="row" style={{ marginTop: 12 }}>
                          <span className="pill">
                            Honorar bezahlt:{" "}
                            <strong>{euro(trainerHonorarBezahltTotal)}</strong>
                          </span>
                          <span className="pill">
                            Honorar offen:{" "}
                            <strong>{euro(trainerHonorarOffenTotal)}</strong>
                          </span>
                          <span className="pill">
                            Rückzahlung an Schule (bar):{" "}
                            <strong>{euro(effectiveRueckzahlung)}</strong>
                          </span>
                        </div>
                      )}

                    {/* Bar/Nicht-Bar Stunden für Admin (wenn ein Trainer gefiltert) */}
                    {!isTrainer && abrechnungTrainerFilter !== "alle" && (
                      <>
                        <div style={{ height: 14 }} />
                        <div className="card cardInset">
                          <h2>Übersicht Stunden</h2>
                          <p className="muted" style={{ marginBottom: 8 }}>Klicke auf eine Zeile, um die Details anzuzeigen.</p>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Art</th>
                                <th>Anzahl</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                onClick={() => setAdminTrainerPaymentView(adminTrainerPaymentView === "nichtBar" ? "none" : "nichtBar")}
                                style={{
                                  cursor: "pointer",
                                  backgroundColor: adminTrainerPaymentView === "nichtBar" ? "var(--surface-hover)" : undefined
                                }}
                              >
                                <td>Nicht bar</td>
                                <td>{adminNichtBarTrainings.length}</td>
                              </tr>
                              <tr
                                onClick={() => setAdminTrainerPaymentView(adminTrainerPaymentView === "bar" ? "none" : "bar")}
                                style={{
                                  cursor: "pointer",
                                  backgroundColor: adminTrainerPaymentView === "bar" ? "var(--surface-hover)" : undefined
                                }}
                              >
                                <td>Bar</td>
                                <td>{adminBarTrainings.length}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Detailansicht der Stunden für Admin */}
                        {adminTrainerPaymentView !== "none" && (
                          <div className="card cardInset" style={{ marginTop: 14 }}>
                            <h2>
                              {adminTrainerPaymentView === "bar"
                                ? "Bar bezahlte Stunden"
                                : "Nicht bar bezahlte Stunden"}
                            </h2>
                            {(adminTrainerPaymentView === "bar" ? adminBarTrainings : adminNichtBarTrainings).length === 0 ? (
                              <p className="muted">
                                {adminTrainerPaymentView === "bar"
                                  ? "Keine bar bezahlten Stunden im ausgewählten Zeitraum."
                                  : "Keine nicht bar bezahlten Stunden im ausgewählten Zeitraum."}
                              </p>
                            ) : (
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Datum</th>
                                    <th>Zeit</th>
                                    <th>Spieler</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(adminTrainerPaymentView === "bar" ? adminBarTrainings : adminNichtBarTrainings)
                                    .sort((a, b) => a.datum.localeCompare(b.datum) || a.uhrzeitVon.localeCompare(b.uhrzeitVon))
                                    .map((t) => {
                                      const [y, m, d] = t.datum.split("-");
                                      const germanDate = d && m && y ? `${d}.${m}.${y}` : t.datum;
                                      const spielerNamen = t.spielerIds
                                        .map((id) => getSpielerDisplayName(id))
                                        .join(", ");
                                      return (
                                        <tr key={t.id}>
                                          <td>{germanDate}</td>
                                          <td>{t.uhrzeitVon} - {t.uhrzeitBis}</td>
                                          <td>{spielerNamen}</td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Abrechnungsstatus für Admin - mit Toggle */}
                    {!isTrainer && abrechnungTrainerFilter !== "alle" && (
                      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Honorar-Abrechnung */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ minWidth: 140 }}>Honorar:</span>
                          {trainerMonthSettled[trainerMonthSettledKey(abrechnungMonat, abrechnungTrainerFilter)] ? (
                            <>
                              <span style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 18 }}>✓</span> Abgerechnet
                              </span>
                              <button
                                className="btn btnGhost"
                                style={{ fontSize: 12, padding: "4px 10px" }}
                                onClick={() => {
                                  const key = trainerMonthSettledKey(abrechnungMonat, abrechnungTrainerFilter);
                                  setTrainerMonthSettled((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }}
                              >
                                Markierung entfernen
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 18 }}>○</span> Nicht abgerechnet
                              </span>
                              <button
                                className="btn"
                                style={{ fontSize: 12, padding: "4px 10px" }}
                                onClick={() => {
                                  const key = trainerMonthSettledKey(abrechnungMonat, abrechnungTrainerFilter);
                                  setTrainerMonthSettled((prev) => ({ ...prev, [key]: true }));
                                  // Alle nicht-bar Trainings dieses Trainers als abgerechnet markieren
                                  const trainerTrainings = trainingsInMonth.filter((t) => {
                                    const vertretung = vertretungen.find(v => v.trainingId === t.id);
                                    const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
                                    return tid === abrechnungTrainerFilter && !t.barBezahlt;
                                  });
                                  if (trainerTrainings.length > 0) {
                                    setTrainerPayments((prev) => {
                                      const next = { ...prev };
                                      trainerTrainings.forEach((t) => {
                                        next[t.id] = true;
                                      });
                                      return next;
                                    });
                                  }
                                }}
                              >
                                Als abgerechnet markieren
                              </button>
                            </>
                          )}
                        </div>

                        {/* Bar-Abrechnung */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ minWidth: 140 }}>Bar-Rückzahlung:</span>
                          {trainerBarSettled[trainerBarSettledKey(abrechnungMonat, abrechnungTrainerFilter)] ? (
                            <>
                              <span style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 18 }}>✓</span> Erledigt
                              </span>
                              <button
                                className="btn btnGhost"
                                style={{ fontSize: 12, padding: "4px 10px" }}
                                onClick={() => {
                                  const key = trainerBarSettledKey(abrechnungMonat, abrechnungTrainerFilter);
                                  setTrainerBarSettled((prev) => {
                                    const next = { ...prev };
                                    delete next[key];
                                    return next;
                                  });
                                }}
                              >
                                Markierung entfernen
                              </button>
                            </>
                          ) : (
                            <>
                              <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 18 }}>○</span> Nicht erledigt
                              </span>
                              <button
                                className="btn"
                                style={{ fontSize: 12, padding: "4px 10px" }}
                                onClick={() => {
                                  const key = trainerBarSettledKey(abrechnungMonat, abrechnungTrainerFilter);
                                  setTrainerBarSettled((prev) => ({ ...prev, [key]: true }));
                                }}
                              >
                                Als erledigt markieren
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {isTrainer &&
                      !(
                        (trainerById.get(ownTrainerId)?.name ?? "")
                          .trim()
                          .toLowerCase() === "sascha"
                      ) && (
                        <div className="row" style={{ marginTop: 12 }}>
                          <span className="pill">
                            Honorar bezahlt:{" "}
                            <strong>{euro(eigenerHonorarBezahlt)}</strong>
                          </span>
                          <span className="pill">
                            Honorar offen:{" "}
                            <strong>{euro(eigenerHonorarOffen)}</strong>
                          </span>
                          <span className="pill">
                            Rückzahlung an Schule (bar):{" "}
                            <strong>{euro(rueckzahlungTrainerOffen)}</strong>
                          </span>
                        </div>
                      )}

                    {/* Abrechnungsstatus für Trainer - nur lesen */}
                    {isTrainer && ownTrainerId && (
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                        {trainerMonthSettled[trainerMonthSettledKey(abrechnungMonat, ownTrainerId)] ? (
                          <span style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 18 }}>✓</span> Abgerechnet
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 18 }}>○</span> Nicht abgerechnet
                          </span>
                        )}
                      </div>
                    )}

                    {/* Rechnung erstellen Button für Trainer */}
                    {isTrainer && ownTrainerId && (
                      <div style={{ marginTop: 16 }}>
                        <button
                          className="btn"
                          onClick={() => {
                            // Lade gespeicherte Invoice-Einstellungen (als Fallback)
                            const savedSettings = localStorage.getItem(TRAINER_INVOICE_SETTINGS_KEY);
                            const parsed = savedSettings ? JSON.parse(savedSettings) : {};
                            const trainerData = trainerById.get(ownTrainerId);
                            // Trainer-Profil hat Priorität, localStorage ist Fallback
                            setInvoiceDialog({
                              stundenAnzahl: nichtBarTrainings.length,
                              iban: trainerData?.iban ?? parsed.iban ?? "",
                              adresse: trainerData?.adresse ?? "",
                              ustIdNr: trainerData?.ustIdNr ?? parsed.ustIdNr ?? "",
                              kleinunternehmer: trainerData?.kleinunternehmer ?? parsed.kleinunternehmer ?? false,
                            });
                            setInvoiceError("");
                          }}
                        >
                          Rechnung für diesen Monat erstellen
                        </button>
                      </div>
                    )}

                    {isTrainer && (
                      <>
                        <div style={{ height: 14 }} />
                        <div className="card cardInset">
                          <h2>Übersicht deine Stunden</h2>
                          <p className="muted" style={{ marginBottom: 8 }}>Klicke auf eine Zeile, um die Details anzuzeigen.</p>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Art</th>
                                <th>Anzahl</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                onClick={() => setSelectedTrainerPaymentView(selectedTrainerPaymentView === "nichtBar" ? "none" : "nichtBar")}
                                style={{
                                  cursor: "pointer",
                                  backgroundColor: selectedTrainerPaymentView === "nichtBar" ? "var(--surface-hover)" : undefined
                                }}
                              >
                                <td>Nicht bar</td>
                                <td>{nichtBarTrainings.length}</td>
                              </tr>
                              <tr
                                onClick={() => setSelectedTrainerPaymentView(selectedTrainerPaymentView === "bar" ? "none" : "bar")}
                                style={{
                                  cursor: "pointer",
                                  backgroundColor: selectedTrainerPaymentView === "bar" ? "var(--surface-hover)" : undefined
                                }}
                              >
                                <td>Bar</td>
                                <td>{barTrainings.length}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Detailansicht der Trainerstunden */}
                        {selectedTrainerPaymentView !== "none" && (
                          <div className="card cardInset" style={{ marginTop: 14 }}>
                            <h2>
                              {selectedTrainerPaymentView === "bar"
                                ? "Bar bezahlte Stunden"
                                : "Nicht bar bezahlte Stunden"}
                            </h2>
                            {(selectedTrainerPaymentView === "bar" ? barTrainings : nichtBarTrainings).length === 0 ? (
                              <p className="muted">
                                {selectedTrainerPaymentView === "bar"
                                  ? "Keine bar bezahlten Stunden im ausgewählten Zeitraum."
                                  : "Keine nicht bar bezahlten Stunden im ausgewählten Zeitraum."}
                              </p>
                            ) : (
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Datum</th>
                                    <th>Zeit</th>
                                    <th>Spieler</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(selectedTrainerPaymentView === "bar" ? barTrainings : nichtBarTrainings)
                                    .sort((a, b) => a.datum.localeCompare(b.datum) || a.uhrzeitVon.localeCompare(b.uhrzeitVon))
                                    .map((t) => {
                                      const [y, m, d] = t.datum.split("-");
                                      const germanDate = d && m && y ? `${d}.${m}.${y}` : t.datum;
                                      const spielerNamen = t.spielerIds
                                        .map((id) => getSpielerDisplayName(id))
                                        .join(", ");
                                      return (
                                        <tr key={t.id}>
                                          <td>{germanDate}</td>
                                          <td>{t.uhrzeitVon} - {t.uhrzeitBis}</td>
                                          <td>{spielerNamen}</td>
                                        </tr>
                                      );
                                    })}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ height: 10 }} />
                    {!isTrainer && (
                      <div className="muted">
                        Hinweis: Das Trainerhonorar wird pro Training
                        abgerechnet. Der Filter oben bezieht sich hier auf den
                        Honorarstatus.
                      </div>
                    )}

                    {!isTrainer && trainers.length > 1 && (
                      <>
                        <div style={{ height: 14 }} />
                        <div className="card cardInset">
                          <h2>Summe pro Trainer</h2>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Trainer</th>
                                <th>Trainings</th>
                                <th>Umsatz</th>
                                <th>Trainer Honorar</th>
                                <th>Honorar bezahlt</th>
                                <th>Honorar offen</th>
                              </tr>
                            </thead>
                            <tbody>
                              {abrechnungTrainer.rows.map((r) => {
                                const isSascha = r.name.trim().toLowerCase() === "sascha";

                                if (isSascha) {
                                  // Für Sascha: Bar/Nicht-Bar Stunden zählen (Vertretung berücksichtigen)
                                  const saschaTrainings = trainingsForAbrechnung.filter((t) => {
                                    const vertretung = vertretungen.find(v => v.trainingId === t.id);
                                    const tid = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
                                    return tid === r.id;
                                  });
                                  const nichtBarCount = saschaTrainings.filter(
                                    (t) => !t.barBezahlt
                                  ).length;
                                  const barCount = saschaTrainings.filter(
                                    (t) => t.barBezahlt
                                  ).length;
                                  
                                  return (
                                    <tr key={r.id}>
                                      <td>{r.name}</td>
                                      <td>{r.trainings}</td>
                                      <td colSpan={2} style={{ textAlign: "center" }}>
                                        Nicht bar: {nichtBarCount}
                                      </td>
                                      <td colSpan={2} style={{ textAlign: "center" }}>
                                        Bar: {barCount}
                                      </td>
                                    </tr>
                                  );
                                }
                                
                                return (
                                  <tr key={r.id}>
                                    <td>{r.name}</td>
                                    <td>{r.trainings}</td>
                                    <td>{euro(r.sum)}</td>
                                    <td>{euro(r.honorar)}</td>
                                    <td>{euro(r.honorarBezahlt)}</td>
                                    <td>{euro(r.honorarOffen)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}


                {!isTrainer && abrechnungTab === "trainer" && (
                    <>
                      <div style={{ height: 14 }} />
                      <h2>Trainings im Monat</h2>
                      <ul className="list">
                        {trainingsForAbrechnung.map((t) => {
                          const tarif = t.tarifId
                            ? tarifById.get(t.tarifId)
                            : undefined;
                          const ta = tarif
                            ? tarif.abrechnung === "monatlich"
                              ? `${tarif.name} (monatlich ${tarif.preisProStunde} EUR)`
                              : tarif.name
                            : t.customPreisProStunde
                            ? `Individuell (${t.customPreisProStunde} EUR pro Stunde)`
                            : "Tarif";
                          
                          // Bei aktiver Spielersuche nur gesuchte Spieler anzeigen
                          const searchQ = abrechnungSpielerSuche.trim().toLowerCase();
                          const filteredSpielerIds = searchQ
                            ? t.spielerIds.filter((sid) => {
                                const s = spielerById.get(sid);
                                return s && (
                                  s.vorname.toLowerCase().includes(searchQ) ||
                                  (s.nachname ?? "").toLowerCase().includes(searchQ) ||
                                  (s.kontaktEmail ?? "").toLowerCase().includes(searchQ)
                                );
                              })
                            : t.spielerIds;
                          
                          const sp = filteredSpielerIds
                            .map(
                              (id) => getSpielerDisplayName(id)
                            )
                            .join(", ");
                          // Vertretungstrainer berücksichtigen
                          const vertretung = vertretungen.find(v => v.trainingId === t.id);
                          const effectiveTrainerId = vertretung?.vertretungTrainerId || t.trainerId || defaultTrainerId;
                          const trainerName = trainerById.get(effectiveTrainerId)?.name ?? "Trainer";
                          const priceNum = round2(trainingPreisGesamt(t));

                          const honorarNum = trainerHonorarFuerTraining(t);
                          const honorarBadge = euro(honorarNum);
                          const trainerPaid =
                            t.barBezahlt || !!trainerPayments[t.id];
                          const showTrainerInfo =
                            isTrainer || abrechnungTab === "trainer";
                          const differenz = round2(priceNum - honorarNum);

                          const [y, m, d] = t.datum.split("-");
                          const germanDate =
                            d && m && y ? `${d}.${m}.${y}` : t.datum;

                          return (
                            <li key={t.id} className="listItem">
                              <div>
                                <strong>
                                  {germanDate} {t.uhrzeitVon} bis{" "}
                                  {t.uhrzeitBis}
                                </strong>
                                <div style={{ marginTop: 4 }}>
                                  <span className="badge badgeOk">
                                    durchgeführt
                                  </span>
                                </div>
                                <div
                                  className="muted"
                                  style={{ marginTop: 4 }}
                                >
                                  Spieler: {sp}
                                </div>
                                <div className="muted">
                                  Tarif: {ta}
                                </div>
                                {showTrainerInfo && (
                                  <>
                                    <div className="muted">
                                      Trainer: {trainerName}, Honorar:{" "}
                                      {honorarBadge}
                                    </div>
                                    <div className="muted">
                                      Differenz (Schülerzahlung − Honorar):{" "}
                                      {euro(differenz)}
                                    </div>
                                  </>
                                )}
                                {!showTrainerInfo && (
                                  <div className="muted">
                                    Trainer: {trainerName}
                                  </div>
                                )}
                                {t.notiz ? (
                                  <div className="muted">{t.notiz}</div>
                                ) : null}
                                {t.serieId ? (
                                  <div className="muted">
                                    Serie: {t.serieId.slice(0, 8)}
                                  </div>
                                ) : null}
                                {t.barBezahlt && (
                                  <div className="muted">Bar bezahlt</div>
                                )}
                              </div>
                              <div className="smallActions">
                                {showTrainerInfo &&
                                  abrechnungTab === "trainer" && (
                                    <span
                                      className={
                                        trainerPaid
                                          ? "badge badgeOk"
                                          : "badge"
                                      }
                                      style={{
                                        cursor: "pointer",
                                        backgroundColor: trainerPaid
                                          ? "#22c55e1a"
                                          : "#fee2e2",
                                        color: trainerPaid
                                          ? "#166534"
                                          : "#991b1b",
                                      }}
                                      onClick={() =>
                                        toggleTrainerPaid(t.id)
                                      }
                                    >
                                      {trainerPaid
                                        ? "Honorar abgerechnet"
                                        : "Honorar offen"}
                                    </span>
                                  )}
                                <button
                                  className="btn micro"
                                  style={{
                                    backgroundColor: "#8b5cf6",
                                    borderColor: "#8b5cf6",
                                  }}
                                  onClick={() => toggleBarBezahlt(t.id)}
                                >
                                  {t.barBezahlt
                                    ? "Barzahlung zurücknehmen"
                                    : "Bar bezahlt"}
                                </button>
                                <button
                                  className="btn micro btnGhost"
                                  onClick={() => fillTrainingFromSelected(t)}
                                >
                                  Bearbeiten
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
              </div>
            )}

            {tab === "weiteres" && !isTrainer && (
              <div className="card">
                <h2>Weiteres</h2>

                {/* Sub-Tabs für Notizen und Vertretung */}
                <div className="tabs" style={{ marginBottom: 20 }}>
                  <button
                    className={`tabBtn ${weiteresTabs === "notizen" ? "tabBtnActive" : ""}`}
                    onClick={() => setWeiteresTabs("notizen")}
                  >
                    Notizen
                  </button>
                  <button
                    className={`tabBtn ${weiteresTabs === "vertretung" ? "tabBtnActive" : ""}`}
                    onClick={() => setWeiteresTabs("vertretung")}
                  >
                    Vertretung
                  </button>
                  <button
                    className={`tabBtn ${weiteresTabs === "spontan" ? "tabBtnActive" : ""}`}
                    onClick={() => setWeiteresTabs("spontan")}
                  >
                    Spontan
                  </button>
                </div>

                {/* Notizen Tab */}
                {weiteresTabs === "notizen" && (
                  <>
                    <p className="muted" style={{ marginBottom: 16 }}>
                      Hier kannst du allgemeine Notizen speichern, z.B. Urlaubstage von Trainern, wichtige Termine oder sonstige Informationen.
                    </p>

                    <ul className="list">
                      {notizen.map((n) => {
                        const erstelltDate = new Date(n.erstelltAm);
                        const aktualisiertDate = new Date(n.aktualisiertAm);
                        const erstelltFormatted = `${pad2(erstelltDate.getDate())}.${pad2(erstelltDate.getMonth() + 1)}.${erstelltDate.getFullYear()}`;
                        const aktualisiertFormatted = `${pad2(aktualisiertDate.getDate())}.${pad2(aktualisiertDate.getMonth() + 1)}.${aktualisiertDate.getFullYear()}`;

                        return (
                          <li key={n.id} className="listItem" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <strong>{n.titel}</strong>
                                <div className="muted" style={{ fontSize: 11 }}>
                                  Erstellt: {erstelltFormatted}
                                  {n.erstelltAm !== n.aktualisiertAm && ` · Bearbeitet: ${aktualisiertFormatted}`}
                                </div>
                              </div>
                              <div className="smallActions">
                                <button
                                  className="btn micro btnGhost"
                                  onClick={() => startEditNotiz(n)}
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  className="btn micro btnWarn"
                                  onClick={() => deleteNotiz(n.id)}
                                >
                                  Löschen
                                </button>
                              </div>
                            </div>
                            {n.inhalt && (
                              <div style={{
                                whiteSpace: "pre-wrap",
                                background: "var(--bg-inset)",
                                padding: 12,
                                borderRadius: "var(--radius-md)",
                                fontSize: 14,
                                lineHeight: 1.5
                              }}>
                                {n.inhalt}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {notizen.length === 0 && !showNotizForm && (
                      <div className="muted" style={{ textAlign: "center", padding: 20 }}>
                        Noch keine Notizen vorhanden.
                      </div>
                    )}

                    {!showNotizForm && !editingNotizId && (
                      <div style={{ marginTop: 16 }}>
                        <button
                          className="btn"
                          onClick={() => setShowNotizForm(true)}
                        >
                          Neue Notiz hinzufügen
                        </button>
                      </div>
                    )}

                    {(showNotizForm || editingNotizId) && (
                      <div className="card cardInset" style={{ marginTop: 16 }}>
                        <h3>{editingNotizId ? "Notiz bearbeiten" : "Neue Notiz hinzufügen"}</h3>
                        <div className="field">
                          <label>Titel</label>
                          <input
                            value={notizTitel}
                            onChange={(e) => setNotizTitel(e.target.value)}
                            placeholder="z.B. Urlaubstage Trainer Max"
                          />
                        </div>
                        <div className="field" style={{ marginTop: 12 }}>
                          <label>Inhalt</label>
                          <textarea
                            value={notizInhalt}
                            onChange={(e) => setNotizInhalt(e.target.value)}
                            placeholder="Details hier eingeben..."
                            rows={6}
                            style={{
                              width: "100%",
                              font: "inherit",
                              fontSize: 15,
                              padding: "10px 14px",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border)",
                              background: "var(--bg-card)",
                              resize: "vertical",
                              minHeight: 120
                            }}
                          />
                        </div>
                        <div className="row" style={{ marginTop: 12 }}>
                          <button
                            className="btn"
                            onClick={() => {
                              if (editingNotizId) {
                                saveNotiz();
                              } else {
                                addNotiz();
                              }
                            }}
                          >
                            {editingNotizId ? "Notiz speichern" : "Notiz hinzufügen"}
                          </button>
                          <button
                            className="btn btnGhost"
                            onClick={() => {
                              setEditingNotizId(null);
                              setNotizTitel("");
                              setNotizInhalt("");
                              setShowNotizForm(false);
                            }}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Vertretung Tab */}
                {weiteresTabs === "vertretung" && (
                  <>
                    {/* PDF Export Button */}
                    <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        className="btn btnGhost"
                        onClick={async () => {
                          const jetzt = new Date();
                          const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

                          // Sammle nur offene Vertretungen (ohne Vertretungstrainer, zukünftig, nicht abgesagt)
                          const exportData = vertretungen
                            .filter(v => !v.vertretungTrainerId) // Nur offene Vertretungen
                            .map(v => {
                              const training = trainings.find(t => t.id === v.trainingId);
                              if (!training) return null;
                              if (training.status === "abgesagt") return null;
                              const trainingsEnde = new Date(`${training.datum}T${training.uhrzeitBis}:00`);
                              if (trainingsEnde <= jetzt) return null;
                              return { vertretung: v, training };
                            })
                            .filter((item): item is { vertretung: Vertretung; training: Training } => item !== null)
                            .sort((a, b) => {
                              const dateComp = a.training.datum.localeCompare(b.training.datum);
                              if (dateComp !== 0) return dateComp;
                              return a.training.uhrzeitVon.localeCompare(b.training.uhrzeitVon);
                            });

                          if (exportData.length === 0) {
                            alert("Keine offenen Vertretungen zum Exportieren.");
                            return;
                          }

                          const rows = exportData.map(({ vertretung: v, training: t }) => {
                            const d = new Date(t.datum + "T12:00:00");
                            const ursprTrainer = trainerById.get(t.trainerId || defaultTrainerId)?.name ?? "Unbekannt";
                            const vertretungTrainer = v.vertretungTrainerId
                              ? trainerById.get(v.vertretungTrainerId)?.name ?? ""
                              : "";
                            const spielerNames = t.spielerIds
                              .map(id => getSpielerDisplayName(id))
                              .join(", ");

                            return `
                              <tr>
                                <td style="padding: 6px 8px; border: 1px solid #ddd;">${dayNames[d.getDay()]}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}</td>
                                <td style="padding: 6px 8px; border: 1px solid #ddd;">${escapeHtml(t.uhrzeitVon)}-${escapeHtml(t.uhrzeitBis)}</td>
                                <td style="padding: 6px 8px; border: 1px solid #ddd;">${escapeHtml(ursprTrainer)}</td>
                                <td style="padding: 6px 8px; border: 1px solid #ddd;">${escapeHtml(spielerNames)}</td>
                                <td style="padding: 6px 8px; border: 1px solid #ddd;">${escapeHtml(vertretungTrainer)}</td>
                              </tr>
                            `;
                          }).join('');

                          const tableHTML = `
                            <div style="font-family: Arial, sans-serif; padding: 20px;">
                              <h2 style="margin-bottom: 16px; font-size: 18px;">Offene Vertretungen</h2>
                              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead>
                                  <tr style="background: #f3f4f6;">
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Datum</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Uhrzeit</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Trainer fehlt</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Spieler</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Vertretung</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${rows}
                                </tbody>
                              </table>
                            </div>
                          `;

                          const html2pdf = (await import('html2pdf.js')).default;
                          const container = document.createElement('div');
                          container.innerHTML = tableHTML;
                          document.body.appendChild(container);

                          await html2pdf()
                            .set({
                              margin: 10,
                              filename: `Vertretungen_${new Date().toISOString().split('T')[0]}.pdf`,
                              html2canvas: { scale: 2 },
                              jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                            })
                            .from(container)
                            .save();

                          document.body.removeChild(container);
                        }}
                      >
                        PDF exportieren
                      </button>
                    </div>

                    {/* Moderne Tabellen-Übersicht aller Vertretungen */}
                    {vertretungen.length > 0 ? (
                      <div style={{ marginBottom: 24 }}>
                        {(() => {
                          // Gruppiere nach fehlendem Trainer (nur zukünftige Trainings)
                          const jetzt = new Date();
                          const groupedByTrainer = vertretungen.reduce((acc, v) => {
                            const training = trainings.find((t) => t.id === v.trainingId);
                            if (!training) return acc;
                            // Abgesagte Trainings ausblenden
                            if (training.status === "abgesagt") return acc;
                            // Vergangene Trainings ausblenden (basierend auf Endzeit)
                            const trainingsEnde = new Date(`${training.datum}T${training.uhrzeitBis}:00`);
                            if (trainingsEnde <= jetzt) return acc;
                            const trainerId = training.trainerId || defaultTrainerId;
                            if (!acc[trainerId]) acc[trainerId] = [];
                            acc[trainerId].push({ vertretung: v, training });
                            return acc;
                          }, {} as Record<string, { vertretung: Vertretung; training: Training }[]>);

                          const trainerEntries = Object.entries(groupedByTrainer);
                          if (trainerEntries.length === 0) {
                            return (
                              <div style={{
                                textAlign: "center",
                                padding: "40px 20px",
                                color: "var(--text-muted)"
                              }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
                                <div>Keine offenen Vertretungen</div>
                              </div>
                            );
                          }

                          return trainerEntries
                            .sort(([, a], [, b]) => {
                              const dateA = a[0]?.training.datum || "";
                              const dateB = b[0]?.training.datum || "";
                              return dateA.localeCompare(dateB);
                            })
                            .map(([trainerId, items]) => {
                              const trainerName = trainerById.get(trainerId)?.name || "Unbekannt";

                              // Sortiere nach Datum und Zeit
                              const sortedItems = [...items].sort((a, b) => {
                                const dateComp = a.training.datum.localeCompare(b.training.datum);
                                if (dateComp !== 0) return dateComp;
                                return a.training.uhrzeitVon.localeCompare(b.training.uhrzeitVon);
                              });

                              const isCollapsed = !expandedVertretungTrainer.includes(trainerId);

                              // Gruppiere nach Datum
                              const groupedByDate = sortedItems.reduce((acc, item) => {
                                const datum = item.training.datum;
                                if (!acc[datum]) acc[datum] = [];
                                acc[datum].push(item);
                                return acc;
                              }, {} as Record<string, typeof sortedItems>);

                              const uniqueDates = Object.keys(groupedByDate).length;

                              // Berechne offene Tage (mindestens ein Training ohne Vertretungstrainer)
                              const openDates = Object.entries(groupedByDate).filter(([, dateItems]) => {
                                return dateItems.some(item => !item.vertretung.vertretungTrainerId);
                              }).length;

                              return (
                                <div key={trainerId} style={{ marginBottom: 20 }}>
                                  <div
                                    onClick={() => {
                                      setExpandedVertretungTrainer(prev =>
                                        prev.includes(trainerId)
                                          ? prev.filter(id => id !== trainerId)
                                          : [...prev, trainerId]
                                      );
                                    }}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      marginBottom: isCollapsed ? 0 : 12,
                                      padding: "10px 14px",
                                      background: openDates > 0
                                        ? "linear-gradient(135deg, #ef4444 0%, #f97316 100%)"
                                        : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                                      borderRadius: isCollapsed ? "var(--radius-md)" : "var(--radius-md) var(--radius-md) 0 0",
                                      color: "white",
                                      cursor: "pointer",
                                      userSelect: "none"
                                    }}
                                  >
                                    <span style={{
                                      fontSize: 14,
                                      transition: "transform 0.2s",
                                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)"
                                    }}>▼</span>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: 600, fontSize: 15 }}>{trainerName} fehlt</div>
                                      <div style={{ fontSize: 12, opacity: 0.9 }}>
                                        {uniqueDates} Tag{uniqueDates !== 1 ? "e" : ""} betroffen
                                        {openDates > 0
                                          ? ` • ${openDates} offen`
                                          : " • alle gedeckt ✓"}
                                      </div>
                                    </div>
                                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                                      {isCollapsed ? "Aufklappen" : "Zuklappen"}
                                    </span>
                                  </div>

                                  {!isCollapsed && <div style={{ overflowX: "auto" }}>
                                    {Object.entries(groupedByDate)
                                      .sort(([a], [b]) => a.localeCompare(b))
                                      .map(([datum, dateItems]) => {
                                        const d = new Date(datum + "T12:00:00");
                                        const dayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                                        const formattedDate = `${dayNames[d.getDay()]}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;

                                        return (
                                          <div key={datum} style={{ marginBottom: 12 }}>
                                            {/* Datum Header */}
                                            <div style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              padding: "8px 12px",
                                              background: "var(--bg-card)",
                                              borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                                              borderBottom: "2px solid #f97316",
                                              fontWeight: 600,
                                              fontSize: 14
                                            }}>
                                              <span style={{ fontSize: 16 }}>📅</span>
                                              {formattedDate}
                                              <span style={{
                                                marginLeft: "auto",
                                                fontSize: 12,
                                                color: "var(--text-muted)",
                                                fontWeight: 400
                                              }}>
                                                {dateItems.length} Training{dateItems.length !== 1 ? "s" : ""}
                                              </span>
                                            </div>

                                            {/* Trainings als Unterzeilen */}
                                            <div style={{
                                              background: "var(--bg-inset)",
                                              borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                                              overflow: "hidden"
                                            }}>
                                              {dateItems.map(({ vertretung: v, training: t }, idx) => {
                                                const spielerNames = t.spielerIds
                                                  .map((id) => getSpielerDisplayName(id))
                                                  .join(", ");
                                                const isOffen = !v.vertretungTrainerId;

                                                return (
                                                  <div
                                                    key={v.trainingId}
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 12,
                                                      padding: "10px 12px",
                                                      borderTop: idx > 0 ? "1px solid var(--border)" : "none",
                                                      fontSize: 13
                                                    }}
                                                  >
                                                    <div style={{
                                                      minWidth: 90,
                                                      fontWeight: 600,
                                                      color: "var(--text)"
                                                    }}>
                                                      {t.uhrzeitVon}–{t.uhrzeitBis}
                                                    </div>
                                                    <div style={{
                                                      flex: 1,
                                                      color: "var(--text-muted)",
                                                      overflow: "hidden",
                                                      textOverflow: "ellipsis",
                                                      whiteSpace: "nowrap"
                                                    }} title={spielerNames}>
                                                      {spielerNames}
                                                    </div>
                                                    <select
                                                      value={v.vertretungTrainerId ?? ""}
                                                      onChange={(e) => {
                                                        const newId = e.target.value;
                                                        const oldId = v.vertretungTrainerId;

                                                        // Wenn ein neuer Vertretungstrainer zugewiesen wird
                                                        if (newId && newId !== oldId && t.spielerIds.length > 0) {
                                                          setVertretungNotifyDialog({
                                                            trainingId: v.trainingId,
                                                            newTrainerId: newId,
                                                            training: t
                                                          });
                                                        } else {
                                                          setVertretungen((prev) => {
                                                            const filtered = prev.filter((vt) => vt.trainingId !== v.trainingId);
                                                            return [...filtered, { trainingId: v.trainingId, vertretungTrainerId: newId || undefined }];
                                                          });
                                                        }
                                                      }}
                                                      style={{
                                                        minWidth: 130,
                                                        fontSize: 13,
                                                        padding: "6px 10px",
                                                        borderRadius: 6,
                                                        border: `2px solid ${isOffen ? "#f97316" : "#22c55e"}`,
                                                        background: isOffen ? "rgba(249, 115, 22, 0.08)" : "rgba(34, 197, 94, 0.08)",
                                                        color: isOffen ? "#ea580c" : "#16a34a",
                                                        fontWeight: 600,
                                                        cursor: "pointer"
                                                      }}
                                                    >
                                                      <option value="">⚠ Offen</option>
                                                      {trainers
                                                        .filter((tr) => tr.id !== trainerId)
                                                        .map((tr) => (
                                                          <option key={tr.id} value={tr.id}>
                                                            ✓ {tr.name}
                                                          </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                      style={{
                                                        background: "none",
                                                        border: "none",
                                                        cursor: "pointer",
                                                        padding: 4,
                                                        fontSize: 18,
                                                        color: "var(--text-muted)",
                                                        lineHeight: 1,
                                                        borderRadius: 4
                                                      }}
                                                      title="Vertretung entfernen"
                                                      onClick={() => setVertretungen((prev) => prev.filter((vt) => vt.trainingId !== v.trainingId))}
                                                    >
                                                      ×
                                                    </button>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>}
                                </div>
                              );
                            });
                        })()}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: "center",
                        padding: 40,
                        background: "var(--bg-inset)",
                        borderRadius: "var(--radius-md)",
                        marginBottom: 20
                      }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        <div style={{ color: "var(--text-muted)" }}>Keine Vertretungen eingetragen</div>
                      </div>
                    )}

                    {/* Neue Vertretung hinzufügen */}
                    <div style={{
                      background: "var(--bg-inset)",
                      borderRadius: "var(--radius-md)",
                      padding: 16
                    }}>
                      <h3 style={{ marginBottom: 12, fontSize: 15 }}>Neue Vertretung planen</h3>

                      <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                        <div className="field" style={{ flex: "1 1 180px", minWidth: 0 }}>
                          <label>Trainer fehlt</label>
                          <select
                            value={vertretungTrainerId}
                            onChange={(e) => {
                              setVertretungTrainerId(e.target.value);
                              setVertretungDaten([]);
                              setVertretungDatumPreview("");
                              setVertretungVon("");
                              setVertretungBis("");
                            }}
                          >
                            <option value="">-- wählen --</option>
                            {trainers.map((tr) => (
                              <option key={tr.id} value={tr.id}>
                                {tr.name} {tr.nachname || ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {vertretungTrainerId && (
                          <div className="field" style={{ flex: "0 0 auto" }}>
                            <label>Modus</label>
                            <div style={{ display: "flex", gap: 0, borderRadius: "var(--radius-sm)", overflow: "hidden", border: "1px solid var(--border)" }}>
                              <button
                                type="button"
                                onClick={() => setVertretungModus("einzeln")}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 13,
                                  border: "none",
                                  cursor: "pointer",
                                  background: vertretungModus === "einzeln" ? "var(--primary)" : "var(--bg-card)",
                                  color: vertretungModus === "einzeln" ? "white" : "var(--text)"
                                }}
                              >
                                Einzeln
                              </button>
                              <button
                                type="button"
                                onClick={() => setVertretungModus("zeitraum")}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 13,
                                  border: "none",
                                  borderLeft: "1px solid var(--border)",
                                  cursor: "pointer",
                                  background: vertretungModus === "zeitraum" ? "var(--primary)" : "var(--bg-card)",
                                  color: vertretungModus === "zeitraum" ? "white" : "var(--text)"
                                }}
                              >
                                Zeitraum
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Einzeldatum-Modus */}
                      {vertretungTrainerId && vertretungModus === "einzeln" && (
                        <div style={{ marginTop: 12 }}>
                          <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <div className="field" style={{ flex: "1 1 150px", minWidth: 0 }}>
                              <label>Datum auswählen</label>
                              <input
                                type="date"
                                value={vertretungDatumPreview}
                                onChange={(e) => {
                                  const datum = e.target.value;
                                  if (datum && /^\d{4}-\d{2}-\d{2}$/.test(datum)) {
                                    if (!vertretungDaten.includes(datum) && !vertretungPendingDates.includes(datum)) {
                                      setVertretungPendingDates(prev => [...prev, datum].sort());
                                    }
                                    setVertretungDatumPreview("");
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {/* Ausgewählte Daten anzeigen */}
                          {vertretungPendingDates.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <label style={{ fontSize: 13, marginBottom: 8, display: "block" }}>
                                Ausgewählte Tage ({vertretungPendingDates.length}):
                              </label>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                                {vertretungPendingDates.map(datum => {
                                  const d = new Date(datum + "T12:00:00");
                                  const formatted = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
                                  return (
                                    <span
                                      key={datum}
                                      style={{
                                        background: "var(--primary)",
                                        color: "white",
                                        padding: "4px 10px",
                                        borderRadius: 16,
                                        fontSize: 13,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6
                                      }}
                                    >
                                      {formatted}
                                      <button
                                        type="button"
                                        onClick={() => setVertretungPendingDates(prev => prev.filter(d => d !== datum))}
                                        style={{
                                          background: "transparent",
                                          border: "none",
                                          color: "white",
                                          cursor: "pointer",
                                          padding: 0,
                                          fontSize: 16,
                                          lineHeight: 1
                                        }}
                                      >
                                        ×
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  className="btn"
                                  style={{ background: "#22c55e", borderColor: "#22c55e" }}
                                  onClick={() => {
                                    // Alle pending dates hinzufügen
                                    vertretungPendingDates.forEach(datum => {
                                      if (!vertretungDaten.includes(datum)) {
                                        setVertretungDaten(prev => [...prev, datum].sort());
                                        // Trainings als offen markieren
                                        const dayTrainings = trainings.filter(
                                          (t) => t.datum === datum && (t.trainerId || defaultTrainerId) === vertretungTrainerId && t.status !== "abgesagt"
                                        );
                                        if (dayTrainings.length > 0) {
                                          setVertretungen((prev) => {
                                            const newVertretungen = [...prev];
                                            dayTrainings.forEach((t) => {
                                              if (!newVertretungen.some((v) => v.trainingId === t.id)) {
                                                newVertretungen.push({ trainingId: t.id });
                                              }
                                            });
                                            return newVertretungen;
                                          });
                                        }
                                      }
                                    });
                                    setVertretungPendingDates([]);
                                  }}
                                >
                                  {vertretungPendingDates.length} Tag{vertretungPendingDates.length !== 1 ? "e" : ""} hinzufügen
                                </button>
                                <button
                                  className="btn btnGhost"
                                  onClick={() => setVertretungPendingDates([])}
                                >
                                  Auswahl leeren
                                </button>
                              </div>
                            </div>
                          )}

                          {vertretungPendingDates.length === 0 && (
                            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                              Wähle einen oder mehrere Tage aus und bestätige dann.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Zeitraum-Modus */}
                      {vertretungTrainerId && vertretungModus === "zeitraum" && (
                        <div className="row" style={{ gap: 12, flexWrap: "wrap", marginTop: 12, alignItems: "flex-end" }}>
                          <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
                            <label>Von</label>
                            <input
                              type="date"
                              value={vertretungVon}
                              onChange={(e) => setVertretungVon(e.target.value)}
                            />
                          </div>
                          <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
                            <label>Bis</label>
                            <input
                              type="date"
                              value={vertretungBis}
                              min={vertretungVon}
                              onChange={(e) => setVertretungBis(e.target.value)}
                            />
                          </div>
                          {vertretungVon && vertretungBis && vertretungVon <= vertretungBis && (
                            <div className="field" style={{ flex: "0 0 auto" }}>
                              <button
                                className="btn"
                                style={{ background: "#22c55e", borderColor: "#22c55e" }}
                                onClick={() => {
                                  // Alle Trainings des Trainers im Zeitraum als "offen" markieren
                                  const rangeTrainings = trainings.filter(
                                    (t) => t.datum >= vertretungVon && t.datum <= vertretungBis && (t.trainerId || defaultTrainerId) === vertretungTrainerId && t.status !== "abgesagt"
                                  );
                                  if (rangeTrainings.length > 0) {
                                    // Daten für Anzeige sammeln
                                    const datenImZeitraum = Array.from(new Set(rangeTrainings.map(t => t.datum))).sort();
                                    setVertretungDaten(prev => Array.from(new Set([...prev, ...datenImZeitraum])).sort());

                                    setVertretungen((prev) => {
                                      const newVertretungen = [...prev];
                                      rangeTrainings.forEach((t) => {
                                        if (!newVertretungen.some((v) => v.trainingId === t.id)) {
                                          newVertretungen.push({ trainingId: t.id });
                                        }
                                      });
                                      return newVertretungen;
                                    });
                                  }
                                  setVertretungVon("");
                                  setVertretungBis("");
                                }}
                              >
                                Zeitraum hinzufügen ({trainings.filter(
                                  (t) => t.datum >= vertretungVon && t.datum <= vertretungBis && (t.trainerId || defaultTrainerId) === vertretungTrainerId
                                ).length} Trainings)
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {(() => {
                        // Nur Daten anzeigen, wo noch nicht alle Trainings beendet sind
                        const jetzt = new Date();
                        const zukuenftigeDaten = vertretungDaten.filter(datum => {
                          // Finde alle Trainings dieses Trainers an diesem Tag
                          const dayTrainings = vertretungTrainerId
                            ? trainings.filter(t => t.datum === datum && (t.trainerId || defaultTrainerId) === vertretungTrainerId)
                            : trainings.filter(t => t.datum === datum);
                          if (dayTrainings.length === 0) {
                            // Keine Trainings = Datum nur anzeigen wenn heute oder später
                            return datum >= todayISO();
                          }
                          // Prüfe ob das letzte Training noch nicht beendet ist
                          const letztesEnde = dayTrainings
                            .map(t => new Date(`${t.datum}T${t.uhrzeitBis}:00`))
                            .reduce((a, b) => a > b ? a : b);
                          return letztesEnde > jetzt;
                        });

                        return zukuenftigeDaten.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                            {zukuenftigeDaten.map((datum) => {
                              const d = new Date(datum + "T12:00:00");
                              const formatted = `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
                              return (
                                <span
                                  key={datum}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    background: "var(--bg-card)",
                                    padding: "3px 8px",
                                    borderRadius: "var(--radius-md)",
                                    fontSize: 12,
                                    border: "1px solid var(--border)"
                                  }}
                                >
                                  {formatted}
                                  <button
                                    type="button"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      padding: 0,
                                      fontSize: 13,
                                      color: "var(--text-muted)",
                                      lineHeight: 1
                                    }}
                                    onClick={() => setVertretungDaten(vertretungDaten.filter((dd) => dd !== datum))}
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Trainings und Vertretungen zuweisen */}
                      {(() => {
                        // Nur Daten anzeigen, wo noch nicht alle Trainings beendet sind
                        const jetzt = new Date();
                        const zukuenftigeDaten = vertretungDaten.filter(datum => {
                          const dayTrainings = vertretungTrainerId
                            ? trainings.filter(t => t.datum === datum && (t.trainerId || defaultTrainerId) === vertretungTrainerId && t.status !== "abgesagt")
                            : trainings.filter(t => t.datum === datum && t.status !== "abgesagt");
                          if (dayTrainings.length === 0) {
                            return datum >= todayISO();
                          }
                          const letztesEnde = dayTrainings
                            .map(t => new Date(`${t.datum}T${t.uhrzeitBis}:00`))
                            .reduce((a, b) => a > b ? a : b);
                          return letztesEnde > jetzt;
                        });

                        return vertretungTrainerId && zukuenftigeDaten.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            {zukuenftigeDaten.map((datum) => {
                            const d = new Date(datum + "T12:00:00");
                            const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
                            const formatted = `${dayNames[d.getDay()]}, ${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
                            const dayTrainings = trainings.filter(
                              (t) => t.datum === datum && (t.trainerId || defaultTrainerId) === vertretungTrainerId && t.status !== "abgesagt"
                            );

                            if (dayTrainings.length === 0) {
                              return (
                                <div key={datum} style={{
                                  padding: "8px 12px",
                                  background: "var(--bg-card)",
                                  borderRadius: "var(--radius-sm)",
                                  marginBottom: 8,
                                  fontSize: 13
                                }}>
                                  <strong>{formatted}</strong>
                                  <span className="muted"> – Keine Trainings</span>
                                </div>
                              );
                            }

                            return (
                              <div key={datum} style={{ marginBottom: 12 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{formatted}</div>
                                {dayTrainings.map((t) => {
                                  const spielerNames = t.spielerIds
                                    .map((id) => getSpielerDisplayName(id))
                                    .join(", ");
                                  const existingVertretung = vertretungen.find((v) => v.trainingId === t.id);

                                  const hatVertretung = existingVertretung?.vertretungTrainerId;
                                  return (
                                    <div
                                      key={t.id}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "8px 12px",
                                        background: hatVertretung
                                          ? "rgba(34, 197, 94, 0.1)"
                                          : existingVertretung
                                          ? "rgba(249, 115, 22, 0.1)"
                                          : "var(--bg-card)",
                                        borderRadius: "var(--radius-sm)",
                                        marginBottom: 4,
                                        borderLeft: `3px solid ${hatVertretung ? "#22c55e" : existingVertretung ? "#f97316" : "#cbd5e1"}`
                                      }}
                                    >
                                      <div style={{ minWidth: 70, fontSize: 13, fontWeight: 500 }}>
                                        {t.uhrzeitVon}-{t.uhrzeitBis}
                                      </div>
                                      <div style={{ flex: 1, fontSize: 12, color: "var(--text-muted)" }}>
                                        {spielerNames}
                                      </div>
                                      <select
                                        value={existingVertretung?.vertretungTrainerId ?? ""}
                                        onChange={(e) => {
                                          const newId = e.target.value;
                                          const oldId = existingVertretung?.vertretungTrainerId;

                                          // Wenn ein neuer Vertretungstrainer zugewiesen wird (nicht "offen" und nicht gleicher Trainer)
                                          if (newId && newId !== oldId && t.spielerIds.length > 0) {
                                            setVertretungNotifyDialog({
                                              trainingId: t.id,
                                              newTrainerId: newId,
                                              training: t
                                            });
                                          } else {
                                            setVertretungen((prev) => {
                                              const filtered = prev.filter((v) => v.trainingId !== t.id);
                                              return [...filtered, { trainingId: t.id, vertretungTrainerId: newId || undefined }];
                                            });
                                          }
                                        }}
                                        style={{ width: 130, fontSize: 13 }}
                                      >
                                        <option value="">-- offen --</option>
                                        {trainers
                                          .filter((tr) => tr.id !== vertretungTrainerId)
                                          .map((tr) => (
                                            <option key={tr.id} value={tr.id}>
                                              {tr.name}
                                            </option>
                                          ))}
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}

                {/* Spontan Tab */}
                {weiteresTabs === "spontan" && (
                  <>
                    <h2>{editingSpontanId ? "Spontane Stunde bearbeiten" : "Spontane Stunde erstellen"}</h2>

                    <div className="row">
                      <div className="field">
                        <label>Datum</label>
                        <input
                          type="date"
                          value={spontanDatum}
                          onChange={(e) => setSpontanDatum(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Von</label>
                        <input
                          type="time"
                          value={spontanVon}
                          onChange={(e) => setSpontanVon(e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Bis</label>
                        <input
                          type="time"
                          value={spontanBis}
                          onChange={(e) => setSpontanBis(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="field">
                        <label>Trainer</label>
                        <select
                          value={spontanTrainerId}
                          onChange={(e) => setSpontanTrainerId(e.target.value)}
                        >
                          <option value="">Trainer auswählen...</option>
                          {trainers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Anlage</label>
                        <select
                          value={spontanAnlage}
                          onChange={(e) => setSpontanAnlage(e.target.value as "Wedding" | "Britz")}
                        >
                          <option value="Wedding">Wedding</option>
                          <option value="Britz">Britz</option>
                        </select>
                      </div>
                    </div>

                    <div className="row">
                      <div className="field">
                        <label>Tarif (optional)</label>
                        <select
                          value={spontanTarifId}
                          onChange={(e) => setSpontanTarifId(e.target.value)}
                        >
                          <option value="">Kein Tarif / Individuell</option>
                          {tarife.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({euro(t.preisProStunde)}/h)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Preis/Stunde (optional)</label>
                        <input
                          type="number"
                          placeholder="z.B. 50"
                          value={spontanCustomPreis}
                          onChange={(e) =>
                            setSpontanCustomPreis(
                              e.target.value === "" ? "" : Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="row" style={{ marginTop: 12 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={spontanVeroeffentlicht}
                          onChange={(e) => setSpontanVeroeffentlicht(e.target.checked)}
                        />
                        Auf Wedding-Seite veröffentlichen
                      </label>
                    </div>

                    <div className="row" style={{ marginTop: 16 }}>
                      {editingSpontanId ? (
                        <>
                          <button className="btn" onClick={updateSpontaneStunde}>
                            Speichern
                          </button>
                          <button className="btn btnGhost" onClick={resetSpontanForm}>
                            Abbrechen
                          </button>
                        </>
                      ) : (
                        <button className="btn" onClick={createSpontaneStunde}>
                          Erstellen
                        </button>
                      )}
                    </div>

                    <div style={{ marginTop: 32 }}>
                      <h3>Spontane Stunden</h3>
                      {loadingSpontaneStunden ? (
                        <p className="muted">Lade...</p>
                      ) : spontaneStunden.length === 0 ? (
                        <p className="muted">Keine spontanen Stunden vorhanden.</p>
                      ) : (
                        <ul className="list">
                          {spontaneStunden
                            .sort((a, b) => {
                              const dateA = new Date(a.datum + "T" + a.uhrzeitVon);
                              const dateB = new Date(b.datum + "T" + b.uhrzeitVon);
                              return dateA.getTime() - dateB.getTime();
                            })
                            .map((s) => {
                              const trainer = trainers.find((t) => t.id === s.trainerId);
                              const tarif = tarife.find((t) => t.id === s.tarifId);
                              const preis = s.customPreisProStunde ?? tarif?.preisProStunde;
                              const datumFormatted = new Date(s.datum + "T12:00:00").toLocaleDateString("de-DE", {
                                weekday: "short",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric"
                              });

                              return (
                                <li key={s.id} className="listItem" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                      <strong>{datumFormatted}</strong>
                                      <span style={{ marginLeft: 8 }}>{s.uhrzeitVon} – {s.uhrzeitBis}</span>
                                      <div className="muted" style={{ fontSize: 13 }}>
                                        Trainer: {trainer?.name ?? "–"} | Anlage: {s.anlage}
                                        {preis && ` | ${euro(preis)}/h`}
                                      </div>
                                      {s.buchung && (
                                        <div style={{ marginTop: 4, padding: "6px 10px", background: "#dcfce7", borderRadius: 4, fontSize: 13 }}>
                                          <strong>Gebucht von:</strong> {s.buchung.name} ({s.buchung.email})
                                          {s.buchung.telefon && ` | Tel: ${s.buchung.telefon}`}
                                          <br />
                                          <span className="muted">am {new Date(s.buchung.gebuchtAm).toLocaleString("de-DE")}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      <span
                                        style={{
                                          padding: "3px 8px",
                                          borderRadius: 4,
                                          fontSize: 12,
                                          fontWeight: 600,
                                          background: s.status === "gebucht" ? "#22c55e" : "#3b82f6",
                                          color: "white"
                                        }}
                                      >
                                        {s.status === "gebucht" ? "Gebucht" : "Offen"}
                                      </span>
                                      <button
                                        className={`btn micro ${s.veroeffentlicht ? "btnPrimary" : "btnGhost"}`}
                                        onClick={() => toggleSpontanVeroeffentlicht(s.id, s.veroeffentlicht)}
                                        title={s.veroeffentlicht ? "Veröffentlicht" : "Nicht veröffentlicht"}
                                      >
                                        {s.veroeffentlicht ? "Online" : "Offline"}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="smallActions" style={{ justifyContent: "flex-end" }}>
                                    {s.status === "gebucht" && s.buchung && !s.trainingId && (
                                      <button
                                        className="btn micro"
                                        style={{ background: "#eab308" }}
                                        onClick={() => uebernehmenSpontanBuchung(s)}
                                      >
                                        In Kalender übernehmen
                                      </button>
                                    )}
                                    {s.trainingId && (
                                      <span className="muted" style={{ fontSize: 12 }}>
                                        ✓ Im Kalender
                                      </span>
                                    )}
                                    {s.status !== "gebucht" && (
                                      <button
                                        className="btn micro btnGhost"
                                        onClick={() => startEditSpontaneStunde(s)}
                                      >
                                        Bearbeiten
                                      </button>
                                    )}
                                    <button
                                      className="btn micro btnWarn"
                                      onClick={() => deleteSpontaneStunde(s.id)}
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>



      {payConfirm && (
        <div className="modalOverlay">
          <div className="modalCard">
            <div className="modalHeader">
              <div className="modalPill">Zahlung bestätigen</div>
              <h3>
                {payConfirm.spielerName} ·{" "}
                {formatMonthLabel(payConfirm.monat)}
              </h3>
              <p className="muted">
                Dieser Betrag wird als bezahlt markiert, Du kannst es später
                wieder auf offen stellen.
              </p>
            </div>
            <div className="modalSummary">
              <span className="muted">Betrag</span>
              <strong>{euro(payConfirm.amount)}</strong>
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" onClick={closePayConfirm}>
                Abbrechen
              </button>
              <button className="btn" onClick={confirmPay}>
                Ja, als bezahlt markieren
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTrainingDialog && (
        <div className="modalOverlay">
          <div className="modalCard" style={{ maxWidth: 500 }}>
            <div className="modalHeader">
              <div className="modalPill">
                {cancelTrainingDialog.action === 'delete' ? 'Gruppentraining löschen' : 'Gruppentraining absagen'}
              </div>
              <h3>Abrechnung anpassen?</h3>
              <p className="muted">
                {cancelTrainingDialog.trainings.length === 1
                  ? `Dieses Training hat ${cancelTrainingDialog.trainings[0].spielerIds.length} Spieler.`
                  : `${cancelTrainingDialog.trainings.length} Gruppentrainings betroffen.`}
                {" "}Möchtest du die monatliche Abrechnung für alle Spieler anpassen (z.B. wegen Regenausfall)?
              </p>
            </div>

            <div style={{ padding: "0 20px", marginBottom: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <strong>Betroffene Trainings:</strong>
                <ul style={{ margin: "8px 0", paddingLeft: 20, fontSize: 13 }}>
                  {cancelTrainingDialog.trainings.map((t) => {
                    const spielerNamen = t.spielerIds
                      .map((id) => getSpielerFullName(id))
                      .join(", ");
                    return (
                      <li key={t.id} style={{ marginBottom: 4 }}>
                        {formatShort(t.datum)} {t.uhrzeitVon}-{t.uhrzeitBis}: {spielerNamen}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div style={{ marginBottom: 12 }}>
                <strong>Betroffene Spieler:</strong>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                  {(() => {
                    const allSpielerIds = new Set<string>();
                    cancelTrainingDialog.trainings.forEach((t) => {
                      t.spielerIds.forEach((id) => allSpielerIds.add(id));
                    });
                    return Array.from(allSpielerIds).map((id) => (
                      <span key={id} className="pill" style={{ fontSize: 12 }}>
                        {getSpielerFullName(id)}
                      </span>
                    ));
                  })()}
                </div>
              </div>

              <div className="field" style={{ marginTop: 16 }}>
                <label>Abzug pro Spieler (in EUR)</label>
                <input
                  type="number"
                  value={cancelAdjustmentAmount}
                  onChange={(e) => setCancelAdjustmentAmount(e.target.value)}
                  placeholder="z.B. 15"
                  min="0"
                  step="0.01"
                  style={{ maxWidth: 150 }}
                />
                <div className="muted" style={{ marginTop: 4 }}>
                  Dieser Betrag wird von der monatlichen Abrechnung jedes betroffenen Spielers abgezogen.
                </div>
              </div>
            </div>

            <div className="modalActions" style={{ flexDirection: "column", gap: 8 }}>
              <button
                className="btn"
                onClick={() => handleCancelDialogConfirm(true)}
                style={{ width: "100%" }}
              >
                Mit Anpassung ({euro(parseFloat(cancelAdjustmentAmount) || 0)} Abzug pro Spieler)
              </button>
              <button
                className="btn btnGhost"
                onClick={() => handleCancelDialogConfirm(false)}
                style={{ width: "100%" }}
              >
                Ohne Anpassung fortfahren
              </button>
              <button
                className="btn btnGhost"
                onClick={() => {
                  setCancelTrainingDialog(null);
                  setCancelAdjustmentAmount("15");
                }}
                style={{ width: "100%" }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Dialog für Trainer */}
      {invoiceDialog && isTrainer && ownTrainerId && (
        <div className="modalOverlay">
          <div className="modalCard" style={{ maxWidth: 500 }}>
            <div className="modalHeader">
              <div className="modalPill">Rechnung erstellen</div>
              <h3>Rechnung für {abrechnungMonat.slice(5, 7)}/{abrechnungMonat.slice(0, 4)}</h3>
              <p className="muted">
                Erstellen Sie eine Rechnung für Ihre geleisteten Trainerstunden.
              </p>
            </div>

            <div style={{ padding: "0 20px", marginBottom: 16 }}>
              {invoiceError && (
                <div style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  padding: "8px 12px",
                  borderRadius: 6,
                  marginBottom: 12,
                  fontSize: 13
                }}>
                  {invoiceError}
                </div>
              )}

              <div className="field" style={{ marginBottom: 12 }}>
                <label>Anzahl der abzurechnenden Stunden *</label>
                <input
                  type="number"
                  value={invoiceDialog.stundenAnzahl}
                  onChange={(e) => setInvoiceDialog({
                    ...invoiceDialog,
                    stundenAnzahl: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  style={{ maxWidth: 150 }}
                />
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label>Ihre IBAN *</label>
                <input
                  type="text"
                  value={invoiceDialog.iban}
                  onChange={(e) => setInvoiceDialog({
                    ...invoiceDialog,
                    iban: e.target.value
                  })}
                  placeholder="DE89 3704 0044 0532 0130 00"
                />
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label>Ihre Rechnungsadresse *</label>
                <textarea
                  rows={3}
                  value={invoiceDialog.adresse}
                  onChange={(e) => setInvoiceDialog({
                    ...invoiceDialog,
                    adresse: e.target.value
                  })}
                  placeholder={"Max Mustermann\nMusterstraße 123\n12345 Berlin"}
                />
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label>Steuernummer (optional)</label>
                <input
                  type="text"
                  value={invoiceDialog.ustIdNr}
                  onChange={(e) => setInvoiceDialog({
                    ...invoiceDialog,
                    ustIdNr: e.target.value
                  })}
                  placeholder="123/456/78901"
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={invoiceDialog.kleinunternehmer}
                    onChange={(e) => setInvoiceDialog({
                      ...invoiceDialog,
                      kleinunternehmer: e.target.checked
                    })}
                  />
                  <span>Kleinunternehmerregelung anwenden (keine MwSt.)</span>
                </label>
              </div>
            </div>

            <div className="modalActions">
              <button
                className="btn btnGhost"
                onClick={() => {
                  setInvoiceDialog(null);
                  setInvoiceError("");
                }}
              >
                Abbrechen
              </button>
              <button
                className="btn"
                onClick={() => {
                  // Validierung
                  if (invoiceDialog.stundenAnzahl <= 0) {
                    setInvoiceError("Bitte geben Sie eine gültige Stundenanzahl an.");
                    return;
                  }
                  if (!invoiceDialog.iban.trim()) {
                    setInvoiceError("Bitte geben Sie Ihre IBAN an.");
                    return;
                  }
                  if (!invoiceDialog.adresse.trim()) {
                    setInvoiceError("Bitte geben Sie Ihre Rechnungsadresse an.");
                    return;
                  }

                  // Öffne Vorschau-Dialog
                  const trainerData = trainerById.get(ownTrainerId);
                  const stundensatz = trainerData?.stundensatz ?? 0;
                  const fullName = trainerData?.name + (trainerData?.nachname ? ' ' + trainerData.nachname : '');
                  const now = new Date();
                  const rechnungsnummer = `RG-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

                  const berechneterBetrag = invoiceDialog.stundenAnzahl * stundensatz * (invoiceDialog.kleinunternehmer ? 1 : 1.19);
                  setInvoicePreview({
                    rechnungssteller: fullName,
                    adresse: invoiceDialog.adresse,
                    ustIdNr: invoiceDialog.ustIdNr,
                    rechnungsnummer,
                    rechnungsdatum: now.toLocaleDateString('de-DE'),
                    leistungszeitraum: `${abrechnungMonat.slice(5, 7)}/${abrechnungMonat.slice(0, 4)}`,
                    positionBeschreibung: "Trainerstunden",
                    stundenAnzahl: invoiceDialog.stundenAnzahl,
                    preisProStunde: stundensatz,
                    iban: invoiceDialog.iban,
                    kleinunternehmer: invoiceDialog.kleinunternehmer,
                    useCustomTotal: false,
                    customGesamtbetrag: berechneterBetrag,
                  });

                  setInvoiceDialog(null);
                  setInvoiceError("");
                }}
              >
                Rechnung erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Dialog für Trainer */}
      {invoicePreview && isTrainer && ownTrainerId && (
        <div className="modalOverlay">
          <div className="modalCard" style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modalHeader">
              <div className="modalPill">Rechnungsvorschau</div>
              <h3>Rechnungsvorschau - Anpassungen vornehmen</h3>
              <p className="muted">
                Bearbeiten Sie die Rechnung vor der Erstellung
              </p>
            </div>

            <div style={{ padding: "0 20px", marginBottom: 16 }}>
              {/* Rechnungssteller */}
              <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rechnungssteller</h4>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Name</label>
                  <input
                    type="text"
                    value={invoicePreview.rechnungssteller}
                    onChange={(e) => setInvoicePreview({ ...invoicePreview, rechnungssteller: e.target.value })}
                    style={{ backgroundColor: '#fff' }}
                  />
                </div>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Adresse</label>
                  <textarea
                    rows={3}
                    value={invoicePreview.adresse}
                    onChange={(e) => setInvoicePreview({ ...invoicePreview, adresse: e.target.value })}
                    style={{ backgroundColor: '#fff' }}
                  />
                </div>
                <div className="field">
                  <label>Steuernummer (optional)</label>
                  <input
                    type="text"
                    value={invoicePreview.ustIdNr}
                    onChange={(e) => setInvoicePreview({ ...invoicePreview, ustIdNr: e.target.value })}
                    placeholder="123/456/78901"
                    style={{ backgroundColor: '#fff' }}
                  />
                </div>
              </div>

              {/* Rechnungsdaten */}
              <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rechnungsdaten</h4>
                <div className="row">
                  <div className="field">
                    <label>Rechnungsnummer</label>
                    <input
                      type="text"
                      value={invoicePreview.rechnungsnummer}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, rechnungsnummer: e.target.value })}
                      style={{ backgroundColor: '#fff' }}
                    />
                  </div>
                  <div className="field">
                    <label>Rechnungsdatum</label>
                    <input
                      type="text"
                      value={invoicePreview.rechnungsdatum}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, rechnungsdatum: e.target.value })}
                      style={{ backgroundColor: '#fff' }}
                    />
                  </div>
                  <div className="field">
                    <label>Leistungszeitraum</label>
                    <input
                      type="text"
                      value={invoicePreview.leistungszeitraum}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, leistungszeitraum: e.target.value })}
                      style={{ backgroundColor: '#fff' }}
                    />
                  </div>
                </div>
              </div>

              {/* Position */}
              <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Position</h4>
                <div className="row">
                  <div className="field" style={{ flex: 2 }}>
                    <label>Beschreibung</label>
                    <input
                      type="text"
                      value={invoicePreview.positionBeschreibung}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, positionBeschreibung: e.target.value })}
                      style={{ backgroundColor: '#fff' }}
                    />
                  </div>
                  <div className="field">
                    <label>Anzahl</label>
                    <input
                      type="number"
                      value={invoicePreview.stundenAnzahl}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, stundenAnzahl: parseInt(e.target.value) || 0 })}
                      min="0"
                      style={{ backgroundColor: '#fff' }}
                    />
                  </div>
                  <div className="field">
                    <label>Preis pro Stunde (€)</label>
                    <input
                      type="number"
                      value={invoicePreview.preisProStunde}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, preisProStunde: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      style={{ backgroundColor: '#fff' }}
                    />
                  </div>
                </div>
              </div>

              {/* Berechnete Beträge */}
              <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#e8f4fd', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Beträge</h4>

                {/* Checkbox für manuellen Gesamtbetrag */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={invoicePreview.useCustomTotal}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, useCustomTotal: e.target.checked })}
                    />
                    <span>Manuellen Gesamtbetrag verwenden</span>
                  </label>
                </div>

                {invoicePreview.useCustomTotal && (
                  /* Eingabefeld für manuellen Gesamtbetrag */
                  <div className="field" style={{ marginBottom: 16 }}>
                    <label>Gewünschter Gesamtbetrag (€)</label>
                    <input
                      type="number"
                      value={invoicePreview.customGesamtbetrag}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, customGesamtbetrag: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      style={{ backgroundColor: '#fff', fontSize: 18, fontWeight: 'bold' }}
                    />
                  </div>
                )}

                {/* Beträge-Tabelle */}
                {(() => {
                  const positionSumme = invoicePreview.stundenAnzahl * invoicePreview.preisProStunde;
                  const berechneterBetrag = positionSumme * (invoicePreview.kleinunternehmer ? 1 : 1.19);
                  const korrektur = invoicePreview.useCustomTotal
                    ? invoicePreview.customGesamtbetrag - berechneterBetrag
                    : 0;
                  const zwischensummeMitKorrektur = positionSumme + korrektur;
                  const mwstBetrag = invoicePreview.kleinunternehmer ? 0 : zwischensummeMitKorrektur * 0.19;
                  const endBetrag = zwischensummeMitKorrektur + mwstBetrag;

                  return (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '8px 0' }}>Gesamt Position:</td>
                          <td style={{ padding: '8px 0', textAlign: 'right' }}>
                            {invoicePreview.stundenAnzahl} × {invoicePreview.preisProStunde.toFixed(2).replace('.', ',')} € = <strong>{positionSumme.toFixed(2).replace('.', ',')} €</strong>
                          </td>
                        </tr>
                        {invoicePreview.useCustomTotal && korrektur !== 0 && (
                          <tr style={{ color: korrektur < 0 ? '#c00' : '#060' }}>
                            <td style={{ padding: '8px 0' }}>Korrektur:</td>
                            <td style={{ padding: '8px 0', textAlign: 'right' }}>
                              <strong>{korrektur >= 0 ? '+' : ''}{korrektur.toFixed(2).replace('.', ',')} €</strong>
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ padding: '8px 0' }}>Zwischensumme:</td>
                          <td style={{ padding: '8px 0', textAlign: 'right' }}><strong>{zwischensummeMitKorrektur.toFixed(2).replace('.', ',')} €</strong></td>
                        </tr>
                        {!invoicePreview.kleinunternehmer && (
                          <tr>
                            <td style={{ padding: '8px 0' }}>MwSt. 19%:</td>
                            <td style={{ padding: '8px 0', textAlign: 'right' }}><strong>{mwstBetrag.toFixed(2).replace('.', ',')} €</strong></td>
                          </tr>
                        )}
                        <tr style={{ borderTop: '2px solid #333' }}>
                          <td style={{ padding: '12px 0', fontSize: 16, fontWeight: 'bold' }}>Gesamtbetrag:</td>
                          <td style={{ padding: '12px 0', textAlign: 'right', fontSize: 18, fontWeight: 'bold' }}>
                            {endBetrag.toFixed(2).replace('.', ',')} €
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Kleinunternehmer & IBAN */}
              <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zahlungsinformationen</h4>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={invoicePreview.kleinunternehmer}
                      onChange={(e) => setInvoicePreview({ ...invoicePreview, kleinunternehmer: e.target.checked })}
                    />
                    <span>Kleinunternehmerregelung anwenden (keine MwSt.)</span>
                  </label>
                </div>
                <div className="field">
                  <label>IBAN</label>
                  <input
                    type="text"
                    value={invoicePreview.iban}
                    onChange={(e) => setInvoicePreview({ ...invoicePreview, iban: e.target.value })}
                    style={{ backgroundColor: '#fff' }}
                  />
                </div>
              </div>
            </div>

            <div className="modalActions">
              <button
                className="btn btnGhost"
                onClick={() => {
                  // Zurück zum ersten Dialog
                  setInvoiceDialog({
                    stundenAnzahl: invoicePreview.stundenAnzahl,
                    iban: invoicePreview.iban,
                    adresse: invoicePreview.adresse,
                    ustIdNr: invoicePreview.ustIdNr,
                    kleinunternehmer: invoicePreview.kleinunternehmer,
                  });
                  setInvoicePreview(null);
                }}
              >
                Zurück
              </button>
              <button
                className="btn"
                onClick={() => {
                  // Speichere Einstellungen in localStorage
                  localStorage.setItem(TRAINER_INVOICE_SETTINGS_KEY, JSON.stringify({
                    iban: invoicePreview.iban,
                    ustIdNr: invoicePreview.ustIdNr,
                    kleinunternehmer: invoicePreview.kleinunternehmer,
                  }));

                  // Generiere finale Rechnung
                  const invoiceHTML = generateFinalInvoiceHTML(invoicePreview);

                  const win = window.open('', '_blank');
                  if (win) {
                    win.document.write(invoiceHTML);
                    win.document.close();
                    setTimeout(() => win.print(), 200);
                  }

                  setInvoicePreview(null);
                }}
              >
                PDF erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vertretung Benachrichtigungs-Dialog */}
      {vertretungNotifyDialog && (() => {
        const training = vertretungNotifyDialog.training;
        const newTrainer = trainers.find(t => t.id === vertretungNotifyDialog.newTrainerId);
        if (!training) return null;

        const [y, m, d] = training.datum.split("-");
        const germanDate = d && m && y ? `${d}.${m}.${y}` : training.datum;

        const originalTrainer = trainers.find(t =>
          t.id === (training.trainerId || defaultTrainerId)
        );

        const recipients = training.spielerIds
          .map(id => spielerById.get(id))
          .filter((s): s is Spieler => !!s && !!s.kontaktEmail);

        const emailSubject = `Traineränderung für Ihr Training am ${germanDate}`;

        // Funktion für personalisierten E-Mail-Text
        const getEmailBody = (playerName: string) => `Hallo ${playerName},

wir möchten dich informieren, dass sich der Trainer für dein Training geändert hat:

📅 Datum: ${germanDate}
🕐 Uhrzeit: ${training.uhrzeitVon} - ${training.uhrzeitBis} Uhr
${originalTrainer ? `👤 Ursprünglicher Trainer: ${originalTrainer.name}` : ""}
✨ Neuer Trainer: ${newTrainer?.name ?? "Unbekannt"}

Bei Fragen stehen wir dir gerne zur Verfügung.

Sportliche Grüße,
Deine Tennisschule`;

        // Vorschau mit erstem Empfänger oder Platzhalter
        const previewName = recipients.length > 0 ? getFullName(recipients[0]) : "[Name]";
        const emailBodyPreview = getEmailBody(previewName);

        return (
          <div className="modalOverlay">
            <div className="modalCard" style={{ maxWidth: 600, maxHeight: "90vh", overflow: "auto" }}>
              <div className="modalHeader">
                <div className="modalPill">Vertretung zugewiesen</div>
                <h3>Spieler per E-Mail benachrichtigen?</h3>
                <p className="muted">
                  {newTrainer?.name ?? "Unbekannt"} übernimmt das Training am {germanDate} um {training.uhrzeitVon} - {training.uhrzeitBis} Uhr.
                </p>
              </div>

              <div style={{ padding: "0 20px", marginBottom: 16 }}>
                {/* Empfänger */}
                <div style={{ marginBottom: 16 }}>
                  <strong>Empfänger ({recipients.length}):</strong>
                  {recipients.length > 0 ? (
                    <div style={{
                      marginTop: 8,
                      padding: 12,
                      background: "var(--bg-inset)",
                      borderRadius: 6,
                      fontSize: 13
                    }}>
                      {recipients.map((s, idx) => (
                        <div key={s.id} style={{ marginBottom: idx < recipients.length - 1 ? 4 : 0 }}>
                          {getFullName(s)} <span className="muted">({s.kontaktEmail})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--warning)", fontSize: 13, marginTop: 8 }}>
                      Keiner der Spieler hat eine E-Mail-Adresse hinterlegt.
                    </p>
                  )}

                  {/* Spieler ohne E-Mail */}
                  {training.spielerIds.filter(id => !spielerById.get(id)?.kontaktEmail).length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--warning)" }}>
                      Ohne E-Mail:{" "}
                      {training.spielerIds
                        .filter(id => !spielerById.get(id)?.kontaktEmail)
                        .map(id => getSpielerFullName(id))
                        .join(", ")}
                    </div>
                  )}
                </div>

                {/* E-Mail Vorschau */}
                {recipients.length > 0 && (
                  <div>
                    <strong>E-Mail Vorschau:</strong>
                    <div style={{
                      marginTop: 8,
                      padding: 16,
                      background: "var(--bg-inset)",
                      borderRadius: 6,
                      border: "1px solid var(--border)"
                    }}>
                      <div style={{ marginBottom: 12 }}>
                        <span className="muted" style={{ fontSize: 12 }}>Betreff:</span>
                        <div style={{ fontWeight: 600 }}>{emailSubject}</div>
                      </div>
                      <div>
                        <span className="muted" style={{ fontSize: 12 }}>Nachricht:</span>
                        <pre style={{
                          margin: "4px 0 0 0",
                          fontFamily: "inherit",
                          fontSize: 13,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.5
                        }}>{emailBodyPreview}</pre>
                        {recipients.length > 1 && (
                          <div className="muted" style={{ marginTop: 8, fontSize: 12, fontStyle: "italic" }}>
                            Jeder Spieler erhält eine personalisierte E-Mail mit seinem Namen.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modalActions">
                <button
                  className="btn btnGhost"
                  disabled={vertretungNotifySending}
                  onClick={() => {
                    // Nur speichern ohne E-Mail
                    setVertretungen((prev) => {
                      const filtered = prev.filter((v) => v.trainingId !== vertretungNotifyDialog.trainingId);
                      return [...filtered, {
                        trainingId: vertretungNotifyDialog.trainingId,
                        vertretungTrainerId: vertretungNotifyDialog.newTrainerId
                      }];
                    });
                    setVertretungNotifyDialog(null);
                  }}
                >
                  Ohne E-Mail speichern
                </button>
                <button
                  className="btn"
                  disabled={vertretungNotifySending || recipients.length === 0}
                  onClick={async () => {
                    if (recipients.length === 0) {
                      setVertretungen((prev) => {
                        const filtered = prev.filter((v) => v.trainingId !== vertretungNotifyDialog.trainingId);
                        return [...filtered, {
                          trainingId: vertretungNotifyDialog.trainingId,
                          vertretungTrainerId: vertretungNotifyDialog.newTrainerId
                        }];
                      });
                      setVertretungNotifyDialog(null);
                      return;
                    }

                    setVertretungNotifySending(true);

                    try {
                      // Sende individuelle E-Mails für jeden Empfänger
                      let successCount = 0;
                      const errors: string[] = [];

                      for (const recipient of recipients) {
                        try {
                          const recipientEmails = [
                            recipient.kontaktEmail,
                            ...(recipient.zusaetzlicheEmails || [])
                          ].filter(Boolean) as string[];

                          const response = await fetch("/api/send-newsletter", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              to: recipientEmails,
                              subject: emailSubject,
                              body: getEmailBody(getFullName(recipient)),
                              html: getEmailBody(getFullName(recipient)).replace(/\n/g, "<br>"),
                              fromName: "Tennisschule A bis Z"
                            })
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            errors.push(`${getFullName(recipient)}: ${error.message || "Fehler"}`);
                          } else {
                            successCount++;
                          }
                        } catch (err) {
                          errors.push(`${getFullName(recipient)}: ${err instanceof Error ? err.message : "Fehler"}`);
                        }
                      }

                      // Vertretung speichern (unabhängig vom E-Mail-Erfolg)
                      setVertretungen((prev) => {
                        const filtered = prev.filter((v) => v.trainingId !== vertretungNotifyDialog.trainingId);
                        return [...filtered, {
                          trainingId: vertretungNotifyDialog.trainingId,
                          vertretungTrainerId: vertretungNotifyDialog.newTrainerId
                        }];
                      });

                      if (errors.length > 0) {
                        alert(`${successCount} von ${recipients.length} E-Mails erfolgreich gesendet.\n\nFehler:\n${errors.join("\n")}`);
                      } else {
                        alert(`E-Mail wurde erfolgreich an ${successCount} Spieler gesendet.`);
                      }
                  } catch (err) {
                    alert(`Fehler beim Senden: ${err instanceof Error ? err.message : "Unbekannter Fehler"}\n\nDie Vertretung wird trotzdem gespeichert.`);
                    // Trotzdem speichern
                    setVertretungen((prev) => {
                      const filtered = prev.filter((v) => v.trainingId !== vertretungNotifyDialog.trainingId);
                      return [...filtered, {
                        trainingId: vertretungNotifyDialog.trainingId,
                        vertretungTrainerId: vertretungNotifyDialog.newTrainerId
                      }];
                    });
                  } finally {
                    setVertretungNotifySending(false);
                    setVertretungNotifyDialog(null);
                  }
                }}
              >
                {vertretungNotifySending ? "Wird gesendet..." : "Ja, per E-Mail informieren"}
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Absage Benachrichtigungs-Dialog */}
      {cancelNotifyDialog && (() => {
        const trainingsToCancel = cancelNotifyDialog.trainings;

        // Alle Spieler mit E-Mail sammeln (dedupliziert)
        const recipientMap = new Map<string, Spieler>();
        trainingsToCancel.forEach((t) => {
          t.spielerIds.forEach((id) => {
            const s = spielerById.get(id);
            if (s && s.kontaktEmail) {
              recipientMap.set(s.id, s);
            }
          });
        });
        const recipients = Array.from(recipientMap.values());

        // Trainingsdetails für E-Mail
        const trainingDetails = trainingsToCancel.map((t) => {
          const [y, m, d] = t.datum.split("-");
          const germanDate = d && m && y ? `${d}.${m}.${y}` : t.datum;
          const trainer = trainers.find((tr) => tr.id === (t.trainerId || defaultTrainerId));
          return {
            datum: germanDate,
            uhrzeit: `${t.uhrzeitVon} - ${t.uhrzeitBis}`,
            trainer: trainer?.name ?? "Unbekannt",
            spieler: t.spielerIds.map((id) => getSpielerFullName(id)).join(", ")
          };
        });

        // Personalisierte E-Mail erstellen (Name wird beim Senden ersetzt)
        const getPersonalizedBody = (body: string, playerName: string) => {
          return body.replace(/\[Name\]/g, playerName);
        };

        return (
          <div className="modalOverlay">
            <div className="modalCard" style={{ maxWidth: 600, maxHeight: "90vh", overflow: "auto" }}>
              <div className="modalHeader">
                <div className="modalPill" style={{ background: "#ef4444" }}>Absage</div>
                <h3>Spieler per E-Mail benachrichtigen?</h3>
                <p className="muted">
                  {trainingsToCancel.length === 1
                    ? `Das Training am ${trainingDetails[0].datum} um ${trainingDetails[0].uhrzeit} wird abgesagt.`
                    : `${trainingsToCancel.length} Trainings werden abgesagt.`}
                </p>
              </div>

              <div style={{ padding: "0 20px", marginBottom: 16 }}>
                {/* Empfänger */}
                <div style={{ marginBottom: 16 }}>
                  <strong>Empfänger ({recipients.length}):</strong>
                  {recipients.length > 0 ? (
                    <div style={{
                      marginTop: 8,
                      padding: 12,
                      background: "var(--bg-inset)",
                      borderRadius: 6,
                      fontSize: 13,
                      maxHeight: 100,
                      overflowY: "auto"
                    }}>
                      {recipients.map((s, idx) => (
                        <div key={s.id} style={{ marginBottom: idx < recipients.length - 1 ? 4 : 0 }}>
                          {getFullName(s)} <span className="muted">({s.kontaktEmail})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--warning)", fontSize: 13, marginTop: 8 }}>
                      Keiner der Spieler hat eine E-Mail-Adresse hinterlegt.
                    </p>
                  )}
                </div>

                {/* E-Mail bearbeiten */}
                {recipients.length > 0 && (
                  <div>
                    <strong>E-Mail bearbeiten:</strong>
                    <p className="muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 12 }}>
                      Verwende [Name] als Platzhalter für den Spielernamen.
                    </p>

                    <div className="field" style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 13 }}>Betreff</label>
                      <input
                        type="text"
                        value={cancelNotifySubject}
                        onChange={(e) => setCancelNotifySubject(e.target.value)}
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div className="field">
                      <label style={{ fontSize: 13 }}>Nachricht</label>
                      <textarea
                        value={cancelNotifyBody}
                        onChange={(e) => setCancelNotifyBody(e.target.value)}
                        rows={10}
                        style={{
                          width: "100%",
                          fontFamily: "inherit",
                          fontSize: 13,
                          resize: "vertical"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modalActions">
                <button
                  className="btn btnGhost"
                  disabled={cancelNotifySending}
                  onClick={() => {
                    // Absage ohne E-Mail
                    cancelNotifyDialog.onConfirm();
                    setCancelNotifyDialog(null);
                    setCancelNotifySubject("");
                    setCancelNotifyBody("");
                  }}
                >
                  Ohne E-Mail absagen
                </button>
                <button
                  className="btn"
                  disabled={cancelNotifySending || recipients.length === 0 || !cancelNotifySubject.trim() || !cancelNotifyBody.trim()}
                  onClick={async () => {
                    if (recipients.length === 0) {
                      cancelNotifyDialog.onConfirm();
                      setCancelNotifyDialog(null);
                      return;
                    }

                    setCancelNotifySending(true);
                    try {
                      let successCount = 0;
                      const errors: string[] = [];

                      // Personalisierte E-Mails an jeden Empfänger senden
                      for (const recipient of recipients) {
                        try {
                          const recipientEmails = [
                            recipient.kontaktEmail,
                            ...(recipient.zusaetzlicheEmails || [])
                          ].filter(Boolean) as string[];

                          const response = await fetch("/api/send-newsletter", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              to: recipientEmails,
                              subject: cancelNotifySubject.trim(),
                              body: getPersonalizedBody(cancelNotifyBody.trim(), getFullName(recipient)),
                              html: getPersonalizedBody(cancelNotifyBody.trim(), getFullName(recipient)).replace(/\n/g, "<br>"),
                              fromName: "Tennisschule A bis Z"
                            })
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            errors.push(`${getFullName(recipient)}: ${error.message || "Fehler"}`);
                          } else {
                            successCount++;
                          }
                        } catch (err) {
                          errors.push(`${getFullName(recipient)}: ${err instanceof Error ? err.message : "Fehler"}`);
                        }
                      }

                      // Trainings absagen (unabhängig vom E-Mail-Erfolg)
                      cancelNotifyDialog.onConfirm();

                      if (errors.length > 0) {
                        alert(`${successCount} von ${recipients.length} E-Mails erfolgreich gesendet.\n\nFehler:\n${errors.join("\n")}`);
                      } else {
                        alert(`E-Mail wurde erfolgreich an ${successCount} Spieler gesendet.`);
                      }
                    } catch (err) {
                      alert(`Fehler beim Senden: ${err instanceof Error ? err.message : "Unbekannter Fehler"}\n\nDie Absage wird trotzdem durchgeführt.`);
                      cancelNotifyDialog.onConfirm();
                    } finally {
                      setCancelNotifySending(false);
                      setCancelNotifyDialog(null);
                      setCancelNotifySubject("");
                      setCancelNotifyBody("");
                    }
                  }}
                >
                  {cancelNotifySending ? "Wird gesendet..." : "Ja, per E-Mail informieren"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Dialog: Abzug rückgängig machen bei Reaktivierung */}
      {reverseAdjustmentDialog && (() => {
        const training = reverseAdjustmentDialog.training;
        const [y, m, d] = training.datum.split("-");
        const germanDate = d && m && y ? `${d}.${m}.${y}` : training.datum;
        const spielerNamen = training.spielerIds
          .map((id) => getSpielerFullName(id))
          .join(", ");

        return (
          <div className="modalOverlay">
            <div className="modalCard" style={{ maxWidth: 500 }}>
              <div className="modalHeader">
                <div className="modalPill" style={{ background: "#22c55e" }}>Reaktivierung</div>
                <h3>Abzug rückgängig machen?</h3>
                <p className="muted">
                  Das Training am {germanDate} um {training.uhrzeitVon} - {training.uhrzeitBis} Uhr wird wieder auf "geplant" gesetzt.
                </p>
              </div>

              <div style={{ padding: "0 20px", marginBottom: 16 }}>
                <p style={{ marginBottom: 12 }}>
                  Bei der Absage wurden <strong>15€ pro Spieler</strong> als Abzug verbucht.
                </p>
                <p>
                  Sollen diese Abzüge jetzt wieder rückgängig gemacht werden?
                </p>
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  background: "var(--bg-inset)",
                  borderRadius: 6,
                  fontSize: 13
                }}>
                  <strong>Betroffene Spieler:</strong><br />
                  {spielerNamen}
                </div>
              </div>

              <div className="modalActions">
                <button
                  className="btn btnGhost"
                  onClick={() => {
                    reverseAdjustmentDialog.onConfirm(false);
                    setReverseAdjustmentDialog(null);
                  }}
                >
                  Nein, Abzug behalten
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    reverseAdjustmentDialog.onConfirm(true);
                    setReverseAdjustmentDialog(null);
                  }}
                >
                  Ja, +15€ zurückbuchen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Trainingsinfo E-Mail Modal */}
      {showTrainingInfoEmail && (
        <div className="modalOverlay" onClick={() => setShowTrainingInfoEmail(false)}>
          <div
            className="modalCard"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 600, maxHeight: "90vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Spieler per E-Mail informieren</h2>
              <button
                onClick={() => setShowTrainingInfoEmail(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>

            <div className="muted" style={{ marginBottom: 16 }}>
              <p style={{ margin: "0 0 8px 0" }}>
                Jeder Spieler erhält eine individuelle E-Mail mit seinem Namen.
              </p>
              <p style={{ margin: 0 }}>
                Empfänger: {tSpielerIds
                  .map(id => spielerById.get(id))
                  .filter(s => s?.kontaktEmail)
                  .map(s => `${getFullName(s!)}`)
                  .join(", ") || "Keine Spieler mit E-Mail"}
              </p>
              <p style={{ margin: "8px 0 0 0", fontSize: 12 }}>
                Platzhalter: {"{SPIELERNAME}"} = Vorname, {"{ANDERE_TEILNEHMER}"} = andere Gruppenmitglieder
              </p>
            </div>

            <div className="field" style={{ marginBottom: 12 }}>
              <label>Betreff</label>
              <input
                value={trainingInfoEmailSubject}
                onChange={(e) => setTrainingInfoEmailSubject(e.target.value)}
                placeholder="E-Mail-Betreff"
              />
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>Nachricht</label>
              <textarea
                value={trainingInfoEmailBody}
                onChange={(e) => setTrainingInfoEmailBody(e.target.value)}
                rows={12}
                style={{ width: "100%", fontFamily: "inherit", fontSize: 14 }}
                placeholder="E-Mail-Text"
              />
            </div>

            <div className="modalActions">
              <button
                className="btn btnGhost"
                onClick={() => setShowTrainingInfoEmail(false)}
              >
                Abbrechen
              </button>
              <button
                className="btn"
                disabled={trainingInfoEmailSending}
                onClick={async () => {
                  const spielerMitEmail = tSpielerIds
                    .map(id => spielerById.get(id))
                    .filter(s => s && s.kontaktEmail) as Spieler[];

                  if (spielerMitEmail.length === 0) {
                    alert("Keine Spieler mit E-Mail-Adresse gefunden.");
                    return;
                  }

                  setTrainingInfoEmailSending(true);

                  let erfolgreich = 0;
                  let fehler = 0;

                  try {
                    for (const spieler of spielerMitEmail) {
                      const spielerName = spieler.vorname;
                      const andereTeilnehmer = spielerMitEmail
                        .filter(s => s.id !== spieler.id)
                        .map(s => s.vorname)
                        .join(", ") || "Einzeltraining";

                      const personalizedBody = trainingInfoEmailBody
                        .replace("{SPIELERNAME}", spielerName)
                        .replace("{ANDERE_TEILNEHMER}", andereTeilnehmer);

                      const recipients = [spieler.kontaktEmail, ...(spieler.zusaetzlicheEmails || [])].filter(Boolean);

                      const resp = await fetch("/api/send-newsletter", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          to: recipients,
                          subject: trainingInfoEmailSubject,
                          body: personalizedBody,
                          html: personalizedBody.replace(/\n/g, "<br>"),
                          fromName: "Tennisschule A bis Z",
                        }),
                      });

                      const result = await resp.json();

                      if (resp.ok && result.success) {
                        erfolgreich++;
                      } else {
                        fehler++;
                      }
                    }

                    if (fehler === 0) {
                      alert(`E-Mail erfolgreich an ${erfolgreich} Spieler gesendet!`);
                    } else {
                      alert(`${erfolgreich} E-Mails gesendet, ${fehler} fehlgeschlagen.`);
                    }
                    setShowTrainingInfoEmail(false);
                  } catch (err) {
                    alert(`Fehler beim Senden: ${err instanceof Error ? err.message : "Unbekannter Fehler"}`);
                  } finally {
                    setTrainingInfoEmailSending(false);
                  }
                }}
              >
                {trainingInfoEmailSending ? "Sende..." : "E-Mail senden"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wochenplan PDF Export Modal */}
      {showWeekPdfModal && (() => {
        const pdfWeekStart = startOfWeekISO(weekPdfDate);
        const pdfWeekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(pdfWeekStart, i));
        const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

        const weekTrainings = trainings.filter(t => {
          return t.datum >= pdfWeekStart && t.datum <= pdfWeekDays[6];
        }).sort((a, b) => {
          if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
          return a.uhrzeitVon.localeCompare(b.uhrzeitVon);
        });

        const trainingsByDay = pdfWeekDays.map(day =>
          weekTrainings.filter(t => t.datum === day)
        );

        const formatDateFull = (dateISO: string) => {
          const d = new Date(dateISO + "T12:00:00");
          return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
        };

        return (
          <div className="modalOverlay" onClick={() => setShowWeekPdfModal(false)}>
            <div
              className="modalCard"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 800, maxHeight: "90vh", overflow: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Wochenplan als PDF exportieren</h2>
                <button
                  onClick={() => setShowWeekPdfModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  ×
                </button>
              </div>

              <div className="row" style={{ marginBottom: 16, gap: 12, alignItems: "flex-end" }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Woche auswählen (Montag)</label>
                  <input
                    type="date"
                    value={weekPdfDate}
                    onChange={(e) => setWeekPdfDate(e.target.value)}
                  />
                </div>
                <span className="pill">
                  {formatWeekRange(pdfWeekStart)}
                </span>
                <span className="pill">
                  {weekTrainings.length} Trainings
                </span>
              </div>

              <div style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                maxHeight: 400,
                overflow: "auto",
                marginBottom: 16
              }}>
                {pdfWeekDays.map((day, dayIdx) => (
                  <div key={day} style={{ borderBottom: dayIdx < 6 ? "1px solid #eee" : "none" }}>
                    <div style={{
                      background: "#f5f5f5",
                      padding: "8px 12px",
                      fontWeight: "bold",
                      position: "sticky",
                      top: 0
                    }}>
                      {dayNames[dayIdx]}, {formatDateFull(day)}
                    </div>
                    {trainingsByDay[dayIdx].length === 0 ? (
                      <div style={{ padding: "8px 12px", color: "#999", fontStyle: "italic" }}>
                        Keine Trainings
                      </div>
                    ) : (
                      trainingsByDay[dayIdx].map(t => {
                        const trainer = trainerById.get(t.trainerId || "");
                        const spielerNames = t.spielerIds
                          .map(id => spielerById.get(id))
                          .filter(Boolean)
                          .map(s => getFullName(s!))
                          .join(", ");
                        return (
                          <div key={t.id} style={{
                            padding: "8px 12px",
                            display: "flex",
                            gap: 12,
                            borderTop: "1px solid #f0f0f0"
                          }}>
                            <span style={{ fontWeight: 500, minWidth: 100 }}>
                              {t.uhrzeitVon} - {t.uhrzeitBis}
                            </span>
                            <span style={{ color: "#666", minWidth: 120 }}>
                              {trainer?.name || "Kein Trainer"}
                            </span>
                            <span style={{ flex: 1 }}>
                              {spielerNames || "Keine Spieler"}
                            </span>
                            <span style={{
                              fontSize: 12,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: t.status === "durchgefuehrt" ? "#dcfce7" :
                                         t.status === "abgesagt" ? "#fee2e2" : "#dbeafe",
                              color: t.status === "durchgefuehrt" ? "#166534" :
                                    t.status === "abgesagt" ? "#991b1b" : "#1e40af"
                            }}>
                              {statusLabel(t.status)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                ))}
              </div>

              <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
                <button
                  className="btn btnGhost"
                  onClick={() => setShowWeekPdfModal(false)}
                >
                  Abbrechen
                </button>
                <button
                  className="btn"
                  onClick={async () => {
                    const tableRows = pdfWeekDays.map((day, dayIdx) => {
                      const dayTrainings = trainingsByDay[dayIdx];
                      if (dayTrainings.length === 0) {
                        return `
                          <tr>
                            <td style="padding: 8px 12px; font-weight: bold; background: #f9fafb; border: 1px solid #e5e7eb;">
                              ${dayNames[dayIdx]}<br/><span style="font-weight: normal; font-size: 12px;">${formatDateFull(day)}</span>
                            </td>
                            <td colspan="4" style="padding: 8px 12px; color: #9ca3af; font-style: italic; border: 1px solid #e5e7eb;">
                              Keine Trainings
                            </td>
                          </tr>
                        `;
                      }
                      return dayTrainings.map((t, tIdx) => {
                        const trainer = trainerById.get(t.trainerId || "");
                        const spielerNames = t.spielerIds
                          .map(id => spielerById.get(id))
                          .filter(Boolean)
                          .map(s => getFullName(s!))
                          .join(", ");
                        return `
                          <tr>
                            ${tIdx === 0 ? `
                              <td rowspan="${dayTrainings.length}" style="padding: 8px 12px; font-weight: bold; background: #f9fafb; border: 1px solid #e5e7eb; vertical-align: top;">
                                ${dayNames[dayIdx]}<br/><span style="font-weight: normal; font-size: 12px;">${formatDateFull(day)}</span>
                              </td>
                            ` : ""}
                            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; white-space: nowrap;">
                              ${escapeHtml(t.uhrzeitVon)} - ${escapeHtml(t.uhrzeitBis)}
                            </td>
                            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">
                              ${escapeHtml(trainer?.name) || "-"}
                            </td>
                            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">
                              ${escapeHtml(spielerNames) || "-"}
                            </td>
                            <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: center;">
                              <span style="
                                font-size: 11px;
                                padding: 2px 6px;
                                border-radius: 4px;
                                background: ${t.status === "durchgefuehrt" ? "#dcfce7" : t.status === "abgesagt" ? "#fee2e2" : "#dbeafe"};
                                color: ${t.status === "durchgefuehrt" ? "#166534" : t.status === "abgesagt" ? "#991b1b" : "#1e40af"};
                              ">
                                ${statusLabel(t.status)}
                              </span>
                            </td>
                          </tr>
                        `;
                      }).join("");
                    }).join("");

                    const tableHTML = `
                      <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h1 style="margin: 0 0 8px 0; font-size: 20px; color: #111;">Wochenplan Tennis</h1>
                        <p style="margin: 0 0 20px 0; color: #666; font-size: 14px;">
                          ${formatWeekRange(pdfWeekStart)} (${weekTrainings.length} Trainings)
                        </p>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                          <thead>
                            <tr style="background: #1e3a5f; color: white;">
                              <th style="padding: 10px 12px; text-align: left; border: 1px solid #1e3a5f;">Tag</th>
                              <th style="padding: 10px 12px; text-align: left; border: 1px solid #1e3a5f;">Uhrzeit</th>
                              <th style="padding: 10px 12px; text-align: left; border: 1px solid #1e3a5f;">Trainer</th>
                              <th style="padding: 10px 12px; text-align: left; border: 1px solid #1e3a5f;">Spieler</th>
                              <th style="padding: 10px 12px; text-align: center; border: 1px solid #1e3a5f;">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${tableRows}
                          </tbody>
                        </table>
                        <p style="margin-top: 20px; font-size: 11px; color: #999; text-align: right;">
                          Erstellt am ${formatDateFull(todayISO())}
                        </p>
                      </div>
                    `;

                    const html2pdf = (await import('html2pdf.js')).default;
                    const container = document.createElement('div');
                    container.innerHTML = tableHTML;
                    document.body.appendChild(container);

                    await html2pdf()
                      .set({
                        margin: 10,
                        filename: `Wochenplan_${pdfWeekStart}.pdf`,
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
                      })
                      .from(container)
                      .save();

                    document.body.removeChild(container);
                    setShowWeekPdfModal(false);
                  }}
                >
                  PDF erstellen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Spieler-Übernahme Bestätigungs-Dialog */}
      {showAdoptConfirmDialog && (() => {
        const selectedReqs = registrationRequests.filter(r => selectedRequestIds.has(r.id));
        return (
          <div className="modalOverlay" onClick={() => setShowAdoptConfirmDialog(false)}>
            <div
              className="modalCard"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 600, maxHeight: "90vh", overflow: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>Spieler übernehmen</h2>
                <button
                  onClick={() => setShowAdoptConfirmDialog(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: 20,
                    cursor: "pointer",
                    color: "var(--text-muted)"
                  }}
                >
                  ✕
                </button>
              </div>
              <p style={{ marginBottom: 16 }}>
                Die folgenden {selectedReqs.length} Anmeldungen werden als Spieler übernommen:
              </p>
              <div style={{ maxHeight: 400, overflowY: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)" }}>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>Name</th>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>E-Mail</th>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>Telefon</th>
                      <th style={{ textAlign: "left", padding: "8px 4px" }}>Anlage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReqs.map((req) => (
                      <tr key={req.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 4px" }}>{req.name}</td>
                        <td style={{ padding: "8px 4px", fontSize: 12 }}>{req.email}</td>
                        <td style={{ padding: "8px 4px" }}>{req.telefon || "-"}</td>
                        <td style={{ padding: "8px 4px" }}>
                          {req.anlage && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 600,
                              background: req.anlage === "Britz" ? "var(--warning)" : "var(--primary)",
                              color: req.anlage === "Britz" ? "#000" : "#fff",
                              padding: "2px 6px",
                              borderRadius: 4
                            }}>
                              {req.anlage}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
                Es werden Name, E-Mail, Telefon und Anlage (als Label) übernommen. Nachrichten werden nicht übernommen.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  className="btn btnGhost"
                  onClick={() => setShowAdoptConfirmDialog(false)}
                >
                  Abbrechen
                </button>
                <button
                  className="btn"
                  style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                  onClick={adoptMultiplePlayersFromRequests}
                >
                  {selectedReqs.length} Spieler übernehmen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PDF-Export Modal mit Vorschau */}
      {showPdfExportModal && (() => {
        const filteredSpieler = spieler
          .filter((s) => {
            if (pdfExportLabelFilter === "ohne") {
              return !s.labels || s.labels.length === 0;
            } else if (pdfExportLabelFilter !== "alle") {
              return s.labels?.includes(pdfExportLabelFilter);
            }
            return true;
          })
          .filter((s) => !pdfExportExcluded.has(s.id))
          .sort((a, b) => getFullName(a).localeCompare(getFullName(b)));

        return (
          <div className="modalOverlay" onClick={() => setShowPdfExportModal(false)}>
            <div
              className="modalCard"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 700, maxHeight: "90vh", overflow: "auto" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h2 style={{ margin: 0 }}>PDF exportieren - Vorschau</h2>
                <button
                  onClick={() => setShowPdfExportModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 24,
                    cursor: "pointer",
                    color: "#666",
                  }}
                >
                  ×
                </button>
              </div>

              <div className="row" style={{ marginBottom: 16, gap: 12, alignItems: "flex-end" }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Nach Label filtern</label>
                  <select
                    value={pdfExportLabelFilter}
                    onChange={(e) => setPdfExportLabelFilter(e.target.value)}
                  >
                    <option value="alle">Alle Spieler</option>
                    <option value="ohne">Ohne Label</option>
                    {allLabels.map((label) => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>
                <span className="pill">
                  {filteredSpieler.length} Spieler im PDF
                </span>
              </div>

              <div style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                maxHeight: 400,
                overflow: "auto",
                marginBottom: 16
              }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5", position: "sticky", top: 0 }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", width: 40 }}>#</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Vorname</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Nachname</th>
                      <th style={{ padding: "8px 12px", textAlign: "center", width: 80 }}>Entfernen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSpieler.map((s, idx) => (
                      <tr key={s.id} style={{ borderTop: "1px solid #eee" }}>
                        <td style={{ padding: "8px 12px" }}>{idx + 1}</td>
                        <td style={{ padding: "8px 12px" }}>{s.vorname}</td>
                        <td style={{ padding: "8px 12px" }}>{s.nachname || ""}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <button
                            className="btn btnGhost"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            onClick={() => setPdfExportExcluded(prev => { const next = new Set(prev); next.add(s.id); return next; })}
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredSpieler.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", color: "#666" }}>
                    Keine Spieler für den Export ausgewählt.
                  </div>
                )}
              </div>

              {pdfExportExcluded.size > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    className="btn btnGhost"
                    style={{ fontSize: 12 }}
                    onClick={() => setPdfExportExcluded(new Set())}
                  >
                    Alle {pdfExportExcluded.size} entfernten Spieler wiederherstellen
                  </button>
                </div>
              )}

              <div className="modalActions">
                <button
                  className="btn btnGhost"
                  onClick={() => setShowPdfExportModal(false)}
                >
                  Abbrechen
                </button>
                <button
                  className="btn"
                  disabled={filteredSpieler.length === 0}
                  onClick={async () => {
                    const tableHTML = `
                      <html>
                      <head>
                        <style>
                          body { font-family: Arial, sans-serif; padding: 20px; }
                          h1 { font-size: 18px; margin-bottom: 20px; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
                          th { background-color: #f5f5f5; font-weight: bold; }
                          tr:nth-child(even) { background-color: #fafafa; }
                          .footer { margin-top: 20px; font-size: 11px; color: #666; }
                        </style>
                      </head>
                      <body>
                        <h1>Spielerliste (${filteredSpieler.length} Spieler)${pdfExportLabelFilter !== "alle" ? ` - ${pdfExportLabelFilter === "ohne" ? "Ohne Label" : pdfExportLabelFilter}` : ""}</h1>
                        <table>
                          <thead>
                            <tr>
                              <th style="width: 40px;">#</th>
                              <th>Vorname</th>
                              <th>Nachname</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${filteredSpieler.map((s, idx) => `
                              <tr>
                                <td>${idx + 1}</td>
                                <td>${escapeHtml(s.vorname)}</td>
                                <td>${escapeHtml(s.nachname) || ""}</td>
                              </tr>
                            `).join("")}
                          </tbody>
                        </table>
                        <div class="footer">
                          Erstellt am ${new Date().toLocaleDateString("de-DE")}
                        </div>
                      </body>
                      </html>
                    `;

                    const html2pdf = (await import('html2pdf.js')).default;
                    const container = document.createElement('div');
                    container.innerHTML = tableHTML;
                    document.body.appendChild(container);

                    await html2pdf()
                      .set({
                        margin: 10,
                        filename: `Spielerliste_${new Date().toISOString().split('T')[0]}.pdf`,
                        html2canvas: { scale: 2 },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                      })
                      .from(container)
                      .save();

                    document.body.removeChild(container);
                    setShowPdfExportModal(false);
                  }}
                >
                  PDF erstellen
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Undo Toast */}
      {undoSnapshot && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1f2937",
            color: "white",
            padding: "12px 20px",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: 16,
            zIndex: 9999,
            fontSize: 14,
          }}
        >
          <span>{undoSnapshot.message}</span>
          <button
            onClick={undo}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Rückgängig
          </button>
          <button
            onClick={() => setUndoSnapshot(null)}
            style={{
              background: "transparent",
              color: "#9ca3af",
              border: "none",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}