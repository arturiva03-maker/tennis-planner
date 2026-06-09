import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";

type CampOption = {
  id: string;
  label: string;
  dates: string;
  type: "kind" | "erwachsene";
  price: number;
};

const CAMP_OPTIONS: CampOption[] = [
  { id: "woche1-kind", label: "Kindercamp - 1. Ferienwoche", dates: "13.07. - 17.07.2026", type: "kind", price: 270 },
  { id: "woche1-erwachsene", label: "Erwachsenencamp - 1. Ferienwoche", dates: "13.07. - 17.07.2026", type: "erwachsene", price: 140 },
  { id: "woche6-kind", label: "Kindercamp - Letzte Ferienwoche", dates: "17.08. - 21.08.2026", type: "kind", price: 270 },
  { id: "woche6-erwachsene", label: "Erwachsenencamp - Letzte Ferienwoche", dates: "17.08. - 21.08.2026", type: "erwachsene", price: 140 },
];

type TenniscampData = {
  campId: string;
  teilnehmerVorname: string;
  teilnehmerNachname: string;
  zahlungspflichtigerVorname: string;
  zahlungspflichtigerNachname: string;
  alter: string;
  telefon: string;
  email: string;
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

export default function TenniscampForm() {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a") || DEFAULT_ACCOUNT_ID;

  const [formData, setFormData] = useState<TenniscampData>({
    campId: "",
    teilnehmerVorname: "",
    teilnehmerNachname: "",
    zahlungspflichtigerVorname: "",
    zahlungspflichtigerNachname: "",
    alter: "",
    telefon: "",
    email: "",
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

    if (!formData.alter || parseInt(formData.alter) < 1) {
      setError("Bitte geben Sie ein gültiges Alter ein.");
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

    const ibanClean = formData.iban.replace(/\s/g, "");
    if (!ibanClean || ibanClean.length < 15) {
      setError("Bitte geben Sie eine gültige IBAN ein.");
      return;
    }

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
          alter: parseInt(formData.alter),
          telefon: formData.telefon.trim(),
          email: formData.email.trim(),
          iban: ibanClean,
          bemerkungen: formData.bemerkungen.trim() || null,
          niveau: formData.niveau || null,
          spielstand_beschreibung: formData.mitglied === "nein" ? (formData.spielstandBeschreibung.trim() || null) : null,
          mitglied: formData.mitglied === "ja",
          mandatsreferenz: mandatsreferenz,
          sepa_zustimmung: formData.sepaZustimmung,
          status: "neu",
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
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Anmeldung Tenniscamp</h1>
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
              <h2 style="margin: 0 0 8px; color: #333333; font-size: 22px; font-weight: 600;">Vielen Dank für Ihre Anmeldung!</h2>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">Ihre Tenniscamp-Anmeldung wurde erfolgreich übermittelt.</p>
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
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${formData.alter} Jahre</span>
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
                  Die Campgebühr wird zwei Wochen vor Beginn des Camps per SEPA-Lastschrift eingezogen.
                  Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich.
                  Eine Absage ist ausschließlich schriftlich per E-Mail an
                  <a href="mailto:tennisabisz@gmail.com" style="color: #525252; font-weight: 600;">tennisabisz@gmail.com</a>
                  möglich.
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
          &copy; 2026 Tennisschule A bis Z. Alle Rechte vorbehalten.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const bestatigungText = `Anmeldung Tenniscamp

Vielen Dank für Ihre Anmeldung!

Camp: ${selectedCamp?.label}
Zeitraum: ${selectedCamp?.dates}
Teilnehmer: ${teilnehmerName}
Alter: ${formData.alter} Jahre

Die Campgebühr wird zwei Wochen vor Beginn des Camps per SEPA-Lastschrift eingezogen.
Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich.
Eine Absage ist ausschließlich schriftlich per E-Mail an tennisabisz@gmail.com möglich.

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
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">&#127934; Neue Tenniscamp-Anmeldung</h1>
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
                          <span style="color: #333333; font-size: 15px; font-weight: 600; margin-left: 8px;">${formData.alter} Jahre</span>
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

      const adminText = `Neue Tenniscamp-Anmeldung

Camp: ${selectedCamp?.label}
Zeitraum: ${selectedCamp?.dates}
Preis: ${selectedCamp?.price} €

Teilnehmer: ${teilnehmerName}
Alter: ${formData.alter} Jahre
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
            subject: `Anmeldebestätigung Tenniscamp - ${selectedCamp?.label}`,
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
            subject: `Neue Tenniscamp-Anmeldung: ${teilnehmerName} - ${selectedCamp?.label}`,
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
      <div className="registrationPage">
        <div className="card registrationCard">
          <div className="successIcon">&#10003;</div>
          <h1>Anmeldung erfolgreich!</h1>
          <p className="muted">
            Vielen Dank für Ihre Anmeldung zum Tenniscamp. Sie erhalten in Kürze eine Bestätigungs-E-Mail.
          </p>
          <div style={{
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 16,
            marginTop: 24,
          }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              <strong>Hinweis:</strong> Die Campgebühr wird zwei Wochen vor Beginn per SEPA-Lastschrift eingezogen.
              Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich. Eine Absage ist ausschließlich
              schriftlich per E-Mail an <a href="mailto:tennisabisz@gmail.com" style={{ color: "var(--primary)" }}>tennisabisz@gmail.com</a> möglich.
            </p>
          </div>

          {isKindercamp && (
            <div style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 16,
              marginTop: 16,
            }}>
              <p style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-primary)", fontWeight: 600, lineHeight: 1.5 }}>
                Notfallbogen für das Camp – bitte ausgefüllt und unterschrieben am ersten Tag mitbringen.
              </p>
              <button
                type="button"
                className="btn"
                onClick={handleNotfallbogenDownload}
                disabled={pdfLoading}
                style={{ width: "auto" }}
              >
                {pdfLoading ? "Wird erstellt..." : "Notfallbogen als PDF herunterladen"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="registrationPage">
      <div className="card registrationCard">
        <h1>Tenniscamp 2026</h1>
        <p className="muted" style={{ marginBottom: 8 }}>
          <strong>Tennisschule A bis Z</strong> am BSC Rehberge
        </p>
        <p className="muted" style={{ marginBottom: 16 }}>
          Anmeldung für Kinder- und Erwachsenencamps in den Sommerferien.
        </p>

        <div style={{
          background: "var(--bg-inset)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}>
          <a
            href="/tenniscamp-info"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--primary)",
              fontWeight: 600,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>&#9432;</span>
            Informationen zu unseren Tenniscamps
          </a>
        </div>

        {error && <div className="errorBox">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="registrationFields">
            {/* Camp Auswahl */}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                Tenniscamp auswählen <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CAMP_OPTIONS.map((camp) => (
                  <label
                    key={camp.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      border: `2px solid ${formData.campId === camp.id ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      background: formData.campId === camp.id ? "var(--bg-inset)" : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="radio"
                      name="campId"
                      value={camp.id}
                      checked={formData.campId === camp.id}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{camp.label}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{camp.dates}</div>
                    </div>
                    <div style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: formData.campId === camp.id ? "var(--primary)" : "var(--text-muted)",
                      whiteSpace: "nowrap"
                    }}>
                      {camp.price} €
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Hinweis nur bei Erwachsenencamp */}
            {selectedCamp && !isKindercamp && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <div style={{
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 16,
                }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                    Hinweis zur Platzvergabe (Erwachsenencamp)
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Aufgrund begrenzter Plätze nehmen wir primär Mitglieder des BSC Rehberge auf.
                    Vereinsexterne werden nur berücksichtigt, wenn Plätze frei bleiben, oder über die Warteliste.
                    Bei den Kindercamps nehmen wir hingegen alle Anmeldungen an.
                  </p>
                </div>
              </div>
            )}

            {/* Notfallbogen-Download nur bei Kindercamp */}
            {selectedCamp && isKindercamp && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <div style={{
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 16,
                }}>
                  <p style={{ margin: "0 0 6px 0", fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                    Notfallbogen – am ersten Camp-Tag mitbringen
                  </p>
                  <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    Bitte laden Sie den Notfallbogen herunter, füllen ihn aus und bringen ihn
                    <strong> unterschrieben am ersten Tag des Camps</strong> mit.
                  </p>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleNotfallbogenDownload}
                    disabled={pdfLoading}
                    style={{ width: "auto" }}
                  >
                    {pdfLoading ? "Wird erstellt..." : "Notfallbogen als PDF herunterladen"}
                  </button>
                </div>
              </div>
            )}

            {/* Teilnehmer */}
            <div className="field">
              <label>
                Vorname Teilnehmer <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="teilnehmerVorname"
                value={formData.teilnehmerVorname}
                onChange={handleChange}
                placeholder="Vorname"
              />
            </div>

            <div className="field">
              <label>
                Nachname Teilnehmer <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="teilnehmerNachname"
                value={formData.teilnehmerNachname}
                onChange={handleChange}
                placeholder="Nachname"
              />
            </div>

            {/* Zahlungspflichtiger - nur bei Kindercamp */}
            {isKindercamp && (
              <>
                <div className="field">
                  <label>
                    Vorname Zahlungspflichtiger <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="zahlungspflichtigerVorname"
                    value={formData.zahlungspflichtigerVorname}
                    onChange={handleChange}
                    placeholder="Vorname Erziehungsberechtigter"
                  />
                </div>

                <div className="field">
                  <label>
                    Nachname Zahlungspflichtiger <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="zahlungspflichtigerNachname"
                    value={formData.zahlungspflichtigerNachname}
                    onChange={handleChange}
                    placeholder="Nachname Erziehungsberechtigter"
                  />
                </div>
              </>
            )}

            {/* Spielniveau - für Kinder und Erwachsene */}
            {selectedCamp && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>
                  Spielniveau {isKindercamp ? "des Kindes" : ""} <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {["Anfänger", "Fortgeschritten", "Turnierspieler"].map((niveau) => (
                    <label
                      key={niveau}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 16px",
                        border: `2px solid ${formData.niveau === niveau ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 8,
                        cursor: "pointer",
                        background: formData.niveau === niveau ? "var(--bg-inset)" : "transparent",
                        transition: "all 0.15s",
                        fontWeight: 500,
                      }}
                    >
                      <input
                        type="radio"
                        name="niveau"
                        value={niveau}
                        checked={formData.niveau === niveau}
                        onChange={handleChange}
                        style={{ width: "auto" }}
                      />
                      {niveau}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Mitglied im Verein */}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                Mitglied im BSC Rehberge? <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { value: "ja", label: "Ja" },
                  { value: "nein", label: "Nein" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 16px",
                      border: `2px solid ${formData.mitglied === opt.value ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: 8,
                      cursor: "pointer",
                      background: formData.mitglied === opt.value ? "var(--bg-inset)" : "transparent",
                      transition: "all 0.15s",
                      fontWeight: 500,
                    }}
                  >
                    <input
                      type="radio"
                      name="mitglied"
                      value={opt.value}
                      checked={formData.mitglied === opt.value}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Spielstand-Beschreibung - für Nicht-Vereinsmitglieder (Kinder & Erwachsene) */}
            {selectedCamp && formData.mitglied === "nein" && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <div style={{
                  background: "var(--bg-inset)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 16,
                }}>
                  <label style={{ fontWeight: 600 }}>
                    Beschreibung des Spielstands
                  </label>
                  <p style={{ margin: "6px 0 10px 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {isKindercamp
                      ? "Da Ihr Kind kein Vereinsmitglied ist, hilft uns eine kurze Beschreibung bei der Gruppeneinteilung. Hat Ihr Kind schon einmal Tennis gespielt? An einem Camp teilgenommen? Wie oft wird gespielt?"
                      : "Da Sie kein Vereinsmitglied sind, hilft uns eine kurze Beschreibung bei der Gruppeneinteilung. Haben Sie schon einmal Tennis gespielt? An einem Camp teilgenommen? Wie oft spielen Sie?"}
                  </p>
                  <textarea
                    name="spielstandBeschreibung"
                    value={formData.spielstandBeschreibung}
                    onChange={handleChange}
                    rows={3}
                    placeholder={isKindercamp
                      ? "z.B. noch nie gespielt / 1 Jahr Tennis im Verein / war letztes Jahr beim Camp dabei..."
                      : "z.B. noch nie gespielt / spiele seit 2 Jahren / war letztes Jahr beim Camp dabei..."}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      fontSize: 14,
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label>
                Alter <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="number"
                name="alter"
                value={formData.alter}
                onChange={handleChange}
                placeholder="Alter in Jahren"
                min="1"
                max="99"
              />
            </div>

            <div className="field">
              <label>
                Telefon <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="tel"
                name="telefon"
                value={formData.telefon}
                onChange={handleChange}
                placeholder="Ihre Telefonnummer"
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                E-Mail <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ihre@email.de"
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                IBAN <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="iban"
                value={formData.iban}
                onChange={handleIBANChange}
                placeholder="DE89 3704 0044 0532 0130 00"
                style={{ fontFamily: "monospace", letterSpacing: 1 }}
              />
            </div>

            {/* Bemerkungen */}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                Bemerkungen {isKindercamp && <span style={{ color: "var(--danger)", fontWeight: 600 }}>– Besondere Essenswünsche</span>}
              </label>
              <textarea
                name="bemerkungen"
                value={formData.bemerkungen}
                onChange={handleChange}
                placeholder={isKindercamp
                  ? "z.B. Allergien, Unverträglichkeiten, vegetarisch, vegan..."
                  : "z.B. Spielstärke, besondere Hinweise..."}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  fontSize: 14,
                  resize: "vertical",
                  fontFamily: "inherit"
                }}
              />
            </div>

            {/* SEPA Zustimmung */}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <div style={{
                background: "var(--bg-inset)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 16,
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="sepaZustimmung"
                    checked={formData.sepaZustimmung}
                    onChange={handleChange}
                    style={{ width: "auto", marginTop: 4 }}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>
                      SEPA-Lastschriftmandat <span style={{ color: "var(--danger)" }}>*</span>
                    </span>
                    <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      Ich ermächtige die Tennisschule A bis Z, Zahlungen von meinem Konto mittels Lastschrift einzuziehen.
                      Zugleich weise ich mein Kreditinstitut an, die von der Tennisschule A bis Z auf mein Konto gezogenen
                      Lastschriften einzulösen.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Verbindliche Anmeldung */}
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <div style={{
                background: "var(--bg-inset)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 16,
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="verbindlicheAnmeldung"
                    checked={formData.verbindlicheAnmeldung}
                    onChange={handleChange}
                    style={{ width: "auto", marginTop: 4 }}
                  />
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      Verbindliche Anmeldung <span style={{ color: "var(--danger)" }}>*</span>
                    </span>
                    <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      Hiermit melde ich mich/mein Kind verbindlich zum Tenniscamp an. Die Campgebühr wird zwei Wochen vor
                      Beginn des Camps fällig. Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich.
                      Eine Absage ist ausschließlich schriftlich per E-Mail an{" "}
                      <a href="mailto:tennisabisz@gmail.com" style={{ color: "var(--primary)", fontWeight: 600 }}>tennisabisz@gmail.com</a>{" "}
                      möglich.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Wird gesendet..." : "Verbindlich anmelden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
