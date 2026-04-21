import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { BallotStyles, getBallotThemeStyle } from "./ballotStyles";

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

type RegistrationFormProps = {
  anlage: "Wedding" | "Britz";
  redirectUrl?: string;
  onNext?: (data: { name: string; email: string }) => void;
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          ist_vereinsmitglied: formData.ist_vereinsmitglied === "ja" ? true : formData.ist_vereinsmitglied === "nein" ? false : null,
        });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(
          "Beim Absenden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut."
        );
        return;
      }

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

      ${formData.gruppenwuensche ? `
      <div class="section">
        <div class="section-title">Gruppenwünsche</div>
        <p style="margin: 0; white-space: pre-wrap;">${formData.gruppenwuensche}</p>
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

      const textVersion = `Trainingsanmeldung ${anlage}\n\nName: ${formData.name}\nE-Mail: ${formData.email}\nTelefon: ${formData.telefon}\nAlter: ${formData.alter_jahre} Jahre\n\nTrainingsart: ${trainingsartText}\nPro Woche: ${formData.trainings_pro_woche}x\nErfahrung: ${erfahrungText}\n\nVerfügbarkeit:\n${WOCHENTAGE.map(({ key, label }) => `${label}: ${verfuegbarkeitFinal[key]}`).join("\n")}${formData.nachricht ? `\n\nNachricht:\n${formData.nachricht}` : ""}${formData.gruppenwuensche ? `\n\nGruppenwünsche:\n${formData.gruppenwuensche}` : ""}`;

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
      <p class="greeting">Hallo <strong>${formData.name}</strong>,</p>
      <p>vielen Dank für Ihre Trainingsanmeldung bei der Tennisschule A bis Z!</p>
      <p>Wir haben folgende Daten erhalten:</p>

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

      ${formData.gruppenwuensche ? `
      <div class="section">
        <div class="section-title">Gruppenwünsche</div>
        <p style="margin: 0; white-space: pre-wrap;">${formData.gruppenwuensche}</p>
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
            to: [formData.email.trim()],
            subject: `Bestätigung Ihrer Trainingsanmeldung - ${anlage}`,
            body: `Hallo ${formData.name},\n\nvielen Dank für Ihre Trainingsanmeldung bei der Tennisschule A bis Z!\n\n${textVersion}\n\nWir werden uns in Kürze bei Ihnen melden.\n\nMit sportlichen Grüßen,\nIhre Tennisschule A bis Z`,
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
            subject: `Neue Anmeldung ${anlage}: ${formData.name}`,
            body: `Neue Trainingsanmeldung!\n\n${textVersion}`,
            html: emailHtml,
            fromName: "Tennisschule A bis Z",
          }),
        });
      } catch (emailErr) {
        console.error("Trainer-Benachrichtigung-Fehler:", emailErr);
      }

      if (onNext) {
        onNext({ name: formData.name.trim(), email: formData.email.trim() });
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
          Trainings&shy;anmeldung <em>{anlage}</em>
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
          {/* Kontakt */}
          <div className="section-head">
            <span className="num">1</span>
            <span className="title">Kontaktdaten</span>
          </div>

          <div className="field-row">
            <div className="field-num">01</div>
            <div className="field-body">
              <label>Name<span className="req">●</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field-num">02</div>
            <div className="field-body">
              <label>E-Mail<span className="req">●</span></label>
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
            <div className="field-num">03</div>
            <div className="field-body">
              <label>Telefon<span className="req">●</span></label>
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
            <div className="field-num">04</div>
            <div className="field-body">
              <label>Alter<span className="req">●</span></label>
              <input
                type="number"
                name="alter_jahre"
                value={formData.alter_jahre}
                onChange={handleChange}
                min="1"
                max="120"
              />
            </div>
          </div>

          {/* Training */}
          <div className="section-head">
            <span className="num">2</span>
            <span className="title">Trainingswünsche</span>
          </div>

          <div className="field-row">
            <div className="field-num">05</div>
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
            <div className="field-num">06</div>
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
            <div className="field-num">07</div>
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
            <div className="field-num">08</div>
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
            <span className="num">3</span>
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
            <span className="num">4</span>
            <span className="title">Anmerkungen</span>
          </div>

          <div className="field-row">
            <div className="field-num">09</div>
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
              <div className="field-num">10</div>
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
    </div>
  );
}
