import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";

type Wochentag = "montag" | "dienstag" | "mittwoch" | "donnerstag" | "freitag" | "samstag";

type FormData = {
  vorname: string;
  nachname: string;
  alter: string;
  hatTennisGespielt: string;
  spielstand: string;
  trainingsart: string;
  istVreinsmitglied: string;
  email: string;
  telefon: string;
  verfuegbarkeit: Record<Wochentag, string>;
};

const WOCHENTAGE: { key: Wochentag; label: string }[] = [
  { key: "montag", label: "Montag" },
  { key: "dienstag", label: "Dienstag" },
  { key: "mittwoch", label: "Mittwoch" },
  { key: "donnerstag", label: "Donnerstag" },
  { key: "freitag", label: "Freitag" },
  { key: "samstag", label: "Samstag" },
];

const UHRZEITEN = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

type ProbetrainingFormProps = {
  onBack: () => void;
  anlage?: "Wedding" | "Britz";
};

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

export default function ProbetrainingForm({ onBack, anlage = "Wedding" }: ProbetrainingFormProps) {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a") || DEFAULT_ACCOUNT_ID;

  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showSeasonPopup, setShowSeasonPopup] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    vorname: "",
    nachname: "",
    alter: "",
    hatTennisGespielt: "",
    spielstand: "",
    trainingsart: "",
    istVreinsmitglied: "",
    email: "",
    telefon: "",
    verfuegbarkeit: {
      montag: "",
      dienstag: "",
      mittwoch: "",
      donnerstag: "",
      freitag: "",
      samstag: "",
    },
  });

  const [zeitVon, setZeitVon] = useState<Record<Wochentag, string>>({
    montag: "", dienstag: "", mittwoch: "", donnerstag: "", freitag: "", samstag: ""
  });
  const [zeitBis, setZeitBis] = useState<Record<Wochentag, string>>({
    montag: "", dienstag: "", mittwoch: "", donnerstag: "", freitag: "", samstag: ""
  });
  const [nichtVerfuegbar, setNichtVerfuegbar] = useState<Record<Wochentag, boolean>>({
    montag: false, dienstag: false, mittwoch: false, donnerstag: false, freitag: false, samstag: false
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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

  function validateStep1(): boolean {
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
    return true;
  }

  function validateStep2(): boolean {
    if (!formData.hatTennisGespielt) {
      setError("Bitte geben Sie an, ob Sie schon einmal Tennis gespielt haben.");
      return false;
    }
    if (!formData.spielstand) {
      setError("Bitte wählen Sie Ihren Spielstand aus.");
      return false;
    }
    if (!formData.trainingsart) {
      setError("Bitte wählen Sie die gewünschte Trainingsart aus.");
      return false;
    }
    if (!formData.istVreinsmitglied) {
      setError("Bitte geben Sie an, ob Sie bereits Vereinsmitglied sind.");
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    const hasAvailability = Object.values(formData.verfuegbarkeit).some(
      (v) => v && v !== "nicht verfügbar"
    );
    if (!hasAvailability) {
      setError("Bitte geben Sie mindestens einen verfügbaren Zeitraum an.");
      return false;
    }
    return true;
  }

  function validateStep4(): boolean {
    if (!formData.email.trim() && !formData.telefon.trim()) {
      setError("Bitte geben Sie mindestens eine E-Mail-Adresse oder Telefonnummer an.");
      return false;
    }
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    setError(null);
    let valid = false;

    switch (step) {
      case 1:
        valid = validateStep1();
        break;
      case 2:
        valid = validateStep2();
        break;
      case 3:
        valid = validateStep3();
        break;
      default:
        valid = true;
    }

    if (valid) {
      setStep(step + 1);
    }
  }

  function prevStep() {
    setError(null);
    if (step === 1) {
      onBack();
    } else {
      setStep(step - 1);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validateStep4()) {
      return;
    }

    setLoading(true);

    // Verfügbarkeit finalisieren
    const verfuegbarkeitFinal: Record<Wochentag, string> = { ...formData.verfuegbarkeit };
    for (const tag of WOCHENTAGE) {
      if (!verfuegbarkeitFinal[tag.key]) {
        verfuegbarkeitFinal[tag.key] = "nicht verfügbar";
      }
    }

    // E-Mail-HTML erstellen
    const spielstandText = formData.spielstand === "anfaenger" ? "Anfänger" :
      formData.spielstand === "fortgeschritten" ? "Fortgeschritten" : "Wettkampfspieler";
    const trainingsartText = formData.trainingsart === "einzel" ? "Einzeltraining" :
      formData.trainingsart === "gruppe" ? "Gruppentraining" : "Beides möglich";

    const hatGespieltText = formData.hatTennisGespielt === "ja" ? "Ja" : "Nein";
    const mitgliedText = formData.istVreinsmitglied === "ja" ? "Ja" : "Nein";

    const verfuegbarkeitRows = WOCHENTAGE.map(({ key, label }) =>
      `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${label}</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${verfuegbarkeitFinal[key]}</td></tr>`
    ).join("");

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .section { background: white; padding: 16px; margin: 16px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
    .section-title { font-size: 14px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .highlight { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">Neue Probetraining-Anfrage</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${anlage}</p>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Persönliche Daten</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Vorname</td><td style="padding: 8px 0; font-weight: 500;">${formData.vorname}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Nachname</td><td style="padding: 8px 0; font-weight: 500;">${formData.nachname}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Alter</td><td style="padding: 8px 0; font-weight: 500;">${formData.alter} Jahre</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Tenniserfahrung</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 180px;">Schon Tennis gespielt?</td><td style="padding: 8px 0; font-weight: 500;">${hatGespieltText}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Spielstand</td><td style="padding: 8px 0; font-weight: 500;">${spielstandText}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Gewünschte Trainingsart</td><td style="padding: 8px 0; font-weight: 500;">${trainingsartText}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Bereits Vereinsmitglied?</td><td style="padding: 8px 0; font-weight: 500;">${mitgliedText}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Verfügbarkeit</div>
        <table>${verfuegbarkeitRows}</table>
      </div>

      <div class="section">
        <div class="section-title">Kontaktdaten</div>
        <table>
          ${formData.email ? `<tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">E-Mail</td><td style="padding: 8px 0; font-weight: 500;">${formData.email}</td></tr>` : ""}
          ${formData.telefon ? `<tr><td style="padding: 8px 0; color: #6b7280;">Telefon</td><td style="padding: 8px 0; font-weight: 500;">${formData.telefon}</td></tr>` : ""}
        </table>
      </div>

      ${formData.istVreinsmitglied === "nein" ? `
      <div class="highlight">
        <strong>Hinweis:</strong> Noch kein Vereinsmitglied.
      </div>
      ` : ""}
    </div>
    <div class="footer">
      Mit sportlichen Grüßen<br>
      <strong>Tennisschule A bis Z</strong>
    </div>
  </div>
</body>
</html>`;

    const textVersion = `Neue Probetraining-Anfrage ${anlage}

Persönliche Daten:
Vorname: ${formData.vorname}
Nachname: ${formData.nachname}
Alter: ${formData.alter} Jahre

Tenniserfahrung:
Schon Tennis gespielt: ${hatGespieltText}
Spielstand: ${spielstandText}
Gewünschte Trainingsart: ${trainingsartText}
Vereinsmitglied: ${mitgliedText}

Verfügbarkeit:
${WOCHENTAGE.map(({ key, label }) => `${label}: ${verfuegbarkeitFinal[key]}`).join("\n")}

Kontaktdaten:
${formData.email ? `E-Mail: ${formData.email}` : ""}
${formData.telefon ? `Telefon: ${formData.telefon}` : ""}

${formData.istVreinsmitglied === "nein" ? "Hinweis: Noch kein Vereinsmitglied." : ""}`;

    try {
      // In Supabase speichern
      const { error: dbError } = await supabase
        .from("probetraining_anfragen")
        .insert({
          account_id: accountId,
          vorname: formData.vorname,
          nachname: formData.nachname,
          alter: parseInt(formData.alter, 10),
          hat_tennis_gespielt: formData.hatTennisGespielt === "ja",
          spielstand: formData.spielstand,
          trainingsart: formData.trainingsart,
          ist_vereinsmitglied: formData.istVreinsmitglied === "ja",
          anlage: anlage,
          email: formData.email || null,
          telefon: formData.telefon || null,
          verfuegbarkeit: verfuegbarkeitFinal,
          status: "neu",
        });

      if (dbError) {
        console.error("Database error:", dbError);
      }

      // E-Mail an Trainer senden
      await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: ["tennisabisz@gmail.com"],
          subject: `Neue Probetraining-Anfrage ${anlage}: ${formData.vorname} ${formData.nachname}`,
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

  if (success) {
    // Automatisch zur Wedding-Seite weiterleiten nach 3 Sekunden
    setTimeout(() => {
      window.location.href = anlage === "Britz" ? "/britz" : "/wedding";
    }, 3000);

    return (
      <div className={`registrationPage ${anlage === "Britz" ? "britzTheme" : "weddingTheme"}`}>
        <div className="card registrationCard">
          <div className="successIcon">&#10003;</div>
          <h1>Anfrage erfolgreich gesendet!</h1>
          <p className="muted">
            Vielen Dank für Ihre Probetraining-Anfrage. Wir werden uns in Kürze bei Ihnen melden, um einen Termin zu vereinbaren.
          </p>
          <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
            Sie werden automatisch weitergeleitet...
          </p>
        </div>
      </div>
    );
  }

  const progressWidth = (step / 4) * 100;

  return (
    <div className={`registrationPage ${anlage === "Britz" ? "britzTheme" : "weddingTheme"}`}>
      <div className="card registrationCard" style={{ maxWidth: 600 }}>
        <h1 style={{ marginBottom: 8 }}>Probetraining buchen</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Schritt {step} von 4
        </p>

        {/* Progress Bar */}
        <div style={{
          background: "#e5e7eb",
          borderRadius: 4,
          height: 8,
          marginBottom: 24,
          overflow: "hidden",
        }}>
          <div style={{
            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            height: "100%",
            width: `${progressWidth}%`,
            transition: "width 0.3s ease",
          }} />
        </div>

        {/* Season Info Popup */}
        {step === 1 && showSeasonPopup && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}>
            <div style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>&#9888;</div>
              <h2 style={{ marginBottom: 12, fontSize: 18, color: "#1f2937" }}>
                Hinweis zur Sommersaison
              </h2>
              <p style={{ color: "#4b5563", lineHeight: 1.6, marginBottom: 20 }}>
                Da aktuell die Planung für die Sommersaison läuft, können Probetrainings erst wieder nach den Osterferien stattfinden. Füllen Sie trotzdem gerne schon einmal das Formular aus.
              </p>
              <button
                type="button"
                onClick={() => setShowSeasonPopup(false)}
                style={{
                  padding: "12px 32px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                Verstanden
              </button>
            </div>
          </div>
        )}

        {error && <div className="errorBox">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Personal Data */}
          {step === 1 && (
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
            </div>
          )}

          {/* Step 2: Tennis Experience */}
          {step === 2 && (
            <div className="registrationFields">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>
                  Haben Sie schon einmal Tennis gespielt? <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="hatTennisGespielt"
                      value="ja"
                      checked={formData.hatTennisGespielt === "ja"}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    Ja
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="hatTennisGespielt"
                      value="nein"
                      checked={formData.hatTennisGespielt === "nein"}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    Nein
                  </label>
                </div>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>
                  Wie beschreiben Sie Ihren Spielstand? <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  name="spielstand"
                  value={formData.spielstand}
                  onChange={handleChange}
                >
                  <option value="">Bitte auswählen...</option>
                  <option value="anfaenger">Anfänger</option>
                  <option value="fortgeschritten">Fortgeschritten</option>
                  <option value="wettkampf">Wettkampfspieler</option>
                </select>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>
                  Für welche Art von Training sind Sie interessiert? <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <select
                  name="trainingsart"
                  value={formData.trainingsart}
                  onChange={handleChange}
                >
                  <option value="">Bitte auswählen...</option>
                  <option value="einzel">Einzeltraining</option>
                  <option value="gruppe">Gruppentraining</option>
                  <option value="beides">Beides möglich</option>
                </select>
                {formData.spielstand === "anfaenger" && (
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#92400e", background: "#fef3c7", padding: "8px 12px", borderRadius: 6, border: "1px solid #f59e0b" }}>
                    Für Anfänger empfehlen wir Einzeltraining, um die Grundlagen gezielt zu erlernen.
                  </p>
                )}
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>
                  Sind Sie bereits Mitglied im Verein? <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="istVreinsmitglied"
                      value="ja"
                      checked={formData.istVreinsmitglied === "ja"}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    Ja
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="istVreinsmitglied"
                      value="nein"
                      checked={formData.istVreinsmitglied === "nein"}
                      onChange={handleChange}
                      style={{ width: "auto" }}
                    />
                    Nein
                  </label>
                </div>
              </div>

              {formData.istVreinsmitglied === "nein" && (
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <div style={{
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    borderRadius: 8,
                    padding: 16,
                  }}>
                    <p style={{ margin: 0, color: "#92400e", lineHeight: 1.6 }}>
                      Nach dem Probetraining erhalten Sie Informationen zum Aufnahmeprozess. Bitte erkundigen Sie sich zu Mitgliedsbedingungen auf der Website des Tennisvereins:{" "}
                      <a
                        href={anlage === "Britz" ? "https://tc-britz.de" : "https://bscrehberge-tennis.de/verein/mitgliedschaft/"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#92400e", fontWeight: 600 }}
                      >
                        {anlage === "Britz" ? "tc-britz.de" : "bscrehberge-tennis.de"}
                      </a>
                    </p>
                    <p style={{ margin: "12px 0 0 0", color: "#92400e", fontWeight: 500 }}>
                      Das Probetraining ist unverbindlich.
                    </p>
                    <p style={{ margin: "12px 0 0 0", color: "#92400e", fontSize: 14 }}>
                      <strong>Hinweis:</strong> Kinder dürfen 1 Saison mitgliedsfrei trainieren.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Availability */}
          {step === 3 && (
            <div className="registrationFields">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Zeitliche Verfügbarkeit</label>
                <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  Wählen Sie für jeden Tag Ihre verfügbare Zeit aus
                </p>
                <p style={{
                  fontSize: 15,
                  marginBottom: 12,
                  color: "#dc2626",
                  fontWeight: 700,
                  background: "#fef2f2",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #fecaca"
                }}>
                  Bitte geben Sie möglichst viele verfügbare Zeiten an, um die Chance auf einen passenden Termin zu erhöhen.
                </p>
                <table className="verfuegbarkeitTable">
                  <tbody>
                    {WOCHENTAGE.map(({ key, label }) => (
                      <tr key={key}>
                        <td style={{ fontWeight: 500, paddingRight: 12, minWidth: 100 }}>
                          {label}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <select
                              value={zeitVon[key]}
                              onChange={(e) => handleZeitVonChange(key, e.target.value)}
                              disabled={nichtVerfuegbar[key]}
                              style={{ padding: "6px 8px", opacity: nichtVerfuegbar[key] ? 0.5 : 1 }}
                            >
                              <option value="">Von</option>
                              {UHRZEITEN.map((zeit) => (
                                <option key={zeit} value={zeit}>{zeit}</option>
                              ))}
                            </select>
                            <span>–</span>
                            <select
                              value={zeitBis[key]}
                              onChange={(e) => handleZeitBisChange(key, e.target.value)}
                              disabled={nichtVerfuegbar[key]}
                              style={{ padding: "6px 8px", opacity: nichtVerfuegbar[key] ? 0.5 : 1 }}
                            >
                              <option value="">Bis</option>
                              {UHRZEITEN.map((zeit) => (
                                <option key={zeit} value={zeit}>{zeit}</option>
                              ))}
                            </select>
                            <label style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8, cursor: "pointer", fontSize: 13 }}>
                              <input
                                type="checkbox"
                                checked={nichtVerfuegbar[key]}
                                onChange={(e) => handleNichtVerfuegbarChange(key, e.target.checked)}
                                style={{ width: "auto" }}
                              />
                              nicht verfügbar
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step 4: Contact */}
          {step === 4 && (
            <div className="registrationFields">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
                  Bitte geben Sie mindestens eine Kontaktmöglichkeit an.
                </p>
              </div>

              <div className="field">
                <label>E-Mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ihre@email.de"
                />
              </div>

              <div className="field">
                <label>Telefon</label>
                <input
                  type="tel"
                  name="telefon"
                  value={formData.telefon}
                  onChange={handleChange}
                  placeholder="Ihre Telefonnummer"
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 24,
            gap: 16,
          }}>
            <button
              type="button"
              onClick={prevStep}
              style={{
                padding: "12px 24px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Zurück
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                style={{
                  padding: "12px 24px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Weiter
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "12px 24px",
                  background: loading
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {loading ? "Wird gesendet..." : "Anfrage absenden"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
