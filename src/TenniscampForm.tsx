import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabaseClient";
import "./App.css";

type CampOption = {
  id: string;
  label: string;
  dates: string;
  type: "kind" | "erwachsene";
};

const CAMP_OPTIONS: CampOption[] = [
  { id: "woche1-kind", label: "1. Ferienwoche - Kindercamp", dates: "14.07. - 18.07.2025", type: "kind" },
  { id: "woche1-erwachsene", label: "1. Ferienwoche - Erwachsenencamp", dates: "14.07. - 18.07.2025", type: "erwachsene" },
  { id: "woche6-kind", label: "6. Ferienwoche - Kindercamp", dates: "18.08. - 22.08.2025", type: "kind" },
  { id: "woche6-erwachsene", label: "6. Ferienwoche - Erwachsenencamp", dates: "18.08. - 22.08.2025", type: "erwachsene" },
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
  sepaZustimmung: boolean;
  verbindlicheAnmeldung: boolean;
};

export default function TenniscampForm() {
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get("a");

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
    sepaZustimmung: false,
    verbindlicheAnmeldung: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedCamp = CAMP_OPTIONS.find(c => c.id === formData.campId);
  const isKindercamp = selectedCamp?.type === "kind";

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError("Ungültiger Anmeldelink. Bitte kontaktieren Sie den Anbieter.");
      return;
    }

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
            <td style="background: linear-gradient(135deg, #1b471b 0%, #2d5a2d 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Anmeldung Tenniscamp</h1>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: inline-block; line-height: 64px; text-align: center;">
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8faf8; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Camp-Details</p>
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
              <div style="background-color: #fff8e6; border-radius: 8px; border: 1px solid #fcd34d; padding: 16px;">
                <p style="margin: 0 0 8px; color: #92400e; font-size: 14px; font-weight: 600;">Zahlungsinformation</p>
                <p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.5;">
                  Die Campgebühr wird zwei Wochen vor Beginn des Camps per SEPA-Lastschrift eingezogen.
                  Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich.
                  Eine Absage ist ausschließlich schriftlich per E-Mail an
                  <a href="mailto:tennisabisz@gmail.com" style="color: #92400e; font-weight: 600;">tennisabisz@gmail.com</a>
                  möglich.
                </p>
              </div>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: #666666; font-size: 14px;">Bei Fragen erreichen Sie uns unter:</p>
              <a href="mailto:tennisabisz@gmail.com" style="color: #1b471b; font-weight: 600; text-decoration: none;">tennisabisz@gmail.com</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8faf8; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px; color: #333333; font-size: 14px; font-weight: 600;">Sportliche Grüße</p>
              <p style="margin: 0; color: #1b471b; font-size: 15px; font-weight: 700;">Tennisschule A bis Z</p>
            </td>
          </tr>
        </table>

        <p style="margin: 24px 0 0; color: #999999; font-size: 12px; text-align: center;">
          &copy; 2025 Tennisschule A bis Z. Alle Rechte vorbehalten.
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
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">&#127934; Neue Tenniscamp-Anmeldung</h1>
            </td>
          </tr>

          <!-- Camp Info -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <div style="background-color: #fff8e6; border-radius: 8px; border: 1px solid #fcd34d; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; color: #92400e; font-size: 14px; font-weight: 600;">${selectedCamp?.label}</p>
                <p style="margin: 0; color: #78350f; font-size: 16px; font-weight: 700;">${selectedCamp?.dates}</p>
              </div>

              <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Teilnehmer</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8faf8; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
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
                    </table>
                  </td>
                </tr>
              </table>

              ${isKindercamp ? `
              <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Zahlungspflichtiger</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8faf8; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #333333; font-size: 15px; font-weight: 600;">${zahlungspflichtiger}</span>
                  </td>
                </tr>
              </table>
              ` : ''}

              <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Kontaktdaten</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8faf8; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">E-Mail:</span>
                          <a href="mailto:${formData.email}" style="color: #1b471b; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${formData.email}</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Telefon:</span>
                          <a href="tel:${formData.telefon}" style="color: #1b471b; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${formData.telefon}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">SEPA-Lastschrift</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8faf8; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #666666; font-size: 13px;">IBAN:</span>
                    <span style="color: #333333; font-size: 15px; font-weight: 600; margin-left: 8px; font-family: monospace;">${formData.iban}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8faf8; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
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

Teilnehmer: ${teilnehmerName}
Alter: ${formData.alter} Jahre
${isKindercamp ? `Zahlungspflichtiger: ${zahlungspflichtiger}\n` : ''}
E-Mail: ${formData.email}
Telefon: ${formData.telefon}

IBAN: ${formData.iban}`;

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
        </div>
      </div>
    );
  }

  return (
    <div className="registrationPage">
      <div className="card registrationCard">
        <h1>Anmeldung Tenniscamp</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Melden Sie sich oder Ihr Kind für eines unserer Tenniscamps an.
        </p>

        <div style={{
          background: "var(--bg-inset)",
          border: "1px solid var(--primary)",
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
                    <div>
                      <div style={{ fontWeight: 600 }}>{camp.label}</div>
                      <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{camp.dates}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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

            <div className="field">
              <label>
                Alter des Teilnehmers <span style={{ color: "var(--danger)" }}>*</span>
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
                background: "#fef3c7",
                border: "1px solid #f59e0b",
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
                    <span style={{ fontWeight: 600, color: "#92400e" }}>
                      Verbindliche Anmeldung <span style={{ color: "var(--danger)" }}>*</span>
                    </span>
                    <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>
                      Hiermit melde ich mich/mein Kind verbindlich zum Tenniscamp an. Die Campgebühr wird zwei Wochen vor
                      Beginn des Camps fällig. Eine kostenfreie Stornierung ist nur bis zu diesem Zeitpunkt möglich.
                      Eine Absage ist ausschließlich schriftlich per E-Mail an{" "}
                      <a href="mailto:tennisabisz@gmail.com" style={{ color: "#92400e", fontWeight: 600 }}>tennisabisz@gmail.com</a>{" "}
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
