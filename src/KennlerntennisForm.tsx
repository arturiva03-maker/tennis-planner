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
  spielstand: string;
  spielstaerkeBeschreibung: string;
  istVereinsmitglied: string;
  interesseWeiterfuehrend: string;
};

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

// Anmeldung geschlossen (Termin 31.5. ist vorbei).
// Zum Wiederoeffnen: auf false setzen und TERMIN unten aktualisieren.
const ANMELDUNG_GESCHLOSSEN: boolean = true;
const TERMIN = "31.5. um 16 Uhr";

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
    spielstand: "",
    spielstaerkeBeschreibung: "",
    istVereinsmitglied: "",
    interesseWeiterfuehrend: "",
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
    if (!formData.spielstand) {
      setError("Bitte wählen Sie Ihren Spielstand aus.");
      return false;
    }
    if (!formData.istVereinsmitglied) {
      setError("Bitte geben Sie an, ob Sie bereits Vereinsmitglied sind.");
      return false;
    }
    if (!formData.interesseWeiterfuehrend) {
      setError("Bitte geben Sie an, ob Sie an weiterführendem Training interessiert sind.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (ANMELDUNG_GESCHLOSSEN) {
      setError("Die Anmeldung zum Kennlerntennis ist leider geschlossen.");
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
    const interesseText = formData.interesseWeiterfuehrend === "ja" ? "Ja" : "Nein";

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
      <h1 style="margin: 0; font-size: 24px;">Neue Kennlerntennis-Anfrage</h1>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Persönliche Daten</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Vorname</td><td style="padding: 8px 0; font-weight: 500;">${formData.vorname}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Nachname</td><td style="padding: 8px 0; font-weight: 500;">${formData.nachname}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Alter</td><td style="padding: 8px 0; font-weight: 500;">${formData.alter} Jahre</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">E-Mail</td><td style="padding: 8px 0; font-weight: 500;">${formData.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Telefon</td><td style="padding: 8px 0; font-weight: 500;">${formData.telefon}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Tenniserfahrung</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Spielstand</td><td style="padding: 8px 0; font-weight: 500;">${spielstandText}</td></tr>
          ${formData.spielstaerkeBeschreibung ? `<tr><td style="padding: 8px 0; color: #6b7280;">Beschreibung</td><td style="padding: 8px 0; font-weight: 500;">${formData.spielstaerkeBeschreibung}</td></tr>` : ""}
          <tr><td style="padding: 8px 0; color: #6b7280;">Vereinsmitglied</td><td style="padding: 8px 0; font-weight: 500;">${mitgliedText}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Interesse weiterführendes Training</td><td style="padding: 8px 0; font-weight: 500;">${interesseText}</td></tr>
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

    const textVersion = `Neue Kennlerntennis-Anfrage

Persönliche Daten:
Vorname: ${formData.vorname}
Nachname: ${formData.nachname}
Alter: ${formData.alter} Jahre
E-Mail: ${formData.email}
Telefon: ${formData.telefon}

Tenniserfahrung:
Spielstand: ${spielstandText}${formData.spielstaerkeBeschreibung ? `\nBeschreibung: ${formData.spielstaerkeBeschreibung}` : ""}
Vereinsmitglied: ${mitgliedText}
Interesse weiterführendes Training: ${interesseText}`;

    try {
      const { error: dbError } = await supabase
        .from("kennlerntennis_anfragen")
        .insert({
          account_id: accountId,
          vorname: formData.vorname,
          nachname: formData.nachname,
          alter: parseInt(formData.alter, 10),
          email: formData.email,
          telefon: formData.telefon,
          spielstand: formData.spielstand,
          spielstaerke_beschreibung: formData.spielstaerkeBeschreibung || null,
          ist_vereinsmitglied: formData.istVereinsmitglied === "ja",
          interesse_weiterfuehrend: formData.interesseWeiterfuehrend === "ja",
          status: "offen",
        });

      if (dbError) {
        console.error("Database error:", dbError);
      }

      await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: ["tennisabisz@gmail.com"],
          subject: `Neue Kennlerntennis-Anfrage: ${formData.vorname} ${formData.nachname}`,
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
          <h1 style={{ marginBottom: 8 }}>Kennlerntennis</h1>
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
            Für das Kennlerntennis können derzeit keine Anfragen mehr entgegengenommen werden.
          </p>
          <p className="muted">
            Bei Interesse an einem Training schreiben Sie uns gerne an{" "}
            <a href="mailto:tennisabisz@gmail.com">tennisabisz@gmail.com</a> – wir melden uns,
            sobald es einen neuen Termin gibt.
          </p>
        </div>
        <LegalFooter />
      </div>
    );
  }

  if (success) {
    return (
      <div className="registrationPage weddingTheme">
        <div className="card registrationCard">
          <div className="successIcon">&#10003;</div>
          <h1>Anfrage erfolgreich gesendet!</h1>
          <p className="muted">
            Vielen Dank für Ihre Kennlerntennis-Anfrage. Termin: <strong>{TERMIN}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="registrationPage weddingTheme">
      <div className="card registrationCard" style={{ maxWidth: 600 }}>
        <h1 style={{ marginBottom: 8 }}>Kennlerntennis</h1>
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
          Termin: {TERMIN}
        </div>
        <p className="muted" style={{ marginBottom: 24 }}>
          Füllen Sie das Formular aus, um sich unverbindlich zum Kennlerntennis anzumelden.
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

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                Ich bin an weiterführendem Training in der Tennisschule A bis Z interessiert <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="interesseWeiterfuehrend"
                    value="ja"
                    checked={formData.interesseWeiterfuehrend === "ja"}
                    onChange={handleChange}
                    style={{ width: "auto" }}
                  />
                  Ja
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="interesseWeiterfuehrend"
                    value="nein"
                    checked={formData.interesseWeiterfuehrend === "nein"}
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
              {loading ? "Wird gesendet..." : "Anfrage absenden"}
            </button>
          </div>
        </form>
      </div>
      <LegalFooter />
    </div>
  );
}
