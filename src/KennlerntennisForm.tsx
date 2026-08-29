import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";
import { LegalFooter } from "./LegalText";

type FormData = {
  vorname: string;
  nachname: string;
  alter: string;
  email: string;
  telefon: string;
  termin: string;
  spielstand: string;
  spielstaerkeBeschreibung: string;
  istVereinsmitglied: string;
};

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

// Anmeldung offen. Zum Schliessen (z.B. wenn beide Termine vorbei sind):
// auf true setzen - dann zeigt die Seite nur noch einen Hinweis.
const ANMELDUNG_GESCHLOSSEN: boolean = false;

// Termine des Kennenlerntennis. Neue Termine nur hier eintragen - Formular,
// Erfolgsseite und beide Bestaetigungsmails ziehen alles aus dieser Liste.
// Einzelnen Termin schliessen: einfach aus der Liste entfernen.
// Geschlossen: 30.08.2026 ("Sonntag, 30.08.2026 um 16 Uhr").
const TERMINE = [
  { value: "20.09.2026", label: "Sonntag, 20.09.2026 um 16 Uhr" },
];
const TERMIN_BEIDE = "beide";
// Kurzfassung fuer die Kopfzeile - wird aus TERMINE gebildet, damit sie nicht veraltet.
const TERMINE_KURZ = TERMINE.map((t) => t.label.replace("Sonntag, ", "")).join(" und ");
const ORT = "TC Blau-Weiß Britz 1950 e.V., Buschkrugallee 159-175, 12359 Berlin";

function terminText(value: string): string {
  if (value === TERMIN_BEIDE) return TERMINE.map((t) => t.label).join(" und ");
  return TERMINE.find((t) => t.value === value)?.label || value;
}

