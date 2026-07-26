import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { checkIBAN, ibanErrorMessage, normalizeIBAN } from "./iban";
import "./App.css";
import "./tenniscamp.css";
import { LegalFooter } from "./LegalText";

type CampOption = {
  id: string;
  label: string;
  dates: string;
  type: "kind" | "erwachsene";
  price: number;
  closed?: boolean;
};

const CAMP_OPTIONS: CampOption[] = [
  { id: "woche1-erwachsene", label: "Erwachsenencamp - 1. Ferienwoche", dates: "13.07. - 17.07.2026", type: "erwachsene", price: 140 },
  { id: "woche6-kind", label: "Kindercamp - Letzte Ferienwoche", dates: "17.08. - 21.08.2026", type: "kind", price: 270, closed: true },
  { id: "woche6-erwachsene", label: "Erwachsenencamp - Letzte Ferienwoche", dates: "17.08. - 21.08.2026", type: "erwachsene", price: 140, closed: true },
];

type TenniscampData = {
  campId: string;
  teilnehmerVorname: string;
  teilnehmerNachname: string;
  zahlungspflichtigerVorname: string;
  zahlungspflichtigerNachname: string;
  geburtsdatum: string;
  telefon: string;
  email: string;
  strasse: string;
  plz: string;
  ort: string;
  iban: string;
  bemerkungen: string;
  niveau: string;
  spielstandBeschreibung: string;
  mitglied: "" | "ja" | "nein";
  sepaZustimmung: boolean;
  verbindlicheAnmeldung: boolean;
};

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

function escapeNotfallHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Sauber formatierter Notfallbogen (A4) als HTML -> via html2pdf zum Download
function buildNotfallbogenHTML(kindVorname: string, kindNachname: string, selectedCampId: string): string {
  const kinderCamps = CAMP_OPTIONS.filter((c) => c.type === "kind");

  const box = (checked: boolean) =>
    checked
      ? `<span style="display:inline-block;width:12pt;height:12pt;border:1.3pt solid #171717;border-radius:2pt;text-align:center;line-height:11pt;font-size:10pt;font-weight:700;color:#171717;vertical-align:middle;margin-right:8pt;">&#10003;</span>`
      : `<span style="display:inline-block;width:12pt;height:12pt;border:1.3pt solid #6b7280;border-radius:2pt;vertical-align:middle;margin-right:8pt;"></span>`;

  const sectionTitle = (t: string) =>
    `<div style="font-size:9pt;font-weight:700;color:#171717;text-transform:uppercase;letter-spacing:0.7pt;margin:0 0 6pt 0;">${t}</div>`;

  const lineField = (label: string, value: string) =>
    `<div style="font-size:8pt;color:#6b7280;margin-bottom:2pt;">${label}</div>` +
    `<div style="border-bottom:1pt solid #9ca3af;min-height:18pt;font-size:11pt;color:#111827;padding:2pt 2pt 1pt;">${value ? escapeNotfallHtml(value) : "&nbsp;"}</div>`;

  const twoCol = (ll: string, lv: string, rl: string, rv: string) =>
    `<table style="width:100%;border-collapse:collapse;margin-bottom:13pt;"><tr>` +
    `<td style="width:48%;vertical-align:top;padding:0;">${lineField(ll, lv)}</td>` +
    `<td style="width:4%;"></td>` +
    `<td style="width:48%;vertical-align:top;padding:0;">${lineField(rl, rv)}</td>` +
    `</tr></table>`;

  return `
<div style="width:190mm;font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;box-sizing:border-box;">
  <div style="border-bottom:2.5pt solid #171717;padding-bottom:8pt;margin-bottom:12pt;">
    <div style="font-size:23pt;font-weight:800;color:#171717;letter-spacing:0.5pt;">Notfallbogen</div>
    <div style="font-size:12pt;font-weight:600;color:#374151;margin-top:2pt;">Sommer-Tenniscamp 2026</div>
    <div style="font-size:9pt;color:#6b7280;margin-top:4pt;">Tennisschule A bis Z &nbsp;&middot;&nbsp; BSC Rehberge 1945 e.V. &ndash; Abteilung Tennis</div>
  </div>

  <div style="background:#f5f5f5;border:1pt solid #171717;border-radius:4pt;padding:8pt 10pt;font-size:9pt;color:#171717;margin-bottom:14pt;">
    Bitte vollst&auml;ndig ausf&uuml;llen und <b>unterschrieben am ersten Camp-Tag</b> mitbringen.
  </div>

  ${sectionTitle("Tenniscamp (bitte ankreuzen)")}
  <div style="font-size:10.5pt;margin-bottom:14pt;">
    ${kinderCamps
      .map(
        (c) =>
          `<div style="margin-bottom:6pt;">${box(c.id === selectedCampId)}${c.label} <span style="color:#6b7280;">(${c.dates})</span></div>`
      )
      .join("")}
  </div>

  ${sectionTitle("Angaben zum Kind")}
  ${twoCol("Vorname", kindVorname, "Nachname", kindNachname)}

  ${sectionTitle("Erziehungsberechtigte/r")}
  ${twoCol("Vorname", "", "Nachname", "")}

  ${sectionTitle("Telefonnummer f&uuml;r den Notfall")}
  <div style="margin-bottom:14pt;">${lineField("Erreichbar w&auml;hrend der Camp-Zeiten", "")}</div>

  ${sectionTitle("Haftungsausschluss")}
  <div style="font-size:9pt;line-height:1.55;color:#374151;margin-bottom:14pt;">
    Die Unterrichtsteilnahme Ihres Kindes an den oben angekreuzten Tenniscamps erfolgt auf eigene Gefahr.
    Die Tennisschule A bis Z und der BSC Rehberge 1945 e.V. &ndash; Abteilung Tennis &uuml;bernehmen keinerlei
    Haftung f&uuml;r den Ersatz liegengebliebener oder abhanden gekommener Gegenst&auml;nde.
  </div>

  ${sectionTitle("Allergien / Krankheiten")}
  <div style="font-size:9.5pt;color:#374151;margin-bottom:6pt;">Hat Ihr Kind besondere Allergien oder Krankheiten &ndash; wenn ja, welche?</div>
  <div style="border-bottom:1pt solid #9ca3af;height:18pt;margin-bottom:8pt;"></div>
  <div style="border-bottom:1pt solid #9ca3af;height:18pt;margin-bottom:18pt;"></div>

  <table style="width:100%;border-collapse:collapse;margin-top:6pt;"><tr>
    <td style="width:48%;vertical-align:top;padding:0;">
      <div style="border-bottom:1pt solid #6b7280;height:22pt;"></div>
      <div style="font-size:8pt;color:#6b7280;margin-top:3pt;">Ort, Datum</div>
    </td>
    <td style="width:4%;"></td>
    <td style="width:48%;vertical-align:top;padding:0;">
      <div style="border-bottom:1pt solid #6b7280;height:22pt;"></div>
      <div style="font-size:8pt;color:#6b7280;margin-top:3pt;">Unterschrift Erziehungsberechtigte/r</div>
    </td>
  </tr></table>
</div>`;
}

