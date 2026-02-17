import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";

type Wochentag = "montag" | "dienstag" | "mittwoch" | "donnerstag" | "freitag" | "samstag" | "sonntag";

type RegistrationData = {
  name: string;
  email: string;
  telefon: string;
  verfuegbarkeit: Record<Wochentag, string>;
  trainingsart: string;
  trainings_pro_woche: string;
  erfahrungslevel: string;
  alter_jahre: string;
  nachricht: string;
  gruppenwuensche: string;
};

const WOCHENTAGE: { key: Wochentag; label: string }[] = [
  { key: "montag", label: "Montag" },
  { key: "dienstag", label: "Dienstag" },
  { key: "mittwoch", label: "Mittwoch" },
  { key: "donnerstag", label: "Donnerstag" },
  { key: "freitag", label: "Freitag" },
  { key: "samstag", label: "Samstag" },
  { key: "sonntag", label: "Sonntag" },
];

const UHRZEITEN = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

type RegistrationFormProps = {
  anlage: "Wedding" | "Britz";
};

export default function RegistrationForm({ anlage }: RegistrationFormProps) {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a");

  const [formData, setFormData] = useState<RegistrationData>({
    name: "",
    email: "",
    telefon: "",
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
    alter_jahre: "",
    nachricht: "",
    gruppenwuensche: "",
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

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleZeitVonChange(tag: Wochentag, value: string) {
    setZeitVon((prev) => ({ ...prev, [tag]: value }));
    // Wenn Startzeit gewählt aber keine Endzeit, automatisch letzte Zeit setzen
    let bisValue = zeitBis[tag];
    if (value && !bisValue) {
      bisValue = UHRZEITEN[UHRZEITEN.length - 1]; // 21:00
      setZeitBis((prev) => ({ ...prev, [tag]: bisValue }));
    }
    updateVerfuegbarkeit(tag, value, bisValue, nichtVerfuegbar[tag]);
  }

  function handleZeitBisChange(tag: Wochentag, value: string) {
    setZeitBis((prev) => ({ ...prev, [tag]: value }));
    // Wenn Endzeit gewählt aber keine Startzeit, automatisch früheste Zeit setzen
    let vonValue = zeitVon[tag];
    if (value && !vonValue) {
      vonValue = UHRZEITEN[0]; // 08:00
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

    if (!accountId) {
      setError("Ungültiger Anmeldelink. Bitte kontaktieren Sie den Anbieter.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Bitte geben Sie Ihren Namen ein.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Bitte geben Sie Ihre E-Mail-Adresse ein.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }

    if (!formData.telefon.trim()) {
      setError("Bitte geben Sie Ihre Telefonnummer ein.");
      return;
    }

    if (!formData.alter_jahre) {
      setError("Bitte geben Sie Ihr Alter ein.");
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

    setLoading(true);

    // Leere Tage als "nicht verfügbar" behandeln
    const verfuegbarkeitFinal: Record<Wochentag, string> = { ...formData.verfuegbarkeit };
    for (const tag of WOCHENTAGE) {
      if (!verfuegbarkeitFinal[tag.key]) {
        verfuegbarkeitFinal[tag.key] = "nicht verfügbar";
      }
    }

    try {
      const { error: insertError } = await supabase
        .from("registration_requests")
        .insert({
          account_id: accountId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          telefon: formData.telefon.trim() || null,
          verfuegbarkeit: verfuegbarkeitFinal,
          trainingsart: formData.trainingsart || null,
          trainings_pro_woche: formData.trainings_pro_woche
            ? parseInt(formData.trainings_pro_woche, 10)
            : null,
          erfahrungslevel: formData.erfahrungslevel || null,
          alter_jahre: formData.alter_jahre
            ? parseInt(formData.alter_jahre, 10)
            : null,
          nachricht: formData.gruppenwuensche.trim()
            ? `${formData.nachricht.trim()}\n\nGruppenwünsche: ${formData.gruppenwuensche.trim()}`.trim()
            : formData.nachricht.trim() || null,
          anlage: anlage,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(
          "Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."
        );
        return;
      }

      // E-Mail-Zusammenfassung erstellen
      const trainingsartText = formData.trainingsart === "einzel" ? "Einzeltraining" :
        formData.trainingsart === "gruppe" ? "Gruppentraining" : "Beides möglich";
      const erfahrungText = formData.erfahrungslevel === "anfaenger" ? "Anfänger" :
        formData.erfahrungslevel === "fortgeschritten" ? "Fortgeschritten" :
        formData.erfahrungslevel === "profi" ? "Profi / Wettkampfspieler" : "Nicht angegeben";

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
      <h1 style="margin: 0; font-size: 24px;">Trainingsanmeldung ${anlage}</h1>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">Kontaktdaten</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 500;">${formData.name}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">E-Mail</td><td style="padding: 8px 0; font-weight: 500;">${formData.email}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Telefon</td><td style="padding: 8px 0; font-weight: 500;">${formData.telefon}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Alter</td><td style="padding: 8px 0; font-weight: 500;">${formData.alter_jahre} Jahre</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Trainingswünsche</div>
        <table>
          <tr><td style="padding: 8px 0; color: #6b7280; width: 140px;">Trainingsart</td><td style="padding: 8px 0; font-weight: 500;">${trainingsartText}</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Pro Woche</td><td style="padding: 8px 0; font-weight: 500;">${formData.trainings_pro_woche}x Training</td></tr>
          <tr><td style="padding: 8px 0; color: #6b7280;">Erfahrung</td><td style="padding: 8px 0; font-weight: 500;">${erfahrungText}</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Verfügbarkeit</div>
        <table>${verfuegbarkeitRows}</table>
      </div>

      ${formData.nachricht ? `
      <div class="section">
        <div class="section-title">Nachricht</div>
        <p style="margin: 0; white-space: pre-wrap;">${formData.nachricht}</p>
      </div>
      ` : ""}

      ${anlage === "Britz" && formData.gruppenwuensche ? `
      <div class="section">
        <div class="section-title">Gruppenwünsche</div>
        <p style="margin: 0; white-space: pre-wrap;">${formData.gruppenwuensche}</p>
      </div>
      ` : ""}
    </div>
    <div class="footer">
      Mit sportlichen Grüßen<br>
      <strong>Ihr Tennistrainer-Team</strong>
    </div>
  </div>
</body>
</html>`;

      const textVersion = `Trainingsanmeldung ${anlage}\n\nName: ${formData.name}\nE-Mail: ${formData.email}\nTelefon: ${formData.telefon}\nAlter: ${formData.alter_jahre} Jahre\n\nTrainingsart: ${trainingsartText}\nPro Woche: ${formData.trainings_pro_woche}x\nErfahrung: ${erfahrungText}\n\nVerfügbarkeit:\n${WOCHENTAGE.map(({ key, label }) => `${label}: ${verfuegbarkeitFinal[key]}`).join("\n")}${formData.nachricht ? `\n\nNachricht:\n${formData.nachricht}` : ""}${anlage === "Britz" && formData.gruppenwuensche ? `\n\nGruppenwünsche:\n${formData.gruppenwuensche}` : ""}`;

      // Bestätigungsmail an den Ausfüller senden
      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [formData.email.trim()],
            subject: `Bestätigung Ihrer Trainingsanmeldung - ${anlage}`,
            body: `Hallo ${formData.name},\n\nvielen Dank für Ihre Trainingsanmeldung!\n\n${textVersion}\n\nWir werden uns in Kürze bei Ihnen melden.\n\nMit sportlichen Grüßen,\nIhr Tennistrainer-Team`,
            html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p style="font-size: 18px;">Hallo <strong>${formData.name}</strong>,</p>
  <p>vielen Dank für Ihre Trainingsanmeldung bei der Tennisschule ${anlage}!</p>
  <p>Wir haben folgende Daten erhalten:</p>
  ${emailHtml.split('<div class="container">')[1].split('<div class="footer">')[0]}
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280;">Wir werden uns in Kürze bei Ihnen melden.</p>
    <p>Mit sportlichen Grüßen,<br><strong>Ihr Tennistrainer-Team</strong></p>
  </div>
</body>
</html>`,
            fromName: "Tennisschule",
          }),
        });
      } catch (emailErr) {
        console.error("Bestätigungsmail-Fehler:", emailErr);
      }

      // Benachrichtigung an Trainer senden
      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: ["tennisabisz@gmail.com"],
            subject: `Neue Anmeldung ${anlage}: ${formData.name}`,
            body: `Neue Trainingsanmeldung!\n\n${textVersion}`,
            html: emailHtml,
            fromName: "Tennisschule Anmeldung",
          }),
        });
      } catch (emailErr) {
        console.error("Trainer-Benachrichtigung-Fehler:", emailErr);
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

  if (!accountId) {
    return (
      <div className="registrationPage">
        <div className="card registrationCard">
          <h1>Ungültiger Link</h1>
          <p className="muted">
            Dieser Anmeldelink ist ungültig. Bitte kontaktieren Sie den
            Tennisanbieter für einen korrekten Link.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="registrationPage">
        <div className="card registrationCard">
          <div className="successIcon">&#10003;</div>
          <h1>Anmeldung erfolgreich!</h1>
          <p className="muted">
            Vielen Dank für Ihre Anmeldung. Wir werden uns in Kürze bei Ihnen
            melden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="registrationPage">
      <div className="card registrationCard">
        <h1>Trainingsanmeldung {anlage}</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Füllen Sie das Formular aus, um sich für ein Tennistraining
          anzumelden.
        </p>

        <div style={{
          background: "var(--bg-inset)",
          border: "1px solid var(--warning)",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          fontSize: 14,
          lineHeight: 1.6
        }}>
          <strong style={{ color: "var(--warning)" }}>Wichtiger Hinweis zur Mitgliedschaft:</strong>
          <p style={{ margin: "8px 0 0 0" }}>
            Das Training ist grundsätzlich nur für Vereinsmitglieder möglich. Mitglieder zahlen neben den Trainingsgebühren zusätzliche Mitgliedsgebühren. Ausnahmen bestehen für Probetrainings und Tenniscamps.
          </p>
          <p style={{ margin: "8px 0 0 0" }}>
            Für weitere Informationen zu den Mitgliedspreisen schauen Sie bitte direkt auf der Vereinswebsite nach:{" "}
            <a
              href={anlage === "Wedding" ? "https://bscrehberge-tennis.de/" : "https://tc-britz.de/"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--primary)" }}
            >
              {anlage === "Wedding" ? "bscrehberge-tennis.de" : "tc-britz.de"}
            </a>
          </p>
        </div>

        {error && <div className="errorBox">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="registrationFields">
            <div className="field">
              <label>
                Name <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ihr vollständiger Name"
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

            <div className="field">
              <label>
                Alter <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="number"
                name="alter_jahre"
                value={formData.alter_jahre}
                onChange={handleChange}
                placeholder="Ihr Alter"
                min="1"
                max="120"
              />
            </div>

            <div className="field">
              <label>
                Trainingsart <span style={{ color: "var(--danger)" }}>*</span>
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
            </div>

            <div className="field">
              <label>
                Trainings pro Woche <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                name="trainings_pro_woche"
                value={formData.trainings_pro_woche}
                onChange={handleChange}
              >
                <option value="">Bitte auswählen...</option>
                <option value="1">1x pro Woche</option>
                <option value="2">2x pro Woche</option>
                <option value="3">3x pro Woche</option>
              </select>
            </div>

            <div className="field">
              <label>Erfahrungslevel</label>
              <select
                name="erfahrungslevel"
                value={formData.erfahrungslevel}
                onChange={handleChange}
              >
                <option value="">Bitte auswählen...</option>
                <option value="anfaenger">Anfänger</option>
                <option value="fortgeschritten">Fortgeschritten</option>
                <option value="profi">Profi / Wettkampfspieler</option>
              </select>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Gewünschte Trainingszeiten</label>
              <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                Wählen Sie für jeden Tag Ihre verfügbare Zeit aus
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

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Nachricht / Anmerkungen</label>
              <textarea
                name="nachricht"
                value={formData.nachricht}
                onChange={handleChange}
                placeholder="Haben Sie besondere Wünsche oder Fragen?"
                rows={4}
                style={{
                  resize: "vertical",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                }}
              />
            </div>

            {anlage === "Britz" && (formData.trainingsart === "gruppe" || formData.trainingsart === "beides") && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>Bei Gruppentraining: Gruppenwünsche</label>
                <textarea
                  name="gruppenwuensche"
                  value={formData.gruppenwuensche}
                  onChange={handleChange}
                  placeholder="Mit wem möchten Sie gerne in einer Gruppe trainieren?"
                  rows={3}
                  style={{
                    resize: "vertical",
                    fontFamily: "inherit",
                    fontSize: "inherit",
                  }}
                />
              </div>
            )}
          </div>

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 16 }}>
            <a
              href={anlage === "Britz" ? "/agb-britz" : "/agb"}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--primary)" }}
            >
              Zu unseren Trainingspreisen und Bedingungen
            </a>
          </p>

          <div style={{ marginTop: 16 }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Wird gesendet..." : "Anmeldung absenden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
