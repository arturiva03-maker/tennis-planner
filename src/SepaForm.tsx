import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";

type SepaFormData = {
  vorname: string;
  nachname: string;
  istKind: boolean;
  elternteilName: string;
  strasse: string;
  plz: string;
  ort: string;
  iban: string;
  email: string;
  einwilligung: boolean;
};

function formatIban(value: string): string {
  const cleaned = value.replace(/\s/g, "").toUpperCase();
  return cleaned.replace(/(.{4})/g, "$1 ").trim();
}

function validateIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "");
  if (cleaned.length < 15 || cleaned.length > 34) return false;
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned)) return false;
  return true;
}

function generateMandatsreferenz(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SEPA-${year}${month}${day}-${random}`;
}

export default function SepaForm() {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a");

  const [formData, setFormData] = useState<SepaFormData>({
    vorname: "",
    nachname: "",
    istKind: false,
    elternteilName: "",
    strasse: "",
    plz: "",
    ort: "",
    iban: "",
    email: "",
    einwilligung: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "iban") {
      setFormData((prev) => ({ ...prev, [name]: formatIban(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError("Ungültiger Link. Bitte kontaktieren Sie den Anbieter.");
      return;
    }

    if (!formData.vorname.trim()) {
      setError("Bitte geben Sie den Vornamen ein.");
      return;
    }

    if (!formData.nachname.trim()) {
      setError("Bitte geben Sie den Nachnamen ein.");
      return;
    }

    if (formData.istKind && !formData.elternteilName.trim()) {
      setError("Bitte geben Sie den Namen des Elternteils/Erziehungsberechtigten ein.");
      return;
    }

    if (!formData.strasse.trim()) {
      setError("Bitte geben Sie die Straße und Hausnummer ein.");
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

    if (!formData.iban.trim()) {
      setError("Bitte geben Sie die IBAN ein.");
      return;
    }

    if (!validateIban(formData.iban)) {
      setError("Bitte geben Sie eine gültige IBAN ein.");
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

    if (!formData.einwilligung) {
      setError("Bitte bestätigen Sie die Einwilligung zur SEPA-Lastschrift.");
      return;
    }

    setLoading(true);

    try {
      const mandatsreferenz = generateMandatsreferenz();
      const unterschriftsdatum = new Date().toISOString().split("T")[0];

      const { error: insertError } = await supabase
        .from("sepa_mandates")
        .insert({
          account_id: accountId,
          vorname: formData.vorname.trim(),
          nachname: formData.nachname.trim(),
          ist_kind: formData.istKind,
          elternteil_name: formData.istKind ? formData.elternteilName.trim() : null,
          strasse: formData.strasse.trim(),
          plz: formData.plz.trim(),
          ort: formData.ort.trim(),
          iban: formData.iban.replace(/\s/g, ""),
          email: formData.email.trim(),
          mandatsreferenz,
          unterschriftsdatum,
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
            Dieser Link ist ungültig. Bitte kontaktieren Sie den
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
          <h1>SEPA-Mandat erteilt!</h1>
          <p className="muted">
            Vielen Dank! Ihr SEPA-Lastschriftmandat wurde erfolgreich übermittelt.
            Sie erhalten eine Bestätigung per E-Mail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="registrationPage">
      <div className="card registrationCard">
        <h1>SEPA-Lastschriftmandat</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Erteilen Sie uns ein SEPA-Lastschriftmandat für die bequeme Abbuchung der Trainingsgebühren.
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
                placeholder="Vorname des Spielers"
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
                placeholder="Nachname des Spielers"
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="istKind"
                  checked={formData.istKind}
                  onChange={handleChange}
                  style={{ width: "auto" }}
                />
                Es handelt sich um mein Kind (unter 18 Jahre)
              </label>
            </div>

            {formData.istKind && (
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <label>
                  Name des Elternteils/Erziehungsberechtigten <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  name="elternteilName"
                  value={formData.elternteilName}
                  onChange={handleChange}
                  placeholder="Vollständiger Name"
                />
              </div>
            )}

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>
                Straße und Hausnummer <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="strasse"
                value={formData.strasse}
                onChange={handleChange}
                placeholder="Musterstraße 123"
              />
            </div>

            <div className="field">
              <label>
                PLZ <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="plz"
                value={formData.plz}
                onChange={handleChange}
                placeholder="12345"
                maxLength={5}
              />
            </div>

            <div className="field">
              <label>
                Ort <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                name="ort"
                value={formData.ort}
                onChange={handleChange}
                placeholder="Musterstadt"
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
                onChange={handleChange}
                placeholder="DE89 3704 0044 0532 0130 00"
                style={{ fontFamily: "monospace", letterSpacing: 1 }}
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
              <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                An diese Adresse senden wir die Bestätigung des Mandats.
              </p>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1", marginTop: 16 }}>
              <div style={{
                background: "var(--bg-inset)",
                padding: 16,
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.6
              }}>
                <strong>SEPA-Lastschriftmandat</strong>
                <p style={{ margin: "12px 0" }}>
                  Ich ermächtige den Zahlungsempfänger, Zahlungen von meinem Konto mittels Lastschrift einzuziehen.
                  Zugleich weise ich mein Kreditinstitut an, die vom Zahlungsempfänger auf mein Konto gezogenen
                  Lastschriften einzulösen.
                </p>
                <p style={{ margin: "12px 0" }}>
                  Hinweis: Ich kann innerhalb von acht Wochen, beginnend mit dem Belastungsdatum, die Erstattung
                  des belasteten Betrages verlangen. Es gelten dabei die mit meinem Kreditinstitut vereinbarten
                  Bedingungen.
                </p>
              </div>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="einwilligung"
                  checked={formData.einwilligung}
                  onChange={handleChange}
                  style={{ width: "auto", marginTop: 4 }}
                />
                <span>
                  Ich erteile hiermit das SEPA-Lastschriftmandat und bestätige, dass ich berechtigt bin,
                  über das angegebene Konto zu verfügen. <span style={{ color: "var(--danger)" }}>*</span>
                </span>
              </label>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Mit der Erteilung des SEPA-Mandats akzeptieren Sie unsere{" "}
                <a
                  href="/agb"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)" }}
                >
                  Allgemeinen Geschäftsbedingungen (AGB)
                </a>
                .
              </p>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Wird gesendet..." : "SEPA-Mandat erteilen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
