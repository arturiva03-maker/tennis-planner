import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { BallotStyles, getBallotThemeStyle } from "./ballotStyles";
import { LegalFooter } from "./LegalText";

type Wochentag = "montag" | "dienstag" | "mittwoch" | "donnerstag" | "freitag" | "samstag" | "sonntag";

type RegistrationData = {
  trainee_vorname: string;
  trainee_nachname: string;
  abweichende_kontaktperson: boolean;
  kontakt_vorname: string;
  kontakt_nachname: string;
  email: string;
  telefon: string;
  kontakt_strasse: string;
  kontakt_plz: string;
  kontakt_ort: string;
  verfuegbarkeit: Record<Wochentag, string>;
  trainingsart: string;
  trainings_pro_woche: string;
  erfahrungslevel: string;
  geburtsdatum: string;
  nachricht: string;
  gruppenwuensche: string;
  ist_vereinsmitglied: string;
};

const WOCHENTAGE_ALL: { key: Wochentag; label: string; abbr: string }[] = [
  { key: "montag", label: "Montag", abbr: "MO" },
  { key: "dienstag", label: "Dienstag", abbr: "DI" },
  { key: "mittwoch", label: "Mittwoch", abbr: "MI" },
  { key: "donnerstag", label: "Donnerstag", abbr: "DO" },
  { key: "freitag", label: "Freitag", abbr: "FR" },
  { key: "samstag", label: "Samstag", abbr: "SA" },
  { key: "sonntag", label: "Sonntag", abbr: "SO" },
];

const WOCHENTAGE_WEDDING: { key: Wochentag; label: string; abbr: string }[] = [
  { key: "montag", label: "Montag", abbr: "MO" },
  { key: "dienstag", label: "Dienstag", abbr: "DI" },
  { key: "mittwoch", label: "Mittwoch", abbr: "MI" },
  { key: "donnerstag", label: "Donnerstag", abbr: "DO" },
  { key: "freitag", label: "Freitag", abbr: "FR" },
  { key: "samstag", label: "Samstag", abbr: "SA" },
];

const UHRZEITEN = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

