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

export default function RegistrationForm() {
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

  function handleVerfuegbarkeitChange(tag: Wochentag, value: string) {
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

    try {
      const { error: insertError } = await supabase
        .from("registration_requests")
        .insert({
          account_id: accountId,
          name: formData.name.trim(),
          email: formData.email.trim(),
          telefon: formData.telefon.trim() || null,
          verfuegbarkeit: formData.verfuegbarkeit,
          trainingsart: formData.trainingsart || null,
          trainings_pro_woche: formData.trainings_pro_woche
            ? parseInt(formData.trainings_pro_woche, 10)
            : null,
          erfahrungslevel: formData.erfahrungslevel || null,
          alter_jahre: formData.alter_jahre
            ? parseInt(formData.alter_jahre, 10)
            : null,
          nachricht: formData.nachricht.trim() || null,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(
          "Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."
        );
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
        <h1>Trainingsanmeldung</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Füllen Sie das Formular aus, um sich für ein Tennistraining
          anzumelden.
        </p>

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
                Tragen Sie für jeden verfügbaren Tag Ihre bevorzugte Uhrzeit ein
              </p>
              <table className="verfuegbarkeitTable">
                <tbody>
                  {WOCHENTAGE.map(({ key, label }) => (
                    <tr key={key}>
                      <td style={{ fontWeight: 500, paddingRight: 12 }}>
                        {label}
                      </td>
                      <td>
                        <input
                          type="text"
                          value={formData.verfuegbarkeit[key]}
                          onChange={(e) =>
                            handleVerfuegbarkeitChange(key, e.target.value)
                          }
                          placeholder="z.B. 14:00-18:00"
                          style={{ width: "100%" }}
                        />
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
          </div>

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Wird gesendet..." : "Anmeldung absenden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