// Alter aus ISO-Geburtsdatum (YYYY-MM-DD) berechnen
function computeAge(iso: string): number | null {
  if (!iso) return null;
  const birth = new Date(iso + "T00:00:00");
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function TenniscampForm() {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a") || DEFAULT_ACCOUNT_ID;

  const [formData, setFormData] = useState<TenniscampData>({
    campId: "",
    teilnehmerVorname: "",
    teilnehmerNachname: "",
    zahlungspflichtigerVorname: "",
    zahlungspflichtigerNachname: "",
    geburtsdatum: "",
    telefon: "",
    email: "",
    strasse: "",
    plz: "",
    ort: "",
    iban: "",
    bemerkungen: "",
    niveau: "",
    spielstandBeschreibung: "",
    mitglied: "",
    sepaZustimmung: false,
    verbindlicheAnmeldung: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const selectedCamp = CAMP_OPTIONS.find(c => c.id === formData.campId);
  const isKindercamp = selectedCamp?.type === "kind";
  // Das Erwachsenencamp ist ausgebucht – Anmeldungen laufen nur noch über die Warteliste.
  const isErwachsenencamp = !!selectedCamp && selectedCamp.type === "erwachsene";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  function formatIBAN(value: string): string {
    const cleaned = value.replace(/\s/g, "").toUpperCase();
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  }

  function handleIBANChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatIBAN(e.target.value);
    setFormData((prev) => ({ ...prev, iban: formatted }));
  }

  async function handleNotfallbogenDownload() {
    setPdfLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.innerHTML = buildNotfallbogenHTML(
        formData.teilnehmerVorname.trim(),
        formData.teilnehmerNachname.trim(),
        formData.campId
      );
      document.body.appendChild(container);
      try {
        await html2pdf()
          .set({
            margin: 10,
            filename: "Notfallbogen_Tenniscamp_2026.pdf",
            html2canvas: { scale: 2 },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
          })
          .from(container.firstElementChild as HTMLElement)
          .save();
      } finally {
        document.body.removeChild(container);
      }
    } catch (err) {
      console.error("Notfallbogen-PDF-Fehler:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.campId) {
      setError("Bitte wählen Sie ein Tenniscamp aus.");
      return;
    }

    if (selectedCamp?.closed) {
      setError("Für dieses Camp ist die Anmeldung leider geschlossen.");
      return;
    }

    if (!formData.teilnehmerVorname.trim() || !formData.teilnehmerNachname.trim()) {
      setError("Bitte geben Sie den vollständigen Namen des Teilnehmers ein.");
      return;
    }

    if (isKindercamp && (!formData.zahlungspflichtigerVorname.trim() || !formData.zahlungspflichtigerNachname.trim())) {
      setError("Bitte geben Sie den Namen des Zahlungspflichtigen ein.");
      return;
    }

    if (!formData.niveau) {
      setError("Bitte wählen Sie das Spielniveau aus.");
      return;
    }

    if (!formData.mitglied) {
      setError("Bitte geben Sie an, ob Sie Vereinsmitglied sind.");
      return;
    }

    const alterBerechnet = computeAge(formData.geburtsdatum);
    if (alterBerechnet === null || alterBerechnet < 0 || alterBerechnet > 100) {
      setError("Bitte geben Sie ein gültiges Geburtsdatum ein.");
      return;
    }

    if (isKindercamp && alterBerechnet >= 18) {
      setError("Das Kindercamp ist für Kinder und Jugendliche unter 18 Jahren – für Erwachsene gibt es das Erwachsenencamp.");
      return;
    }

    if (!isKindercamp && alterBerechnet < 18) {
      setError("Das Erwachsenencamp ist erst ab 18 Jahren – für Kinder und Jugendliche gibt es das Kindercamp.");
      return;
    }

    if (!formData.telefon.trim()) {
      setError("Bitte geben Sie eine Telefonnummer ein.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Bitte geben Sie eine E-Mail-Adresse ein.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }

    if (!formData.strasse.trim()) {
      setError("Bitte geben Sie Straße und Hausnummer des Kontoinhabers ein.");
      return;
    }
    if (!formData.plz.trim()) {
      setError("Bitte geben Sie die Postleitzahl ein.");
      return;
    }
    if (!formData.ort.trim()) {
      setError("Bitte geben Sie den Ort ein.");
      return;
    }

    const ibanCheck = checkIBAN(formData.iban);
    if (!ibanCheck.valid) {
      setError(
        ibanCheck.reason === "empty"
          ? "Bitte geben Sie eine IBAN ein."
          : `Bitte geben Sie eine gültige IBAN ein. ${ibanErrorMessage(ibanCheck)}`
      );
      return;
    }
    const ibanClean = normalizeIBAN(formData.iban);

    if (!formData.sepaZustimmung) {
      setError("Bitte stimmen Sie dem SEPA-Lastschriftmandat zu.");
      return;
    }

    if (!formData.verbindlicheAnmeldung) {
      setError("Bitte bestätigen Sie die verbindliche Anmeldung.");
      return;
    }

    setLoading(true);

    try {
      // Mandatsreferenz generieren: TC-YYYYMMDDHHMMSS-XXX
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const mandatsreferenz = `TC-${timestamp}-${randomSuffix}`;

      const { error: insertError } = await supabase
        .from("tenniscamp_anmeldungen")
        .insert({
          account_id: accountId,
          camp_id: formData.campId,
          camp_label: selectedCamp?.label,
          camp_dates: selectedCamp?.dates,
          camp_type: selectedCamp?.type,
          teilnehmer_vorname: formData.teilnehmerVorname.trim(),
          teilnehmer_nachname: formData.teilnehmerNachname.trim(),
          zahlungspflichtiger_vorname: isKindercamp ? formData.zahlungspflichtigerVorname.trim() : null,
          zahlungspflichtiger_nachname: isKindercamp ? formData.zahlungspflichtigerNachname.trim() : null,
          alter: alterBerechnet,
          telefon: formData.telefon.trim(),
          email: formData.email.trim(),
          strasse: formData.strasse.trim(),
          plz: formData.plz.trim(),
          ort: formData.ort.trim(),
          iban: ibanClean,
          bemerkungen: formData.bemerkungen.trim() || null,
          niveau: formData.niveau || null,
          spielstand_beschreibung: formData.mitglied === "nein" ? (formData.spielstandBeschreibung.trim() || null) : null,
          mitglied: formData.mitglied === "ja",
          mandatsreferenz: mandatsreferenz,
          sepa_zustimmung: formData.sepaZustimmung,
          status: isErwachsenencamp ? "warteliste" : "neu",
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError("Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
        return;
      }

      const teilnehmerName = `${formData.teilnehmerVorname} ${formData.teilnehmerNachname}`;
      const zahlungspflichtiger = isKindercamp
        ? `${formData.zahlungspflichtigerVorname} ${formData.zahlungspflichtigerNachname}`
        : teilnehmerName;

      // Erwachsenencamp ist ausgebucht -> Anmeldung läuft nur über die Warteliste
      const istWarteliste = isErwachsenencamp;
      const mailTitel = istWarteliste ? "Warteliste Tenniscamp" : "Anmeldung Tenniscamp";
      const mailGruss = istWarteliste ? "Du stehst auf der Warteliste!" : "Vielen Dank für Ihre Anmeldung!";
      const mailGrussText = istWarteliste
        ? "Du stehst jetzt auf der Warteliste für das Erwachsenencamp. Wird ein Platz frei, melden wir uns bei dir."
        : "Ihre Tenniscamp-Anmeldung wurde erfolgreich übermittelt.";
      const mailZahlungText = istWarteliste
        ? "Es entstehen vorerst keine Kosten. Die Campgebühr wird nur eingezogen, wenn ein Platz frei wird und Sie diesen erhalten – dann zwei Wochen vor Beginn per SEPA-Lastschrift."
        : "Die Campgebühr wird zwei Wochen vor Beginn des Camps per SEPA-Lastschrift eingezogen. Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich. Eine Absage ist ausschließlich schriftlich per E-Mail an tennisabisz@gmail.com möglich.";
      const mailZahlungHtml = istWarteliste
        ? "Es entstehen vorerst keine Kosten. Die Campgebühr wird nur eingezogen, wenn ein Platz frei wird und Sie diesen erhalten &ndash; dann zwei Wochen vor Beginn per SEPA-Lastschrift."
        : `Die Campgebühr wird zwei Wochen vor Beginn des Camps per SEPA-Lastschrift eingezogen.
                  Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich.
                  Eine Absage ist ausschließlich schriftlich per E-Mail an
                  <a href="mailto:tennisabisz@gmail.com" style="color: #525252; font-weight: 600;">tennisabisz@gmail.com</a>
                  möglich.`;

      // Bestätigungsmail an Anmelder
      const bestatigungHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #171717 0%, #404040 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${mailTitel}</h1>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <div style="width: 64px; height: 64px; background: #171717; border-radius: 50%; display: inline-block; line-height: 64px; text-align: center;">
                <span style="color: #ffffff; font-size: 32px;">&#10003;</span>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h2 style="margin: 0 0 8px; color: #333333; font-size: 22px; font-weight: 600;">${mailGruss}</h2>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">${mailGrussText}</p>
            </td>
          </tr>

          <!-- Camp Details -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px; color: #171717; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Camp-Details</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #666666; font-size: 13px;">Camp:</span><br>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${selectedCamp?.label}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #666666; font-size: 13px;">Zeitraum:</span><br>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${selectedCamp?.dates}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #666666; font-size: 13px;">Teilnehmer:</span><br>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${teilnehmerName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #666666; font-size: 13px;">Alter:</span><br>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${alterBerechnet} Jahre</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment Info -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background-color: #f5f5f5; border-radius: 8px; border: 1px solid #e5e5e5; padding: 16px;">
                <p style="margin: 0 0 8px; color: #525252; font-size: 14px; font-weight: 600;">Zahlungsinformation</p>
                <p style="margin: 0; color: #525252; font-size: 13px; line-height: 1.5;">
                  ${mailZahlungHtml}
                </p>
              </div>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: #666666; font-size: 14px;">Bei Fragen erreichen Sie uns unter:</p>
              <a href="mailto:tennisabisz@gmail.com" style="color: #171717; font-weight: 600; text-decoration: none;">tennisabisz@gmail.com</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px; color: #333333; font-size: 14px; font-weight: 600;">Sportliche Grüße</p>
              <p style="margin: 0; color: #171717; font-size: 15px; font-weight: 700;">Tennisschule A bis Z</p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: #999999; font-size: 12px; text-align: center;">
          &copy; ${new Date().getFullYear()} Tennisschule A bis Z. Alle Rechte vorbehalten.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const bestatigungText = `${mailTitel}

${mailGruss}

Camp: ${selectedCamp?.label}
Zeitraum: ${selectedCamp?.dates}
Teilnehmer: ${teilnehmerName}
Alter: ${alterBerechnet} Jahre

${mailZahlungText}

Bei Fragen erreichen Sie uns unter: tennisabisz@gmail.com

Sportliche Grüße,
Tennisschule A bis Z`;

      // Admin-Benachrichtigung
      const adminHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: #171717; padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${istWarteliste ? "Neue Warteliste-Anmeldung (Erwachsenencamp)" : "&#127934; Neue Tenniscamp-Anmeldung"}</h1>
            </td>
          </tr>

          <!-- Camp Info -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <div style="background-color: #f5f5f5; border-radius: 8px; border: 1px solid #e5e5e5; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; color: #525252; font-size: 14px; font-weight: 600;">${selectedCamp?.label}</p>
                <p style="margin: 0; color: #525252; font-size: 16px; font-weight: 700;">${selectedCamp?.dates}</p>
              </div>

              <p style="margin: 0 0 16px; color: #171717; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Teilnehmer</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Name:</span>
                          <span style="color: #333333; font-size: 15px; font-weight: 600; margin-left: 8px;">${teilnehmerName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Alter:</span>
                          <span style="color: #333333; font-size: 15px; font-weight: 600; margin-left: 8px;">${alterBerechnet} Jahre</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Mitglied BSC Rehberge:</span>
                          <span style="color: ${formData.mitglied === "ja" ? "#171717" : "#dc2626"}; font-size: 15px; font-weight: 700; margin-left: 8px;">${formData.mitglied === "ja" ? "Ja" : "Nein"}</span>
                        </td>
                      </tr>
                      ${formData.niveau ? `
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Spielniveau:</span>
                          <span style="color: #333333; font-size: 15px; font-weight: 600; margin-left: 8px;">${formData.niveau}</span>
                        </td>
                      </tr>
                      ` : ''}
                      ${formData.spielstandBeschreibung.trim() ? `
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Spielstand-Beschreibung:</span>
                          <span style="color: #333333; font-size: 14px; line-height: 1.5; margin-left: 8px;">${formData.spielstandBeschreibung.trim()}</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${isKindercamp ? `
              <p style="margin: 0 0 16px; color: #171717; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Zahlungspflichtiger</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #333333; font-size: 15px; font-weight: 600;">${zahlungspflichtiger}</span>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 0 0 16px; color: #171717; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Kontaktdaten</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">E-Mail:</span>
                          <a href="mailto:${formData.email}" style="color: #171717; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${formData.email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Telefon:</span>
                          <a href="tel:${formData.telefon}" style="color: #171717; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${formData.telefon}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #171717; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">SEPA-Lastschrift</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #666666; font-size: 13px;">IBAN:</span>
                    <span style="color: #333333; font-size: 15px; font-weight: 600; margin-left: 8px; font-family: monospace;">${formData.iban}</span>
                  </td>
                </tr>
              </table>

              ${formData.bemerkungen.trim() ? `
              <p style="margin: 24px 0 16px; color: #171717; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Bemerkungen</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; border-radius: 8px; border: 1px solid #e5e5e5;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #525252; font-size: 14px; line-height: 1.5;">${formData.bemerkungen.trim()}</span>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 13px;">Anmeldung vom ${new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const adminText = `${istWarteliste ? "Neue Warteliste-Anmeldung (Erwachsenencamp)" : "Neue Tenniscamp-Anmeldung"}

Camp: ${selectedCamp?.label}
Zeitraum: ${selectedCamp?.dates}
Preis: ${selectedCamp?.price} €

Teilnehmer: ${teilnehmerName}
Alter: ${alterBerechnet} Jahre
Mitglied: ${formData.mitglied === "ja" ? "Ja" : "Nein"}
${isKindercamp ? `Zahlungspflichtiger: ${zahlungspflichtiger}\n` : ''}${formData.niveau ? `Spielniveau: ${formData.niveau}\n` : ''}${formData.spielstandBeschreibung.trim() ? `Spielstand-Beschreibung: ${formData.spielstandBeschreibung.trim()}\n` : ''}
E-Mail: ${formData.email}
Telefon: ${formData.telefon}

IBAN: ${formData.iban}${formData.bemerkungen.trim() ? `\n\nBemerkungen: ${formData.bemerkungen.trim()}` : ''}`;

      // E-Mails senden
      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [formData.email.trim()],
            subject: istWarteliste
              ? `Warteliste Tenniscamp - ${selectedCamp?.label}`
              : `Anmeldebestätigung Tenniscamp - ${selectedCamp?.label}`,
            body: bestatigungText,
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
            subject: istWarteliste
              ? `Warteliste-Anmeldung: ${teilnehmerName} - ${selectedCamp?.label}`
              : `Neue Tenniscamp-Anmeldung: ${teilnehmerName} - ${selectedCamp?.label}`,
            body: adminText,
            html: adminHtml,
            fromName: "Tennisschule A bis Z",
          }),
        });
      } catch (emailErr) {
        console.error("Admin-Benachrichtigung-Fehler:", emailErr);
      }

      setSuccess(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="tc-page">
        <div className="tc-success">
          <div className="tc-success-head">
            <div className="tc-success-check">&#10003;</div>
            <h1>{isErwachsenencamp ? "Du stehst auf der Warteliste!" : "Anmeldung erfolgreich!"}</h1>
          </div>
          <div className="tc-success-body">
            <p style={{ margin: "0 0 22px", fontSize: 15, color: "#52525b", lineHeight: 1.65, textAlign: "center" }}>
              {isErwachsenencamp
                ? "Danke! Du stehst jetzt auf der Warteliste für das Erwachsenencamp. Wird ein Platz frei, melden wir uns bei dir. Eine Bestätigung der Warteliste-Anmeldung erhältst du in Kürze per E-Mail."
                : "Vielen Dank für deine Anmeldung zum Tenniscamp. Du erhältst in Kürze eine Bestätigungs-E-Mail."}
            </p>
            <div className="tc-note">
              <span className="tc-note-title">Hinweis zur Zahlung</span>
              {isErwachsenencamp
                ? "Es entstehen dir vorerst keine Kosten. Die Campgebühr wird nur eingezogen, wenn du einen Platz erhältst – dann zwei Wochen vor Beginn per SEPA-Lastschrift."
                : "Die Campgebühr wird zwei Wochen vor Beginn per SEPA-Lastschrift eingezogen. Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich – ausschließlich schriftlich per E-Mail an "}
              {!isErwachsenencamp && (
                <a href="mailto:tennisabisz@gmail.com" style={{ color: "#16a34a", fontWeight: 600 }}>tennisabisz@gmail.com</a>
              )}
              {!isErwachsenencamp && "."}
            </div>

            {isKindercamp && (
              <div className="tc-note" style={{ marginTop: 14 }}>
                <span className="tc-note-title">Notfallbogen</span>
                Bitte ausgefüllt und unterschrieben am ersten Camp-Tag mitbringen.
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="tc-btn-secondary"
                    onClick={handleNotfallbogenDownload}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? "Wird erstellt..." : "Notfallbogen als PDF"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tc-page">
      <div className="tc-shell">
        <aside className="tc-panel">
          <div className="tc-panel-inner">
            <div>
              <div className="tc-wordmark">Tennisschule A bis Z</div>
              <h1 className="tc-panel-title">Tenniscamps 2026</h1>
              <p className="tc-panel-sub">
                In den Sommerferien am BSC Rehberge – für Kinder und Erwachsene, eingeteilt nach Spielstärke.
              </p>
            </div>

            <div className="tc-summary">
              <div className="tc-summary-label">Deine Auswahl</div>
              {selectedCamp ? (
                <>
                  <div className="tc-summary-camp">{selectedCamp.label}</div>
                  <div className="tc-summary-dates">{selectedCamp.dates}</div>
                  <div className="tc-summary-price">{selectedCamp.price} €</div>
                </>
              ) : (
                <div className="tc-summary-empty">Wähle dein Camp aus – der Preis erscheint dann hier.</div>
              )}
            </div>

            <ul className="tc-perks">
              <li>Einteilung nach Spielstärke</li>
              <li>BSC Rehberge · Berlin-Wedding</li>
            </ul>

            <div className="tc-panel-foot">
              Fragen? <a href="mailto:tennisabisz@gmail.com">tennisabisz@gmail.com</a>
            </div>
          </div>
        </aside>

        <div className="tc-form">
          <div className="tc-form-head">
            <h2>Anmeldung Tenniscamp</h2>
            <p>Wenige Minuten – du erhältst sofort eine Bestätigung per E-Mail.</p>
          </div>

          <a className="tc-infolink" href="/tenniscamp-info" target="_blank" rel="noopener noreferrer">
            ℹ Alle Infos zu den Camps
          </a>

          {error && <div className="tc-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* 1 – Camp */}
            <div className="tc-section">
              <div className="tc-section-title"><span>1</span> Camp wählen</div>
              <div className="tc-choices">
                {CAMP_OPTIONS.map((camp) => {
                  const sel = formData.campId === camp.id;
                  const closed = !!camp.closed;
                  return (
                    <label
                      key={camp.id}
                      className={`tc-choice${sel ? " is-selected" : ""}${closed ? " is-closed" : ""}`}
                      style={closed ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
                    >
                      <input type="radio" name="campId" value={camp.id} checked={sel} disabled={closed} onChange={handleChange} />
                      <span className="tc-radio" />
                      <span className="tc-choice-body">
                        <span className="tc-choice-title">
                          {camp.label}
                          {closed && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.03em",
                                color: "#b91c1c",
                                background: "#fee2e2",
                                borderRadius: 4,
                                padding: "2px 6px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Anmeldung geschlossen
                            </span>
                          )}
                        </span>
                        <span className="tc-choice-meta">{camp.dates}</span>
                      </span>
                      <span className="tc-choice-price">{camp.price} €</span>
                    </label>
                  );
                })}
              </div>

              {selectedCamp && isKindercamp && (
                <div className="tc-note tc-note-warn" style={{ marginTop: 12 }}>
                  <span className="tc-note-title">Absage bei zu wenigen Teilnehmern</span>
                  Bei nicht ausreichender Teilnehmerzahl kann das Camp vom Trainerteam abgesagt werden.
                  In diesem Fall bieten wir die Teilnahme in einer anderen Woche an oder erstatten die
                  bereits gezahlte Campgebühr vollständig zurück.
                </div>
              )}

              {selectedCamp && !isKindercamp && (
                <div className="tc-note" style={{ marginTop: 12 }}>
                  <span className="tc-note-title">Erwachsenencamp ausgebucht – nur noch Warteliste</span>
                  Die Plätze im Erwachsenencamp sind bereits vergeben. Du kannst dich hier auf die Warteliste setzen:
                  Wird ein Platz frei, melden wir uns bei dir in der Reihenfolge der Anmeldungen. Mitglieder des
                  BSC Rehberge haben dabei Vorrang. Die Campgebühr wird erst eingezogen, wenn du einen Platz erhältst –
                  bis dahin entstehen dir keine Kosten.
                </div>
              )}

              {selectedCamp && isKindercamp && (
                <div className="tc-note" style={{ marginTop: 12 }}>
                  <span className="tc-note-title">Notfallbogen</span>
                  Bitte herunterladen, ausfüllen und unterschrieben am ersten Camp-Tag mitbringen.
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="tc-btn-secondary"
                      onClick={handleNotfallbogenDownload}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? "Wird erstellt..." : "Notfallbogen als PDF"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2 – Teilnehmer */}
            <div className="tc-section">
              <div className="tc-section-title"><span>2</span> Teilnehmer</div>

              <div className="tc-grid-2">
                <div className="tc-field">
                  <label className="tc-label">Vorname <span className="tc-req">*</span></label>
                  <input className="tc-input" type="text" name="teilnehmerVorname" value={formData.teilnehmerVorname} onChange={handleChange} placeholder="Vorname" />
                </div>
                <div className="tc-field">
                  <label className="tc-label">Nachname <span className="tc-req">*</span></label>
                  <input className="tc-input" type="text" name="teilnehmerNachname" value={formData.teilnehmerNachname} onChange={handleChange} placeholder="Nachname" />
                </div>
              </div>

              {isKindercamp && (
                <div className="tc-grid-2">
                  <div className="tc-field">
                    <label className="tc-label">Vorname Zahlungspflichtige/r <span className="tc-req">*</span></label>
                    <input className="tc-input" type="text" name="zahlungspflichtigerVorname" value={formData.zahlungspflichtigerVorname} onChange={handleChange} placeholder="Erziehungsberechtigte/r" />
                  </div>
                  <div className="tc-field">
                    <label className="tc-label">Nachname Zahlungspflichtige/r <span className="tc-req">*</span></label>
                    <input className="tc-input" type="text" name="zahlungspflichtigerNachname" value={formData.zahlungspflichtigerNachname} onChange={handleChange} placeholder="Nachname" />
                  </div>
                </div>
              )}

              {selectedCamp && (
                <div className="tc-field">
                  <label className="tc-label">Spielniveau{isKindercamp ? " des Kindes" : ""} <span className="tc-req">*</span></label>
                  <div className="tc-choices tc-inline">
                    {["Anfänger", "Fortgeschritten", "Turnierspieler"].map((niveau) => {
                      const sel = formData.niveau === niveau;
                      return (
                        <label key={niveau} className={`tc-choice tc-choice-sm${sel ? " is-selected" : ""}`}>
                          <input type="radio" name="niveau" value={niveau} checked={sel} onChange={handleChange} />
                          <span className="tc-radio" />
                          <span className="tc-choice-title">{niveau}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="tc-field">
                <label className="tc-label">Mitglied im BSC Rehberge? <span className="tc-req">*</span></label>
                <div className="tc-choices tc-inline">
                  {[{ value: "ja", label: "Ja" }, { value: "nein", label: "Nein" }].map((opt) => {
                    const sel = formData.mitglied === opt.value;
                    return (
                      <label key={opt.value} className={`tc-choice tc-choice-sm${sel ? " is-selected" : ""}`}>
                        <input type="radio" name="mitglied" value={opt.value} checked={sel} onChange={handleChange} />
                        <span className="tc-radio" />
                        <span className="tc-choice-title">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {selectedCamp && formData.mitglied === "nein" && (
                <div className="tc-field">
                  <label className="tc-label">Beschreibung des Spielstands</label>
                  <p className="tc-hint">
                    {isKindercamp
                      ? "Da Ihr Kind kein Vereinsmitglied ist, hilft uns eine kurze Beschreibung bei der Gruppeneinteilung. Hat Ihr Kind schon einmal Tennis gespielt? An einem Camp teilgenommen? Wie oft wird gespielt?"
                      : "Da Sie kein Vereinsmitglied sind, hilft uns eine kurze Beschreibung bei der Gruppeneinteilung. Haben Sie schon einmal Tennis gespielt? An einem Camp teilgenommen? Wie oft spielen Sie?"}
                  </p>
                  <textarea
                    className="tc-textarea"
                    name="spielstandBeschreibung"
                    value={formData.spielstandBeschreibung}
                    onChange={handleChange}
                    rows={3}
                    placeholder={isKindercamp
                      ? "z.B. noch nie gespielt / 1 Jahr Tennis im Verein / war letztes Jahr beim Camp dabei..."
                      : "z.B. noch nie gespielt / spiele seit 2 Jahren / war letztes Jahr beim Camp dabei..."}
                  />
                </div>
              )}

              <div className="tc-grid-2">
                <div className="tc-field">
                  <label className="tc-label">Geburtsdatum <span className="tc-req">*</span></label>
                  <input className="tc-input" type="date" name="geburtsdatum" value={formData.geburtsdatum} onChange={handleChange} max={new Date().toISOString().slice(0, 10)} />
                  {(() => {
                    const a = computeAge(formData.geburtsdatum);
                    if (a === null || a < 0 || a > 120) return null;
                    const mismatch = !!selectedCamp && ((isKindercamp && a >= 18) || (!isKindercamp && a < 18));
                    return (
                      <p className="tc-hint" style={{ margin: "7px 0 0", color: mismatch ? "#b91c1c" : undefined }}>
                        Alter: {a} {a === 1 ? "Jahr" : "Jahre"}
                        {mismatch && (isKindercamp
                          ? " – das Kindercamp ist für unter 18-Jährige"
                          : " – das Erwachsenencamp ist ab 18 Jahren")}
                      </p>
                    );
                  })()}
                </div>
                <div className="tc-field">
                  <label className="tc-label">Telefon <span className="tc-req">*</span></label>
                  <input className="tc-input" type="tel" name="telefon" value={formData.telefon} onChange={handleChange} placeholder="Telefonnummer" />
                </div>
              </div>
            </div>

            {/* 3 – Kontakt & Zahlung */}
            <div className="tc-section">
              <div className="tc-section-title"><span>3</span> Kontakt &amp; Zahlung</div>

              <div className="tc-field">
                <label className="tc-label">E-Mail <span className="tc-req">*</span></label>
                <input className="tc-input" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ihre@email.de" />
              </div>

              <div className="tc-field">
                <label className="tc-label">Straße und Hausnummer <span className="tc-req">*</span></label>
                <p className="tc-hint" style={{ margin: "0 0 7px" }}>
                  Anschrift des Kontoinhabers{isKindercamp ? " (Zahlungspflichtige/r)" : ""} – für das SEPA-Lastschriftmandat.
                </p>
                <input className="tc-input" type="text" name="strasse" value={formData.strasse} onChange={handleChange} placeholder="z.B. Musterstraße 12" autoComplete="street-address" />
              </div>

              <div className="tc-grid-2">
                <div className="tc-field">
                  <label className="tc-label">PLZ <span className="tc-req">*</span></label>
                  <input className="tc-input" type="text" name="plz" value={formData.plz} onChange={handleChange} placeholder="z.B. 13351" inputMode="numeric" autoComplete="postal-code" />
                </div>
                <div className="tc-field">
                  <label className="tc-label">Ort <span className="tc-req">*</span></label>
                  <input className="tc-input" type="text" name="ort" value={formData.ort} onChange={handleChange} placeholder="z.B. Berlin" autoComplete="address-level2" />
                </div>
              </div>

              <div className="tc-field">
                <label className="tc-label">IBAN <span className="tc-req">*</span></label>
                <input className="tc-input" type="text" name="iban" value={formData.iban} onChange={handleIBANChange} placeholder="DE89 3704 0044 0532 0130 00" style={{ fontFamily: "monospace", letterSpacing: 1 }} />
                {(() => {
                  const check = checkIBAN(formData.iban);
                  if (check.reason === "empty") return null;
                  if (check.valid) {
                    return (
                      <p className="tc-hint" style={{ margin: "7px 0 0", color: "var(--tc-green)" }}>
                        ✓ IBAN gültig
                      </p>
                    );
                  }
                  return (
                    <p className="tc-hint" style={{ margin: "7px 0 0", color: check.reason === "incomplete" ? undefined : "#b91c1c" }}>
                      {ibanErrorMessage(check)}
                    </p>
                  );
                })()}
              </div>

              <div className="tc-field">
                <label className="tc-label">
                  Bemerkungen {isKindercamp && <span className="tc-req" style={{ fontWeight: 600 }}>– Essenswünsche / Allergien</span>}
                </label>
                <textarea
                  className="tc-textarea"
                  name="bemerkungen"
                  value={formData.bemerkungen}
                  onChange={handleChange}
                  rows={3}
                  placeholder={isKindercamp
                    ? "z.B. Allergien, Unverträglichkeiten, vegetarisch, vegan..."
                    : "z.B. Spielstärke, besondere Hinweise..."}
                />
              </div>

              <label className="tc-consent" style={{ marginBottom: 12 }}>
                <input type="checkbox" name="sepaZustimmung" checked={formData.sepaZustimmung} onChange={handleChange} />
                <span>
                  <span className="tc-consent-title">SEPA-Lastschriftmandat <span className="tc-req">*</span></span>
                  <p>
                    Ich ermächtige die Tennisschule A bis Z, Zahlungen von meinem Konto mittels Lastschrift einzuziehen.
                    Zugleich weise ich mein Kreditinstitut an, die von der Tennisschule A bis Z auf mein Konto gezogenen
                    Lastschriften einzulösen.
                  </p>
                </span>
              </label>

              <label className="tc-consent">
                <input type="checkbox" name="verbindlicheAnmeldung" checked={formData.verbindlicheAnmeldung} onChange={handleChange} />
                <span>
                  {isErwachsenencamp ? (
                    <>
                      <span className="tc-consent-title">Anmeldung zur Warteliste <span className="tc-req">*</span></span>
                      <p>
                        Ich setze mich auf die Warteliste für das Erwachsenencamp. Sollte ein Platz frei werden, melden
                        wir uns bei mir. Erst wenn ich einen Platz verbindlich erhalte, wird die Campgebühr zwei Wochen
                        vor Beginn fällig – bis dahin entstehen mir keine Kosten.
                      </p>
                    </>
                  ) : (
                    <>
                      <span className="tc-consent-title">Verbindliche Anmeldung <span className="tc-req">*</span></span>
                      <p>
                        Hiermit melde ich mich/mein Kind verbindlich zum Tenniscamp an. Die Campgebühr wird zwei Wochen vor
                        Beginn des Camps fällig. Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich –
                        ausschließlich schriftlich per E-Mail an{" "}
                        <a href="mailto:tennisabisz@gmail.com">tennisabisz@gmail.com</a>.
                      </p>
                    </>
                  )}
                </span>
              </label>
            </div>

            <button type="submit" className="tc-btn" disabled={loading}>
              {loading
                ? "Wird gesendet..."
                : isErwachsenencamp
                ? "Auf die Warteliste setzen"
                : selectedCamp
                ? `Verbindlich anmelden · ${selectedCamp.price} €`
                : "Verbindlich anmelden"}
            </button>
          </form>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