// Alter aus ISO-Geburtsdatum (YYYY-MM-DD) berechnen
function computeAge(iso: string): number | null {
  if (!iso) return null;
  const b = new Date(iso);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// ISO-Datum (YYYY-MM-DD) als TT.MM.JJJJ formatieren
function formatGebDatum(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

const HEUTE_ISO = new Date().toISOString().split("T")[0];

// Solange keine Trainingsplätze frei sind: Formular ausblenden und Hinweis zeigen.
// Zum Wieder-Öffnen der Anmeldung einfach auf false setzen.
const KEINE_TRAININGSPLAETZE_FREI = true;

export type RegistrationPayload = {
  accountId: string;
  anlage: "Wedding" | "Britz";
  trainee_vorname: string;
  trainee_nachname: string;
  abweichende_kontaktperson: boolean;
  kontakt_vorname: string;
  kontakt_nachname: string;
  name: string;
  email: string;
  telefon: string;
  kontakt_strasse: string;
  kontakt_plz: string;
  kontakt_ort: string;
  verfuegbarkeit: Record<Wochentag, string>;
  trainingsart: string;
  trainings_pro_woche: string;
  erfahrungslevel: string;
  alter_jahre: string;
  geburtsdatum: string;
  nachricht: string;
  gruppenwuensche: string;
  ist_vereinsmitglied: string;
};

export async function persistRegistration(payload: RegistrationPayload): Promise<{ error?: string }> {
  const WOCHENTAGE = payload.anlage === "Wedding" ? WOCHENTAGE_WEDDING : WOCHENTAGE_ALL;

  const traineeName = `${payload.trainee_vorname} ${payload.trainee_nachname}`.trim();
  const kontaktName = `${payload.kontakt_vorname} ${payload.kontakt_nachname}`.trim();
  const adresseStr = `${payload.kontakt_strasse}, ${payload.kontakt_plz} ${payload.kontakt_ort}`.trim();

  const { error: insertError } = await supabase
    .from("registration_requests")
    .insert({
      account_id: payload.accountId,
      name: kontaktName,
      email: payload.email,
      telefon: payload.telefon || null,
      verfuegbarkeit: payload.verfuegbarkeit,
      trainingsart: payload.trainingsart || null,
      trainings_pro_woche: payload.trainings_pro_woche
        ? parseInt(payload.trainings_pro_woche, 10)
        : null,
      erfahrungslevel: payload.erfahrungslevel || null,
      alter_jahre: payload.alter_jahre
        ? parseInt(payload.alter_jahre, 10)
        : null,
      nachricht: payload.nachricht || null,
      anlage: payload.anlage,
      ist_vereinsmitglied:
        payload.ist_vereinsmitglied === "ja"
          ? true
          : payload.ist_vereinsmitglied === "nein"
          ? false
          : null,
      trainee_vorname: payload.trainee_vorname || null,
      trainee_nachname: payload.trainee_nachname || null,
      kontakt_vorname: payload.kontakt_vorname || null,
      kontakt_nachname: payload.kontakt_nachname || null,
      kontakt_strasse: payload.kontakt_strasse || null,
      kontakt_plz: payload.kontakt_plz || null,
      kontakt_ort: payload.kontakt_ort || null,
      abweichende_kontaktperson: payload.abweichende_kontaktperson,
      gruppenwuensche: payload.gruppenwuensche || null,
    });

  if (insertError) {
    console.error("Insert error:", insertError);
    return { error: "Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut." };
  }

  const trainingsartText =
    payload.trainingsart === "einzel"
      ? "Einzeltraining"
      : payload.trainingsart === "gruppe"
      ? "Gruppentraining"
      : "Beides möglich";
  const erfahrungText =
    payload.erfahrungslevel === "anfaenger"
      ? "Anfänger"
      : payload.erfahrungslevel === "fortgeschritten"
      ? "Fortgeschritten"
      : payload.erfahrungslevel === "profi"
      ? "Profi / Wettkampfspieler"
      : "Nicht angegeben";

  const verfuegbarkeitRows = WOCHENTAGE.map(({ key, label }) =>
    `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${label}</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${payload.verfuegbarkeit[key]}</td></tr>`
  ).join("");

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .section { background: white; padding: 16px; margin: 16px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .section-title { font-size: 14px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
    .data-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .label { color: #6b7280; min-width: 140px; }
    .value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Trainingsanmeldung ${payload.anlage}</h1>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Trainierende Person</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${traineeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Geburtsdatum</td><td style="padding: 8px 0; font-weight: 500;">${formatGebDatum(payload.geburtsdatum)}${payload.alter_jahre ? ` (${payload.alter_jahre} Jahre)` : ""}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Kontaktperson / Organisator${payload.abweichende_kontaktperson ? "" : " (identisch mit Spieler/in)"}</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${kontaktName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">E-Mail</td><td style="padding: 8px 0; font-weight: 500;">${payload.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Telefon</td><td style="padding: 8px 0; font-weight: 500;">${payload.telefon}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Adresse</td><td style="padding: 8px 0; font-weight: 500;">${adresseStr}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Trainingswünsche</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Trainingsart</td><td style="padding: 8px 0; font-weight: 500;">${trainingsartText}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Pro Woche</td><td style="padding: 8px 0; font-weight: 500;">${payload.trainings_pro_woche}x Training</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Erfahrung</td><td style="padding: 8px 0; font-weight: 500;">${erfahrungText}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Verfügbarkeit</div>
        <table>${verfuegbarkeitRows}</table>
      </div>

      ${payload.nachricht ? `
      <div class="section">
        <div class="section-title">Nachricht</div>
        <p style="margin: 0; white-space: pre-wrap;">${payload.nachricht}</p>
      </div>
      ` : ""}

      ${payload.gruppenwuensche ? `
      <div class="section">
        <div class="section-title">Gruppenwünsche</div>
        <p style="margin: 0; white-space: pre-wrap;">${payload.gruppenwuensche}</p>
      </div>
      ` : ""}
    </div>
    <div class="footer">
      Mit sportlichen Grüßen<br>
      <strong>Ihre Tennisschule A bis Z</strong>
    </div>
  </div>
</body>
</html>`;

  const textVersion = `Trainingsanmeldung ${payload.anlage}\n\nTrainierende Person: ${traineeName} (geb. ${formatGebDatum(payload.geburtsdatum)}, ${payload.alter_jahre} Jahre)\n\nKontaktperson${payload.abweichende_kontaktperson ? "" : " (identisch mit Spieler/in)"}:\nName: ${kontaktName}\nE-Mail: ${payload.email}\nTelefon: ${payload.telefon}\nAdresse: ${adresseStr}\n\nTrainingsart: ${trainingsartText}\nPro Woche: ${payload.trainings_pro_woche}x\nErfahrung: ${erfahrungText}\n\nVerfügbarkeit:\n${WOCHENTAGE.map(({ key, label }) => `${label}: ${payload.verfuegbarkeit[key]}`).join("\n")}${payload.nachricht ? `\n\nNachricht:\n${payload.nachricht}` : ""}${payload.gruppenwuensche ? `\n\nGruppenwünsche:\n${payload.gruppenwuensche}` : ""}`;

  const bestatigungHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .greeting { font-size: 18px; margin-bottom: 16px; }
    .section { background: white; padding: 16px; margin: 16px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .section-title { font-size: 14px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Anmeldung bestätigt</h1>
    </div>
    <div class="content">
      <p class="greeting">Hallo <strong>${kontaktName}</strong>,</p>
      <p>vielen Dank für Ihre Trainingsanmeldung bei der Tennisschule A bis Z!</p>
      <p>Wir haben folgende Daten erhalten:</p>

      <div class="section">
        <div class="section-title">Trainierende Person</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${traineeName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Geburtsdatum</td><td style="padding: 8px 0; font-weight: 500;">${formatGebDatum(payload.geburtsdatum)}${payload.alter_jahre ? ` (${payload.alter_jahre} Jahre)` : ""}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Kontaktperson${payload.abweichende_kontaktperson ? "" : " (identisch mit Spieler/in)"}</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${kontaktName}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">E-Mail</td><td style="padding: 8px 0; font-weight: 500;">${payload.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Telefon</td><td style="padding: 8px 0; font-weight: 500;">${payload.telefon}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Adresse</td><td style="padding: 8px 0; font-weight: 500;">${adresseStr}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Trainingswünsche</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Trainingsart</td><td style="padding: 8px 0; font-weight: 500;">${trainingsartText}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Pro Woche</td><td style="padding: 8px 0; font-weight: 500;">${payload.trainings_pro_woche}x Training</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Erfahrung</td><td style="padding: 8px 0; font-weight: 500;">${erfahrungText}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Verfügbarkeit</div>
        <table>${verfuegbarkeitRows}</table>
      </div>

      ${payload.nachricht ? `
      <div class="section">
        <div class="section-title">Nachricht</div>
        <p style="margin: 0; white-space: pre-wrap;">${payload.nachricht}</p>
      </div>
      ` : ""}

      ${payload.gruppenwuensche ? `
      <div class="section">
        <div class="section-title">Gruppenwünsche</div>
        <p style="margin: 0; white-space: pre-wrap;">${payload.gruppenwuensche}</p>
      </div>
      ` : ""}

      <p style="margin-top: 20px; color: #6b7280;">Wir werden uns in Kürze bei Ihnen melden.</p>
    </div>
    <div class="footer">
      Mit sportlichen Grüßen<br>
      <strong>Ihre Tennisschule A bis Z</strong>
    </div>
  </div>
</body>
</html>`;

  try {
    await fetch("/api/send-newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: [payload.email],
        subject: `Bestätigung Ihrer Trainingsanmeldung - ${payload.anlage}`,
        body: `Hallo ${kontaktName},\n\nvielen Dank für Ihre Trainingsanmeldung bei der Tennisschule A bis Z!\n\n${textVersion}\n\nWir werden uns in Kürze bei Ihnen melden.\n\nMit sportlichen Grüßen,\nIhre Tennisschule A bis Z`,
        html: bestatigungHtml,
        fromName: "Tennisschule A bis Z",
      }),
    });
  } catch (emailErr) {
    console.error("Bestätigungsmail-Fehler:", emailErr);
  }

  try {
    await fetch("/api/send-newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: ["tennisabisz@gmail.com"],
        subject: `Neue Anmeldung ${payload.anlage}: ${traineeName}${payload.abweichende_kontaktperson ? ` (Kontakt: ${kontaktName})` : ""}`,
        body: `Neue Trainingsanmeldung!\n\n${textVersion}`,
        html: emailHtml,
        fromName: "Tennisschule A bis Z",
      }),
    });
  } catch (emailErr) {
    console.error("Trainer-Benachrichtigung-Fehler:", emailErr);
  }

  return {};
}

type RegistrationFormProps = {
  anlage: "Wedding" | "Britz";
  redirectUrl?: string;
  onNext?: (data: RegistrationPayload) => void;
};

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

function isValidRedirectUrl(url: string): boolean {
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

export default function RegistrationForm({ anlage, redirectUrl, onNext }: RegistrationFormProps) {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a") || DEFAULT_ACCOUNT_ID;

  const [formData, setFormData] = useState<RegistrationData>({
    trainee_vorname: "",
    trainee_nachname: "",
    abweichende_kontaktperson: false,
    kontakt_vorname: "",
    kontakt_nachname: "",
    email: "",
    telefon: "",
    kontakt_strasse: "",
    kontakt_plz: "",
    kontakt_ort: "",
    verfuegbarkeit: {
      montag: "",
      dienstag: "",
      mittwoch: "",
      donnerstag: "",
      freitag: "",
      samstag: "",
      sonntag: "",
    },
    trainingsart: "",
    trainings_pro_woche: "",
    erfahrungslevel: "",
    geburtsdatum: "",
    nachricht: "",
    gruppenwuensche: "",
    ist_vereinsmitglied: "",
  });

  const [zeitVon, setZeitVon] = useState<Record<Wochentag, string>>({
    montag: "", dienstag: "", mittwoch: "", donnerstag: "",
    freitag: "", samstag: "", sonntag: ""
  });
  const [zeitBis, setZeitBis] = useState<Record<Wochentag, string>>({
    montag: "", dienstag: "", mittwoch: "", donnerstag: "",
    freitag: "", samstag: "", sonntag: ""
  });
  const [nichtVerfuegbar, setNichtVerfuegbar] = useState<Record<Wochentag, boolean>>({
    montag: false, dienstag: false, mittwoch: false, donnerstag: false,
    freitag: false, samstag: false, sonntag: false
  });

  const WOCHENTAGE = anlage === "Wedding" ? WOCHENTAGE_WEDDING : WOCHENTAGE_ALL;

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMinDaysPopup, setShowMinDaysPopup] = useState(false);
  const [minDaysWarningShown, setMinDaysWarningShown] = useState(false);
  const [popupCountdown, setPopupCountdown] = useState(5);
  const [showVerfuegbarkeitHinweis, setShowVerfuegbarkeitHinweis] = useState(true);

  // Namens-Autocomplete für die trainierende Person (Vorschläge aus der DB).
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [nameSuggestOpen, setNameSuggestOpen] = useState(false);
  const suggestReqRef = useRef(0);
  const pickedRef = useRef(false);

  const alterNum = computeAge(formData.geburtsdatum);
  const istMinderjaehrig = alterNum !== null && alterNum >= 0 && alterNum < 18;

  useEffect(() => {
    if (istMinderjaehrig && !formData.abweichende_kontaktperson) {
      setFormData((prev) => ({ ...prev, abweichende_kontaktperson: true }));
    }
  }, [istMinderjaehrig, formData.abweichende_kontaktperson]);

  // Namensvorschläge: sobald ein Nachname angetippt wird, passende volle Namen
  // aus der DB (spontan_spieler_suche) anbieten – kombiniert mit dem Vornamen.
  useEffect(() => {
    const q = `${formData.trainee_vorname.trim()} ${formData.trainee_nachname.trim()}`.trim();
    if (formData.trainee_nachname.trim().length < 1 || q.length < 2) {
      setNameSuggestions([]);
      setNameSuggestOpen(false);
      return;
    }
    if (pickedRef.current) {
      pickedRef.current = false;
      return;
    }
    const my = ++suggestReqRef.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc("spontan_spieler_suche", { p_account_id: accountId, q });
        if (my !== suggestReqRef.current) return;
        const list = (Array.isArray(data) ? data : []) as string[];
        setNameSuggestions(list);
        setNameSuggestOpen(list.length > 0);
      } catch {
        if (my === suggestReqRef.current) setNameSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.trainee_vorname, formData.trainee_nachname, accountId]);

  // Vollen Namen aus einem Vorschlag übernehmen: letztes Wort = Nachname, Rest = Vorname.
  // Anschließend gespeicherte Personendaten (Kontakt, E-Mail, Telefon, Adresse,
  // ggf. Rechnungsempfänger) vorausfüllen – NICHT die Trainingswünsche/Verfügbarkeit.
  async function pickTraineeName(full: string) {
    pickedRef.current = true;
    const parts = full.trim().split(/\s+/);
    const nach = parts.length > 1 ? parts[parts.length - 1] : "";
    const vor = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
    setNameSuggestOpen(false);
    setNameSuggestions([]);
    setFormData((prev) => ({ ...prev, trainee_vorname: vor, trainee_nachname: nach }));

    try {
      const { data } = await supabase.rpc("sepa_mandat_lookup", {
        p_account_id: accountId,
        p_name: full.trim(),
        p_email: null,
      });
      const res = (data || {}) as {
        strasse?: string | null;
        plz?: string | null;
        ort?: string | null;
        email?: string | null;
        telefon?: string | null;
        istKind?: boolean | null;
        elternteilName?: string | null;
      };
      setFormData((prev) => {
        const next = { ...prev };
        if (!next.email && res.email) next.email = res.email;
        if (!next.telefon && res.telefon) next.telefon = res.telefon;
        if (!next.kontakt_strasse && res.strasse) next.kontakt_strasse = res.strasse;
        if (!next.kontakt_plz && res.plz) next.kontakt_plz = res.plz;
        if (!next.kontakt_ort && res.ort) next.kontakt_ort = res.ort;
        if (res.istKind && res.elternteilName && !next.kontakt_vorname && !next.kontakt_nachname) {
          next.abweichende_kontaktperson = true;
          const kp = res.elternteilName.trim().split(/\s+/);
          next.kontakt_nachname = kp.length > 1 ? kp[kp.length - 1] : "";
          next.kontakt_vorname = kp.length > 1 ? kp.slice(0, -1).join(" ") : kp[0];
        }
        return next;
      });
    } catch {
      // Lookup fehlgeschlagen (z.B. RPC-Version alt) – dann bleibt nur der Name übernommen.
    }
  }

  useEffect(() => {
    if (showMinDaysPopup) {
      setPopupCountdown(5);
      const interval = setInterval(() => {
        setPopupCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showMinDaysPopup]);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  function setField<K extends keyof RegistrationData>(key: K, value: RegistrationData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleZeitVonChange(tag: Wochentag, value: string) {
    setZeitVon((prev) => ({ ...prev, [tag]: value }));
    let bisValue = zeitBis[tag];
    if (value && !bisValue) {
      bisValue = UHRZEITEN[UHRZEITEN.length - 1];
      setZeitBis((prev) => ({ ...prev, [tag]: bisValue }));
    }
    updateVerfuegbarkeit(tag, value, bisValue, nichtVerfuegbar[tag]);
  }

  function handleZeitBisChange(tag: Wochentag, value: string) {
    setZeitBis((prev) => ({ ...prev, [tag]: value }));
    let vonValue = zeitVon[tag];
    if (value && !vonValue) {
      vonValue = UHRZEITEN[0];
      setZeitVon((prev) => ({ ...prev, [tag]: vonValue }));
    }
    updateVerfuegbarkeit(tag, vonValue, value, nichtVerfuegbar[tag]);
  }

  function handleNichtVerfuegbarChange(tag: Wochentag, checked: boolean) {
    setNichtVerfuegbar((prev) => ({ ...prev, [tag]: checked }));
    updateVerfuegbarkeit(tag, zeitVon[tag], zeitBis[tag], checked);
  }

  function updateVerfuegbarkeit(tag: Wochentag, von: string, bis: string, nichtVerf: boolean) {
    let value = "";
    if (nichtVerf) {
      value = "nicht verfügbar";
    } else if (von && bis) {
      value = `${von}-${bis}`;
    }
    setFormData((prev) => ({
      ...prev,
      verfuegbarkeit: {
        ...prev.verfuegbarkeit,
        [tag]: value,
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.trainee_vorname.trim()) {
      setError("Bitte geben Sie den Vornamen der trainierenden Person ein.");
      return;
    }
    if (!formData.trainee_nachname.trim()) {
      setError("Bitte geben Sie den Nachnamen der trainierenden Person ein.");
      return;
    }
    if (!formData.geburtsdatum) {
      setError("Bitte geben Sie das Geburtsdatum der trainierenden Person ein.");
      return;
    }
    if (alterNum === null || alterNum < 0 || alterNum > 100) {
      setError("Bitte geben Sie ein gültiges Geburtsdatum ein.");
      return;
    }
    if (formData.abweichende_kontaktperson) {
      if (!formData.kontakt_vorname.trim()) {
        setError("Bitte geben Sie den Vornamen der Kontaktperson ein.");
        return;
      }
      if (!formData.kontakt_nachname.trim()) {
        setError("Bitte geben Sie den Nachnamen der Kontaktperson ein.");
        return;
      }
    }
    if (!formData.email.trim()) {
      setError("Bitte geben Sie eine E-Mail-Adresse der Kontaktperson ein.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    if (!formData.telefon.trim()) {
      setError("Bitte geben Sie eine Telefonnummer der Kontaktperson ein.");
      return;
    }
    if (!formData.kontakt_strasse.trim()) {
      setError("Bitte geben Sie Straße und Hausnummer der Kontaktperson ein.");
      return;
    }
    if (!formData.kontakt_plz.trim()) {
      setError("Bitte geben Sie die Postleitzahl der Kontaktperson ein.");
      return;
    }
    if (!formData.kontakt_ort.trim()) {
      setError("Bitte geben Sie den Ort der Kontaktperson ein.");
      return;
    }
    if (!formData.trainingsart) {
      setError("Bitte wählen Sie eine Trainingsart aus.");
      return;
    }
    if (!formData.trainings_pro_woche) {
      setError("Bitte wählen Sie die gewünschte Anzahl Trainings pro Woche.");
      return;
    }

    const verfuegbareTageKeys = WOCHENTAGE.filter(({ key }) => {
      const hasTime = zeitVon[key] && zeitBis[key];
      const isNichtVerfuegbar = nichtVerfuegbar[key];
      return hasTime && !isNichtVerfuegbar;
    }).map(({ key }) => key);

    const verfuegbareTage = verfuegbareTageKeys.length;

    let gesamtStunden = 0;
    for (const key of verfuegbareTageKeys) {
      const von = parseInt(zeitVon[key].split(":")[0], 10);
      const bis = parseInt(zeitBis[key].split(":")[0], 10);
      if (!isNaN(von) && !isNaN(bis) && bis > von) {
        gesamtStunden += bis - von;
      }
    }

    const genugVerfuegbarkeit = verfuegbareTage >= 3 || gesamtStunden >= 8;

    if (!genugVerfuegbarkeit && !minDaysWarningShown) {
      setShowMinDaysPopup(true);
      return;
    }

    setLoading(true);

    const verfuegbarkeitFinal: Record<Wochentag, string> = { ...formData.verfuegbarkeit };
    for (const tag of WOCHENTAGE) {
      if (!verfuegbarkeitFinal[tag.key]) {
        verfuegbarkeitFinal[tag.key] = "nicht verfügbar";
      }
    }

    const traineeVorname = formData.trainee_vorname.trim();
    const traineeNachname = formData.trainee_nachname.trim();
    const kontaktVorname = formData.abweichende_kontaktperson
      ? formData.kontakt_vorname.trim()
      : traineeVorname;
    const kontaktNachname = formData.abweichende_kontaktperson
      ? formData.kontakt_nachname.trim()
      : traineeNachname;
    const kontaktName = `${kontaktVorname} ${kontaktNachname}`.trim();

    const payload: RegistrationPayload = {
      accountId,
      anlage,
      trainee_vorname: traineeVorname,
      trainee_nachname: traineeNachname,
      abweichende_kontaktperson: formData.abweichende_kontaktperson,
      kontakt_vorname: kontaktVorname,
      kontakt_nachname: kontaktNachname,
      name: kontaktName,
      email: formData.email.trim(),
      telefon: formData.telefon.trim(),
      kontakt_strasse: formData.kontakt_strasse.trim(),
      kontakt_plz: formData.kontakt_plz.trim(),
      kontakt_ort: formData.kontakt_ort.trim(),
      verfuegbarkeit: verfuegbarkeitFinal,
      trainingsart: formData.trainingsart,
      trainings_pro_woche: formData.trainings_pro_woche,
      erfahrungslevel: formData.erfahrungslevel,
      alter_jahre: alterNum !== null ? String(alterNum) : "",
      geburtsdatum: formData.geburtsdatum,
      nachricht: formData.nachricht.trim(),
      gruppenwuensche: formData.gruppenwuensche.trim(),
      ist_vereinsmitglied: formData.ist_vereinsmitglied,
    };

    if (onNext) {
      setLoading(false);
      onNext(payload);
      return;
    }

    try {
      const { error: persistError } = await persistRegistration(payload);
      if (persistError) {
        setError(persistError);
        return;
      }
      setSuccess(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError(
        "Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."
      );
    } finally {
      setLoading(false);
    }
  }

  const themeStyle = getBallotThemeStyle(anlage);

  if (KEINE_TRAININGSPLAETZE_FREI) {
    return (
      <div className="ballotForm" style={themeStyle}>
        <BallotStyles />
        <div className="sheet">
          <div className="meta">
            <span>Anmeldung {anlage}</span>
          </div>
          <h1 className="display">
            Aktuell keine <em>Trainingsplätze</em> frei.
          </h1>
          <p className="intro">
            Für die Anlage {anlage} sind derzeit alle Trainingsplätze belegt.
            Eine Anmeldung ist momentan leider nicht möglich. Sobald wieder
            Plätze frei werden, öffnen wir die Anmeldung an dieser Stelle erneut.
          </p>
          <p className="intro">
            Bei Fragen erreichen Sie uns unter{" "}
            <a href="mailto:tennisabisz@gmail.com">tennisabisz@gmail.com</a>.
          </p>
        </div>
        <LegalFooter anlage={anlage} />
      </div>
    );
  }

  if (success) {
    if (redirectUrl && isValidRedirectUrl(redirectUrl)) {
      setTimeout(() => { window.location.href = redirectUrl; }, 3000);
    }
    return (
      <div className="ballotForm" style={themeStyle}>
        <BallotStyles />
        <div className="sheet">
          <div className="meta">
            <span>Eingang bestätigt</span>
          </div>
          <div className="success-stamp">✓ Eingegangen</div>
          <h1 className="display">Ihre Anmeldung <em>liegt vor</em>.</h1>
          <p className="intro">
            Wir haben Ihre Angaben erhalten und melden uns in Kürze bei Ihnen.
            Eine Bestätigung ist an Ihre E-Mail-Adresse unterwegs.
          </p>
          {redirectUrl && isValidRedirectUrl(redirectUrl) && (
            <p className="mono" style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted-soft)", marginTop: 24 }}>
              Weiterleitung läuft …
            </p>
          )}
        </div>
      </div>
    );
  }

  const verfuegbareTageCount = WOCHENTAGE.filter(({ key }) =>
    zeitVon[key] && zeitBis[key] && !nichtVerfuegbar[key]
  ).length;

  const stepLabel = onNext ? "Schritt 1 / 2" : "Einzelschritt";

  return (
    <div className="ballotForm" style={themeStyle}>
      <BallotStyles />

      {showVerfuegbarkeitHinweis && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="overlay-sheet">
            <div className="stamp">Hinweis</div>
            <h2>Viele Zeiten = höhere Trefferquote.</h2>
            <p>
              Je mehr Wochentage und Zeitfenster Sie angeben, desto wahrscheinlicher
              finden wir einen passenden Slot für Ihr Training.
            </p>
            <div className="actions">
              <button className="primary" type="button" onClick={() => setShowVerfuegbarkeitHinweis(false)}>
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sheet">
        <div className="meta">
          <span>{stepLabel}</span>
        </div>

        <h1 className="display">
          Trainings&shy;anmeldung <em>Tennisschule A bis Z</em>
        </h1>
        <p className="intro">
          Bitte füllen Sie das Formular sorgfältig aus. Pflichtfelder sind mit einem farbigen
          Punkt gekennzeichnet. Die Angaben dienen der Einteilung in Trainingsgruppen.
        </p>

        <div className="notice">
          <div className="label">Hinweis · Mitgliedschaft</div>
          <div className="body">
            <p>
              Das Training ist grundsätzlich nur für Vereinsmitglieder möglich. Mitglieder
              zahlen neben den Trainingsgebühren zusätzliche Mitgliedsgebühren. Ausnahmen
              bestehen für Probetrainings und Tenniscamps.
            </p>
            <p>
              Weitere Informationen zu Mitgliedspreisen auf der Vereinswebsite:{" "}
              <a
                href={anlage === "Wedding" ? "https://bscrehberge-tennis.de/" : "https://tc-britz.de/"}
                target="_blank"
                rel="noopener noreferrer"
              >
                {anlage === "Wedding" ? "bscrehberge-tennis.de" : "tc-britz.de"}
              </a>
            </p>
            <p>
              Es gelten unsere{" "}
              <a
                href={anlage === "Britz" ? "/agb-britz" : "/agb"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Trainingsbedingungen und Preise
              </a>
              .
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Trainierende Person */}
          <div className="section-head">
            <span className="num">1</span>
            <span className="title">Trainierende Person (Spieler/in)</span>
          </div>
          <p className="section-note">
            Wer nimmt am Training teil? Bei Kindern hier den Namen des Kindes eintragen —
            die Kontaktdaten der Eltern erfassen wir gleich darunter.
          </p>

          <div className="field-row">
            <div className="field-num">01</div>
            <div className="field-body">
              <label>Vorname Spieler/in<span className="req">●</span></label>
              <input
                type="text"
                name="trainee_vorname"
                value={formData.trainee_vorname}
                onChange={handleChange}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">02</div>
            <div className="field-body">
              <label>Nachname Spieler/in<span className="req">●</span></label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  name="trainee_nachname"
                  value={formData.trainee_nachname}
                  onChange={handleChange}
                  onFocus={() => { if (nameSuggestions.length > 0) setNameSuggestOpen(true); }}
                  onBlur={() => setTimeout(() => setNameSuggestOpen(false), 180)}
                  autoComplete="off"
                />
                {nameSuggestOpen && nameSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      background: "#ffffff",
                      border: "1px solid #cdd6e4",
                      maxHeight: 220,
                      overflowY: "auto",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                    }}
                  >
                    {nameSuggestions.map((n, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); pickTraineeName(n); }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "9px 12px",
                          background: "none",
                          border: "none",
                          borderBottom: "1px solid #eef1f6",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "#1a2233",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">03</div>
            <div className="field-body">
              <label>Geburtsdatum Spieler/in<span className="req">●</span></label>
              <input
                type="date"
                name="geburtsdatum"
                value={formData.geburtsdatum}
                onChange={handleChange}
                max={HEUTE_ISO}
              />
              {alterNum !== null && alterNum >= 0 && alterNum <= 100 && (
                <p className="section-note" style={{ marginTop: 6 }}>
                  Alter: {alterNum} {alterNum === 1 ? "Jahr" : "Jahre"}
                </p>
              )}
            </div>
          </div>

          {/* Kontaktperson */}
          <div className="section-head">
            <span className="num">2</span>
            <span className="title">Kontaktperson / Organisator</span>
          </div>
          <p className="section-note">
            Wer organisiert die Anmeldung und ist unser Ansprechpartner? Bei Erwachsenen
            meist die trainierende Person selbst. Bei Kindern bitte die Daten des
            Elternteils / Erziehungsberechtigten eintragen — diese Person erhält
            Bestätigungen und Rechnungen.
          </p>

          <div className="field-row">
            <div className="field-num">04</div>
            <div className="field-body">
              <label className="checkbox block" style={{ marginTop: 6, opacity: istMinderjaehrig ? 0.7 : 1 }}>
                <input
                  type="checkbox"
                  name="abweichende_kontaktperson"
                  checked={formData.abweichende_kontaktperson}
                  onChange={handleChange}
                  disabled={istMinderjaehrig}
                />
                Kontaktperson weicht von der trainierenden Person ab
                (z.B. Eltern bei Kindern unter 18)
              </label>
              {istMinderjaehrig && (
                <p className="section-note" style={{ marginTop: 6, color: "var(--accent)" }}>
                  Spieler/in ist minderjährig — bitte Daten eines Elternteils / Erziehungsberechtigten als Kontaktperson eintragen.
                </p>
              )}
            </div>
          </div>

          {formData.abweichende_kontaktperson && (
            <>
              <div className="field-row">
                <div className="field-num">05</div>
                <div className="field-body">
                  <label>Vorname Kontaktperson<span className="req">●</span></label>
                  <input
                    type="text"
                    name="kontakt_vorname"
                    value={formData.kontakt_vorname}
                    onChange={handleChange}
                    autoComplete="given-name"
                    placeholder="z.B. Maria"
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field-num">06</div>
                <div className="field-body">
                  <label>Nachname Kontaktperson<span className="req">●</span></label>
                  <input
                    type="text"
                    name="kontakt_nachname"
                    value={formData.kontakt_nachname}
                    onChange={handleChange}
                    autoComplete="family-name"
                    placeholder="z.B. Müller"
                  />
                </div>
              </div>
            </>
          )}

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "07" : "05"}</div>
            <div className="field-body">
              <label>E-Mail Kontaktperson<span className="req">●</span></label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "08" : "06"}</div>
            <div className="field-body">
              <label>Telefon Kontaktperson<span className="req">●</span></label>
              <input
                type="tel"
                name="telefon"
                value={formData.telefon}
                onChange={handleChange}
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "09" : "07"}</div>
            <div className="field-body">
              <label>Straße und Hausnummer<span className="req">●</span></label>
              <input
                type="text"
                name="kontakt_strasse"
                value={formData.kontakt_strasse}
                onChange={handleChange}
                autoComplete="street-address"
                placeholder="z.B. Musterstraße 12"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "10" : "08"}</div>
            <div className="field-body">
              <label>Postleitzahl<span className="req">●</span></label>
              <input
                type="text"
                name="kontakt_plz"
                value={formData.kontakt_plz}
                onChange={handleChange}
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="z.B. 13351"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "11" : "09"}</div>
            <div className="field-body">
              <label>Ort<span className="req">●</span></label>
              <input
                type="text"
                name="kontakt_ort"
                value={formData.kontakt_ort}
                onChange={handleChange}
                autoComplete="address-level2"
                placeholder="z.B. Berlin"
              />
            </div>
          </div>

          {/* Training */}
          <div className="section-head">
            <span className="num">3</span>
            <span className="title">Trainingswünsche</span>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "12" : "10"}</div>
            <div className="field-body">
              <label>Trainingsart<span className="req">●</span></label>
              <div className="segmented" style={{ ["--cols" as any]: 3 }}>
                {[
                  { value: "einzel", label: "Einzel" },
                  { value: "gruppe", label: "Gruppe" },
                  { value: "beides", label: "Beides" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={formData.trainingsart === opt.value ? "active" : ""}
                    onClick={() => setField("trainingsart", opt.value)}
                  >
                    <span className="dot" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "13" : "11"}</div>
            <div className="field-body">
              <label>Pro Woche<span className="req">●</span></label>
              <div className="segmented" style={{ ["--cols" as any]: 3 }}>
                {["1", "2", "3"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={formData.trainings_pro_woche === n ? "active" : ""}
                    onClick={() => setField("trainings_pro_woche", n)}
                  >
                    <span className="dot" />
                    {n}× pro Woche
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "14" : "12"}</div>
            <div className="field-body">
              <label>Erfahrung</label>
              <div className="segmented" style={{ ["--cols" as any]: 3 }}>
                {[
                  { value: "anfaenger", label: "Anfänger" },
                  { value: "fortgeschritten", label: "Fortgeschritten" },
                  { value: "profi", label: "Wettkampf" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={formData.erfahrungslevel === opt.value ? "active" : ""}
                    onClick={() => setField("erfahrungslevel", opt.value)}
                  >
                    <span className="dot" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "15" : "13"}</div>
            <div className="field-body">
              <label>Vereinsmitglied<span className="req">●</span></label>
              <div className="segmented" style={{ ["--cols" as any]: 2 }}>
                {[
                  { value: "ja", label: "Ja, Mitglied" },
                  { value: "nein", label: "Nein" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={formData.ist_vereinsmitglied === opt.value ? "active" : ""}
                    onClick={() => setField("ist_vereinsmitglied", opt.value)}
                  >
                    <span className="dot" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Verfügbarkeit */}
          <div className="section-head">
            <span className="num">4</span>
            <span className="title">Verfügbarkeit</span>
          </div>
          <p className="section-note">
            Tragen Sie für jeden Tag Ihr Zeitfenster ein. Ein leer gelassener Tag gilt
            automatisch als nicht verfügbar.{" "}
            <span className="mono" style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>
              {verfuegbareTageCount.toString().padStart(2, "0")} / {WOCHENTAGE.length.toString().padStart(2, "0")} Tage gesetzt
            </span>
          </p>

          <div style={{ marginTop: 16 }}>
            {WOCHENTAGE.map(({ key, label, abbr }, i) => (
              <div key={key} className="verf-row">
                <div className="verf-num">{String(i + 1).padStart(2, "0")}</div>
                <div className="verf-day" title={label}>{abbr}</div>
                <div className="verf-controls">
                  <select
                    className="verf-select"
                    value={zeitVon[key]}
                    onChange={(e) => handleZeitVonChange(key, e.target.value)}
                    disabled={nichtVerfuegbar[key]}
                    aria-label={`${label} Startzeit`}
                  >
                    <option value="">Von</option>
                    {UHRZEITEN.map((zeit) => (
                      <option key={zeit} value={zeit}>{zeit}</option>
                    ))}
                  </select>
                  <span className="dash">—</span>
                  <select
                    className="verf-select"
                    value={zeitBis[key]}
                    onChange={(e) => handleZeitBisChange(key, e.target.value)}
                    disabled={nichtVerfuegbar[key]}
                    aria-label={`${label} Endzeit`}
                  >
                    <option value="">Bis</option>
                    {UHRZEITEN.map((zeit) => (
                      <option key={zeit} value={zeit}>{zeit}</option>
                    ))}
                  </select>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={nichtVerfuegbar[key]}
                      onChange={(e) => handleNichtVerfuegbarChange(key, e.target.checked)}
                    />
                    nicht verfügbar
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Anmerkungen */}
          <div className="section-head">
            <span className="num">5</span>
            <span className="title">Anmerkungen</span>
          </div>

          <div className="field-row">
            <div className="field-num">{formData.abweichende_kontaktperson ? "16" : "14"}</div>
            <div className="field-body">
              <label>Nachricht (optional)</label>
              <textarea
                name="nachricht"
                value={formData.nachricht}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>

          {(formData.trainingsart === "gruppe" || formData.trainingsart === "beides") && (
            <div className="field-row">
              <div className="field-num">{formData.abweichende_kontaktperson ? "17" : "15"}</div>
              <div className="field-body">
                <label>Gruppenwünsche</label>
                <p className="section-note" style={{ marginTop: -4, marginBottom: 10 }}>
                  Wunschpartner? Oder kurze Beschreibung Ihrer Spielstärke — das hilft
                  bei der Gruppeneinteilung.
                </p>
                <textarea
                  name="gruppenwuensche"
                  value={formData.gruppenwuensche}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="error-line" role="alert">
              <div className="label">Fehler</div>
              <div>{error}</div>
            </div>
          )}

          <div className="submit-area">
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Wird gesendet …" : onNext ? "Weiter zum SEPA-Mandat" : "Anmeldung absenden"}
            </button>
          </div>
        </form>
      </div>

      {showMinDaysPopup && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="overlay-sheet">
            <div className="stamp">Prüfung · Verfügbarkeit</div>
            <h2>Sehr schmales Zeitfenster.</h2>
            <p>
              Sie haben weniger als drei Tage oder insgesamt weniger als acht Stunden
              angegeben. Möglicherweise finden wir kein passendes Training.
            </p>
            <p>
              Erweitern Sie Ihre Angaben — oder fahren Sie bewusst fort.
            </p>
            {popupCountdown > 0 && (
              <div className="countdown">Bestätigung in {popupCountdown}s</div>
            )}
            <div className="actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setShowMinDaysPopup(false)}
                disabled={popupCountdown > 0}
              >
                Anpassen
              </button>
              <button
                type="button"
                className="primary"
                disabled={popupCountdown > 0}
                onClick={() => {
                  setShowMinDaysPopup(false);
                  setMinDaysWarningShown(true);
                  const form = document.querySelector(".ballotForm form") as HTMLFormElement | null;
                  if (form) form.requestSubmit();
                }}
              >
                Trotzdem fortfahren
              </button>
            </div>
          </div>
        </div>
      )}
      <LegalFooter anlage={anlage} />
    </div>
  );
}
