import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { BallotStyles, getBallotThemeStyle } from "./ballotStyles";

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

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

type SepaFormProps = {
  anlage?: "Wedding" | "Britz";
  initialData?: { name?: string; email?: string };
  headerNote?: React.ReactNode;
};

function splitName(name?: string): { vorname: string; nachname: string } {
  if (!name) return { vorname: "", nachname: "" };
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { vorname: parts[0], nachname: "" };
  return {
    vorname: parts[0],
    nachname: parts.slice(1).join(" "),
  };
}

export default function SepaForm({ anlage = "Wedding", initialData, headerNote }: SepaFormProps) {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a") || DEFAULT_ACCOUNT_ID;

  const prefill = splitName(initialData?.name);
  const [formData, setFormData] = useState<SepaFormData>({
    vorname: prefill.vorname,
    nachname: prefill.nachname,
    istKind: false,
    elternteilName: "",
    strasse: "",
    plz: "",
    ort: "",
    iban: "",
    email: initialData?.email ?? "",
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
          anlage: anlage,
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

  const themeStyle = getBallotThemeStyle(anlage);

  if (success) {
    return (
      <div className="ballotForm" style={themeStyle}>
        <BallotStyles />
        <div className="sheet">
          <div className="meta">
            <span>Mandat erteilt</span>
          </div>
          <div className="success-stamp">✓ Mandat erteilt</div>
          <h1 className="display">Vielen <em>Dank</em>.</h1>
          <p className="intro">
            Ihr SEPA-Lastschriftmandat wurde erfolgreich übermittelt. Wir melden uns
            in Kürze bei Ihnen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="ballotForm" style={themeStyle}>
      <BallotStyles />

      <div className="sheet">
        {headerNote}
        <div className="meta">
          <span>SEPA-Mandat</span>
        </div>

        <h1 className="display">
          SEPA-<em>Lastschriftmandat</em>
        </h1>
        <p className="intro">
          Erteilen Sie uns das Mandat zur Abbuchung der Trainingsgebühren. Die
          Daten werden verschlüsselt gespeichert und nicht an Dritte weitergegeben.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="section-head">
            <span className="num">§ 1</span>
            <span className="title">Kontoinhaber</span>
          </div>

          <div className="field-row">
            <div className="field-num">01</div>
            <div className="field-body">
              <label>Vorname<span className="req">●</span></label>
              <input
                type="text"
                name="vorname"
                value={formData.vorname}
                onChange={handleChange}
                placeholder="Vorname"
                autoComplete="given-name"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">02</div>
            <div className="field-body">
              <label>Nachname<span className="req">●</span></label>
              <input
                type="text"
                name="nachname"
                value={formData.nachname}
                onChange={handleChange}
                placeholder="Nachname"
                autoComplete="family-name"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">03</div>
            <div className="field-body">
              <label style={{ marginBottom: 8 }}>Mandatsnehmer</label>
              <label className="checkbox block" style={{ marginTop: 6 }}>
                <input
                  type="checkbox"
                  name="istKind"
                  checked={formData.istKind}
                  onChange={handleChange}
                />
                Es handelt sich um mein Kind (unter 18 Jahre)
              </label>
            </div>
          </div>

          {formData.istKind && (
            <div className="field-row">
              <div className="field-num">04</div>
              <div className="field-body">
                <label>Elternteil / Erziehungsberechtigter<span className="req">●</span></label>
                <input
                  type="text"
                  name="elternteilName"
                  value={formData.elternteilName}
                  onChange={handleChange}
                  placeholder="Vor- und Nachname"
                />
              </div>
            </div>
          )}

          <div className="section-head">
            <span className="num">§ 2</span>
            <span className="title">Anschrift</span>
          </div>

          <div className="field-row">
            <div className="field-num">05</div>
            <div className="field-body">
              <label>Straße und Hausnummer<span className="req">●</span></label>
              <input
                type="text"
                name="strasse"
                value={formData.strasse}
                onChange={handleChange}
                placeholder="z. B. Musterstraße 12"
                autoComplete="street-address"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">06</div>
            <div className="field-body">
              <label>Postleitzahl<span className="req">●</span></label>
              <input
                type="text"
                name="plz"
                value={formData.plz}
                onChange={handleChange}
                placeholder="z. B. 12345"
                maxLength={5}
                autoComplete="postal-code"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">07</div>
            <div className="field-body">
              <label>Ort<span className="req">●</span></label>
              <input
                type="text"
                name="ort"
                value={formData.ort}
                onChange={handleChange}
                placeholder="z. B. Berlin"
                autoComplete="address-level2"
              />
            </div>
          </div>

          <div className="section-head">
            <span className="num">§ 3</span>
            <span className="title">Bankverbindung</span>
          </div>

          <div className="field-row">
            <div className="field-num">08</div>
            <div className="field-body">
              <label>IBAN<span className="req">●</span></label>
              <input
                type="text"
                name="iban"
                className="iban"
                value={formData.iban}
                onChange={handleChange}
                placeholder="DE89 3704 0044 0532 0130 00"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">09</div>
            <div className="field-body">
              <label>E-Mail<span className="req">●</span></label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ihre@email.de"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="mandate-block">
            <p className="mandate-title">Einwilligung · SEPA-Lastschriftmandat</p>
            <p>
              Ich ermächtige die Tennisschule Zlatan Palazov und Artur Ivanenko GbR,
              Zahlungen von meinem Konto mittels Lastschrift einzuziehen. Zugleich
              weise ich mein Kreditinstitut an, die von der Tennisschule auf mein
              Konto gezogenen Lastschriften einzulösen.
            </p>
            <p>
              Hinweis: Ich kann innerhalb von acht Wochen, beginnend mit dem
              Belastungsdatum, die Erstattung des belasteten Betrages verlangen.
              Es gelten dabei die mit meinem Kreditinstitut vereinbarten
              Bedingungen.
            </p>
          </div>

          <label className="checkbox prose block" style={{ maxWidth: "62ch" }}>
            <input
              type="checkbox"
              name="einwilligung"
              checked={formData.einwilligung}
              onChange={handleChange}
            />
            <span>
              Ich erteile hiermit das SEPA-Lastschriftmandat und bestätige, dass
              ich berechtigt bin, über das angegebene Konto zu verfügen.
              <span className="req" style={{ marginLeft: 4 }}>●</span>
            </span>
          </label>

          {error && (
            <div className="error-line">
              <div className="label">Hinweis</div>
              <div>{error}</div>
            </div>
          )}

          <div className="submit-area">
            <p className="agb">
              Mit der Erteilung akzeptieren Sie unsere{" "}
              <a
                href={anlage === "Britz" ? "/agb-britz" : "/agb"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Trainingsbedingungen und Preise
              </a>
              . Ihre Daten werden verschlüsselt gespeichert, nur zur Abwicklung
              der Trainingsbeiträge verwendet und nach Ende des Trainings­verhältnisses
              gelöscht. Auskunft &amp; Löschung:{" "}
              <a href="mailto:tennisabisz@gmail.com">tennisabisz@gmail.com</a>.
            </p>
            <button className="primary" type="submit" disabled={loading}>
              {loading ? "Wird gesendet …" : "Mandat erteilen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