export default function KennlerntennisForm() {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a") || DEFAULT_ACCOUNT_ID;

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    vorname: "",
    nachname: "",
    alter: "",
    email: "",
    telefon: "",
    termin: "",
    spielstand: "",
    spielstaerkeBeschreibung: "",
    istVereinsmitglied: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function validate(): boolean {
    if (!formData.vorname.trim()) {
      setError("Bitte geben Sie Ihren Vornamen ein.");
      return false;
    }
    if (!formData.nachname.trim()) {
      setError("Bitte geben Sie Ihren Nachnamen ein.");
      return false;
    }
    if (!formData.alter) {
      setError("Bitte geben Sie Ihr Alter ein.");
      return false;
    }
    if (!formData.email.trim()) {
      setError("Bitte geben Sie eine E-Mail-Adresse ein.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return false;
    }
    if (!formData.telefon.trim()) {
      setError("Bitte geben Sie eine Telefonnummer ein.");
      return false;
    }
    if (!formData.termin) {
      setError("Bitte wählen Sie einen Termin aus.");
      return false;
    }
    // Faengt alte, noch offene Tabs ab, in denen ein inzwischen geschlossener
    // Termin ausgewaehlt war.
    const terminOffen =
      (formData.termin === TERMIN_BEIDE && TERMINE.length > 1) ||
      TERMINE.some((t) => t.value === formData.termin);
    if (!terminOffen) {
      setError("Für den gewählten Termin ist die Anmeldung geschlossen. Bitte laden Sie die Seite neu.");
      return false;
    }
    if (!formData.spielstand) {
      setError("Bitte wählen Sie Ihren Spielstand aus.");
      return false;
    }
    if (!formData.istVereinsmitglied) {
      setError("Bitte geben Sie an, ob Sie bereits Vereinsmitglied sind.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (ANMELDUNG_GESCHLOSSEN) {
      setError("Die Anmeldung zum Kennenlerntennis ist leider geschlossen.");
      return;
    }

    if (!validate()) {
      return;
    }

    setLoading(true);

    const spielstandText =
      formData.spielstand === "anfaenger" ? "Anfänger" :
      formData.spielstand === "fortgeschritten" ? "Fortgeschritten" :
      "Turnierspieler";
    const mitgliedText = formData.istVereinsmitglied === "ja" ? "Ja" : "Nein";
    const terminGewaehlt = terminText(formData.termin);

    // Freitext-Eingaben landen in HTML-Mails - vor dem Einsetzen entschaerfen.
    const esc = (v: string) =>
      v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .section { background: white; padding: 16px; margin: 16px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .section-title { font-size: 14px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Neue Kennenlerntennis-Anfrage</h1>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Termin</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Gewählter Termin</td><td style="padding: 8px 0; font-weight: 600;">${esc(terminGewaehlt)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Ort</td><td style="padding: 8px 0; font-weight: 500;">${ORT}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Persönliche Daten</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Vorname</td><td style="padding: 8px 0; font-weight: 500;">${esc(formData.vorname)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Nachname</td><td style="padding: 8px 0; font-weight: 500;">${esc(formData.nachname)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Alter</td><td style="padding: 8px 0; font-weight: 500;">${esc(formData.alter)} Jahre</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">E-Mail</td><td style="padding: 8px 0; font-weight: 500;">${esc(formData.email)}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Telefon</td><td style="padding: 8px 0; font-weight: 500;">${esc(formData.telefon)}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Tenniserfahrung</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Spielstand</td><td style="padding: 8px 0; font-weight: 500;">${spielstandText}</td></tr>
          ${formData.spielstaerkeBeschreibung ? `<tr><td style="padding: 8px 0; color: #6b7280;">Beschreibung</td><td style="padding: 8px 0; font-weight: 500;">${esc(formData.spielstaerkeBeschreibung)}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #6b7280;">Vereinsmitglied</td><td style="padding: 8px 0; font-weight: 500;">${mitgliedText}</td></tr>
        </table>
      </div>
    </div>
    <div class="footer">
      Mit sportlichen Grüßen<br>
      <strong>Tennisschule A bis Z</strong>
    </div>
  </div>
</body>
</html>`;

    const textVersion = `Neue Kennenlerntennis-Anfrage

Gewählter Termin: ${terminGewaehlt}
Ort: ${ORT}

Persönliche Daten:
Vorname: ${formData.vorname}
Nachname: ${formData.nachname}
Alter: ${formData.alter} Jahre
E-Mail: ${formData.email}
Telefon: ${formData.telefon}

Tenniserfahrung:
Spielstand: ${spielstandText}${formData.spielstaerkeBeschreibung ? `\nBeschreibung: ${formData.spielstaerkeBeschreibung}` : ""}
Vereinsmitglied: ${mitgliedText}`;

    // Bestaetigung an die Teilnehmerin / den Teilnehmer
    const bestaetigungHtml = `
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
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Anmeldung Kennenlerntennis</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 36px 40px 16px;">
              <div style="width: 64px; height: 64px; background: #1d4ed8; border-radius: 50%; display: inline-block; line-height: 64px; text-align: center;">
                <span style="color: #ffffff; font-size: 32px;">&#10003;</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h2 style="margin: 0 0 8px; color: #333333; font-size: 22px; font-weight: 600;">Hallo ${esc(formData.vorname)},</h2>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">
                vielen Dank für Ihre Anmeldung zum Kennenlerntennis. Wir haben Ihre Anfrage erhalten und freuen uns auf Sie.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px; color: #1d4ed8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Ihre Anmeldung</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #666666; font-size: 13px;">Termin:</span><br>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${esc(terminGewaehlt)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #666666; font-size: 13px;">Ort:</span><br>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${ORT}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #666666; font-size: 13px;">Teilnehmer:</span><br>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${esc(formData.vorname)} ${esc(formData.nachname)}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px;">
              <div style="background-color: #f5f5f5; border-radius: 8px; border: 1px solid #e5e5e5; padding: 16px;">
                <p style="margin: 0 0 8px; color: #525252; font-size: 14px; font-weight: 600;">Gut zu wissen</p>
                <p style="margin: 0; color: #525252; font-size: 13px; line-height: 1.5;">
                  Die Teilnahme ist kostenlos und unverbindlich. Bitte kommen Sie in Sportkleidung;
                  Schläger können bei Bedarf gestellt werden. Falls Sie doch nicht können, geben Sie
                  uns bitte kurz Bescheid.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: #666666; font-size: 14px;">Bei Fragen erreichen Sie uns unter:</p>
              <a href="mailto:tennisabisz@gmail.com" style="color: #1d4ed8; font-weight: 600; text-decoration: none;">tennisabisz@gmail.com</a>
            </td>
          </tr>
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

    const bestaetigungText = `Anmeldung Kennenlerntennis

Hallo ${formData.vorname},

vielen Dank für Ihre Anmeldung zum Kennenlerntennis. Wir haben Ihre Anfrage erhalten und freuen uns auf Sie.

Termin: ${terminGewaehlt}
Ort: ${ORT}
Teilnehmer: ${formData.vorname} ${formData.nachname}

Die Teilnahme ist kostenlos und unverbindlich. Bitte kommen Sie in Sportkleidung; Schläger können bei Bedarf gestellt werden. Falls Sie doch nicht können, geben Sie uns bitte kurz Bescheid.

Bei Fragen erreichen Sie uns unter: tennisabisz@gmail.com

Sportliche Grüße,
Tennisschule A bis Z`;

    try {
      const anfrage = {
        account_id: accountId,
        vorname: formData.vorname,
        nachname: formData.nachname,
        alter: parseInt(formData.alter, 10),
        email: formData.email,
        telefon: formData.telefon,
        spielstand: formData.spielstand,
        spielstaerke_beschreibung: formData.spielstaerkeBeschreibung || null,
        ist_vereinsmitglied: formData.istVereinsmitglied === "ja",
        // Wird im Formular nicht mehr abgefragt; null statt eines erfundenen Ja/Nein.
        interesse_weiterfuehrend: null,
        termin: terminGewaehlt,
        status: "offen",
      };

      let { error: dbError } = await supabase
        .from("kennlerntennis_anfragen")
        .insert(anfrage);

      // Solange interesse_weiterfuehrend noch NOT NULL ist (SQL in
      // supabase_kennlerntennis_interesse_optional.sql), lieber false speichern
      // als die Anmeldung zu verlieren.
      if (dbError?.code === "23502") {
        console.warn("interesse_weiterfuehrend ist noch NOT NULL - speichere false.", dbError);
        ({ error: dbError } = await supabase
          .from("kennlerntennis_anfragen")
          .insert({ ...anfrage, interesse_weiterfuehrend: false }));
      }

      if (dbError) {
        console.error("Database error:", dbError);
      }

      // Bestaetigung an Teilnehmer
      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [formData.email],
            subject: "Ihre Anmeldung zum Kennenlerntennis",
            body: bestaetigungText,
            html: bestaetigungHtml,
            fromName: "Tennisschule A bis Z",
          }),
        });
      } catch (mailErr) {
        console.error("Bestätigungsmail-Fehler:", mailErr);
      }

      // Benachrichtigung an Admin
      await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: ["tennisabisz@gmail.com"],
          subject: `Neue Kennenlerntennis-Anfrage: ${formData.vorname} ${formData.nachname} (${terminGewaehlt})`,
          body: textVersion,
          html: emailHtml,
          fromName: "Tennisschule A bis Z",
        }),
      });

      setSuccess(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError("Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.");
    } finally {
      setLoading(false);
    }
  }

  if (ANMELDUNG_GESCHLOSSEN) {
    return (
      <div className="registrationPage weddingTheme">
        <div className="card registrationCard" style={{ maxWidth: 600 }}>
          <h1 style={{ marginBottom: 8 }}>Kennenlerntennis</h1>
          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "14px 18px",
            borderRadius: 10,
            marginBottom: 20,
            textAlign: "center",
            fontWeight: 700,
            fontSize: 15,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}>
            Anmeldung geschlossen
          </div>
          <p className="muted" style={{ marginBottom: 8 }}>
            Für das Kennenlerntennis können derzeit keine Anfragen mehr entgegengenommen werden.
          </p>
          <p className="muted">
            Bei Interesse an einem Training schreiben Sie uns gerne an{" "}
            <a href="mailto:tennisabisz@gmail.com">tennisabisz@gmail.com</a> – wir melden uns,
            sobald es einen neuen Termin gibt.
          </p>
        </div>
        {/* Kennenlerntennis findet beim TC Britz statt - daher die Britzer AGB. */}
        <LegalFooter anlage="Britz" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="registrationPage weddingTheme">
        <div className="card registrationCard">
          <div className="successIcon">&#10003;</div>
          <h1>Anmeldung erfolgreich gesendet!</h1>
          <p className="muted">
            Vielen Dank für Ihre Anmeldung zum Kennenlerntennis.<br />
            Termin: <strong>{terminText(formData.termin)}</strong><br />
            Ort: {ORT}
          </p>
          <p className="muted" style={{ marginTop: 12 }}>
            Eine Bestätigung haben wir an <strong>{formData.email}</strong> geschickt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="registrationPage weddingTheme">
      <div className="card registrationCard" style={{ maxWidth: 600 }}>
        <h1 style={{ marginBottom: 8 }}>Kennenlerntennis</h1>
        <div style={{
          background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
          color: "#fff",
          padding: "14px 18px",
          borderRadius: 10,
          marginBottom: 20,
          textAlign: "center",
          fontWeight: 600,
          fontSize: 17,
          boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
        }}>
          {TERMINE.length > 1 ? "Termine" : "Termin"}: {TERMINE_KURZ}
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 6, opacity: 0.9 }}>
            {ORT}
          </div>
        </div>
        <p className="muted" style={{ marginBottom: 24 }}>
          Füllen Sie das Formular aus, um sich unverbindlich und kostenlos zum
          Kennenlerntennis anzumelden.
        </p>

        {error && <div className="errorBox">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="registrationFields">
            <div className="field">
              <label>
                Vorname <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="vorname"
                value={formData.vorname}
                onChange={handleChange}
                placeholder="Ihr Vorname"
              />
            </div>

            <div className="field">
              <label>
                Nachname <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="nachname"
                value={formData.nachname}
                onChange={handleChange}
                placeholder="Ihr Nachname"
              />
            </div>

            <div className="field">
              <label>
                Alter <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="number"
                name="alter"
                value={formData.alter}
                onChange={handleChange}
                placeholder="Ihr Alter"
                min="1"
                max="120"
              />
            </div>

            <div className="field">
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
                Telefonnummer <span style={{ color: "var(--danger)" }}>*</span>
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
                An welchem Termin möchten Sie teilnehmen? <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {TERMINE.map((t) => (
                  <label
                    key={t.value}
                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                  >
                    <input
                      type="radio"
                      name="termin"
                      value={t.value}
                      checked={formData.termin === t.value}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    {t.label}
                  </label>
                ))}
                {/* "Beide Termine" ergibt nur Sinn, solange mehr als ein Termin offen ist. */}
                {TERMINE.length > 1 && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="termin"
                      value={TERMIN_BEIDE}
                      checked={formData.termin === TERMIN_BEIDE}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    Beide Termine
                  </label>
                )}
              </div>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                Spielstand <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                name="spielstand"
                value={formData.spielstand}
                onChange={handleChange}
              >
                <option value="">Bitte auswählen...</option>
                <option value="anfaenger">Anfänger</option>
                <option value="fortgeschritten">Fortgeschritten</option>
                <option value="turnierspieler">Turnierspieler</option>
              </select>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Beschreibung Ihrer Spielstärke</label>
              <textarea
                name="spielstaerkeBeschreibung"
                value={formData.spielstaerkeBeschreibung}
                onChange={handleChange}
                rows={3}
                placeholder="z.B. 3 mal im Urlaub mit Trainer gespielt"
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                Sind Sie Mitglied im Verein? <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="istVereinsmitglied"
                    value="ja"
                    checked={formData.istVereinsmitglied === "ja"}
                    onChange={handleChange}
                    style={{ width: "auto" }}
                  />
                  Ja
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="istVereinsmitglied"
                    value="nein"
                    checked={formData.istVereinsmitglied === "nein"}
                    onChange={handleChange}
                    style={{ width: "auto" }}
                  />
                  Nein
                </label>
              </div>
            </div>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 24,
          }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 24px",
                background: loading
                  ? "#9ca3af"
                  : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              {loading ? "Wird gesendet..." : "Anmeldung absenden"}
            </button>
          </div>
        </form>
      </div>
      {/* Kennenlerntennis findet beim TC Britz statt - daher die Britzer AGB. */}
      <LegalFooter anlage="Britz" />
    </div>
  );
}
