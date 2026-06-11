import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";

const SCHULE_TELEFON = "0155 60062745";
const SCHULE_EMAIL = "tennisabisz@gmail.com";

type SlotInfo = {
  datum: string;
  von: string;
  bis: string;
  anlage: string;
  buchungEmail?: string;
  buchungName?: string;
  preis?: number;
};

type TrainerKontakt = {
  name?: string;
  telefon?: string;
};

export default function AbsagePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"confirm" | "success" | "error" | "already" | "notfound">("confirm");
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
  const [trainerKontakt, setTrainerKontakt] = useState<TrainerKontakt | null>(null);
  const [serverKurzfristig, setServerKurzfristig] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) { setStatus("notfound"); setLoading(false); return; }

      const { data, error } = await supabase
        .from("spontane_stunden")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setStatus("notfound");
      } else if (data.status !== "gebucht") {
        setStatus("already");
      } else {
        setSlotInfo({
          datum: data.datum,
          von: data.uhrzeit_von,
          bis: data.uhrzeit_bis,
          anlage: data.anlage,
          buchungEmail: data.buchung?.email ?? undefined,
          buchungName: data.buchung?.name ?? undefined,
          preis: data.custom_preis_pro_stunde ?? undefined,
        });
        setStatus("confirm");

        // Trainer-Kontakt für kurzfristige Absagen laden (Name + Telefon)
        try {
          const { data: kontakt } = await supabase.rpc("spontan_trainer_kontakt", { slot_id: id });
          if (kontakt) setTrainerKontakt(kontakt as TrainerKontakt);
        } catch {
          // optional – Fallback ist die Schul-Telefonnummer
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  // Weniger als 24 Stunden bis Trainingsbeginn?
  const kurzfristig = (() => {
    if (serverKurzfristig) return true;
    if (!slotInfo) return false;
    const start = new Date(`${slotInfo.datum}T${slotInfo.von}`);
    if (isNaN(start.getTime())) return false;
    return start.getTime() - Date.now() < 24 * 60 * 60 * 1000;
  })();

  async function handleAbsage() {
    if (!id) return;
    setSubmitting(true);

    try {
      // Serverseitig: prüft die 24-h-Frist, entfernt das Training aus dem
      // Kalender und gibt den Slot wieder zur Buchung frei.
      const { data, error } = await supabase.rpc("spontan_buchung_absagen", { slot_id: id });

      if (error) {
        setStatus("error");
        setSubmitting(false);
        return;
      }

      if (data === "zu_kurzfristig") {
        setServerKurzfristig(true);
        setSubmitting(false);
        return;
      }
      if (data === "nicht_gebucht") {
        setStatus("already");
        setSubmitting(false);
        return;
      }
      if (data !== "ok") {
        setStatus("notfound");
        setSubmitting(false);
        return;
      }

      // Benachrichtigung an die Tennisschule senden
      const datumFormatted = slotInfo
        ? new Date(slotInfo.datum + "T12:00:00").toLocaleDateString("de-DE", {
            weekday: "long", day: "2-digit", month: "2-digit", year: "numeric"
          })
        : "";
      const zeitInfo = slotInfo ? `${slotInfo.von} – ${slotInfo.bis} Uhr` : "";

      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [SCHULE_EMAIL],
            subject: `Absage: Kurzfristiges Training ${datumFormatted}`,
            body: `Eine kurzfristige Trainingsstunde wurde abgesagt.\n\nTermin: ${datumFormatted}\nUhrzeit: ${zeitInfo}\nAnlage: ${slotInfo?.anlage ?? ""}\n\nDas verknüpfte Training wurde aus dem Kalender entfernt. Die Stunde ist jetzt wieder online buchbar.`,
            html: `<p>Eine kurzfristige Trainingsstunde wurde abgesagt.</p><p><strong>Termin:</strong> ${datumFormatted}<br><strong>Uhrzeit:</strong> ${zeitInfo}<br><strong>Anlage:</strong> ${slotInfo?.anlage ?? ""}</p><p>Das verknüpfte Training wurde aus dem Kalender entfernt. Die Stunde ist jetzt wieder online buchbar.</p>`,
            fromName: "Tennisschule A bis Z",
          }),
        });
      } catch {
        // E-Mail-Fehler nicht blockieren
      }

      // Absagebestätigung an den Bucher senden
      if (slotInfo?.buchungEmail) {
        try {
          await fetch("/api/send-newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: [slotInfo.buchungEmail],
              subject: `Absagebestätigung: Training am ${datumFormatted}`,
              body: `Hallo ${slotInfo.buchungName ?? ""},\n\nIhre Buchung wurde erfolgreich und kostenfrei storniert.\n\nTermin: ${datumFormatted}\nUhrzeit: ${zeitInfo}\nAnlage: ${slotInfo.anlage}${slotInfo.preis ? `\nPreis: ${slotInfo.preis.toFixed(2).replace(".", ",")} EUR` : ""}\n\nBei Fragen erreichen Sie uns unter ${SCHULE_EMAIL}.\n\nSportliche Grüße,\nTennisschule A bis Z`,
              html: `<p>Hallo ${slotInfo.buchungName ?? ""},</p><p>Ihre Buchung wurde erfolgreich und kostenfrei storniert.</p><p><strong>Termin:</strong> ${datumFormatted}<br><strong>Uhrzeit:</strong> ${zeitInfo}<br><strong>Anlage:</strong> ${slotInfo.anlage}${slotInfo.preis ? `<br><strong>Preis:</strong> ${slotInfo.preis.toFixed(2).replace(".", ",")} EUR` : ""}</p><p style="margin: 0 0 8px; color: #666666; font-size: 14px;">Bei Fragen erreichen Sie uns unter <a href="mailto:${SCHULE_EMAIL}" style="color: #1b5e20; font-weight: 600; text-decoration: none;">${SCHULE_EMAIL}</a></p><div style="background-color: #f8faf8; padding: 24px 40px; border-top: 1px solid #e5e7eb; margin-top: 24px;"><p style="margin: 0 0 4px; color: #333333; font-size: 14px; font-weight: 600;">Sportliche Grüße</p><p style="margin: 0; color: #1b471b; font-size: 15px; font-weight: 700;">Tennisschule A bis Z</p><p style="margin: 12px 0 0; color: #999999; font-size: 12px;">${slotInfo.anlage === "Britz" ? "Standort Britz · TC Blau-Weiß Britz" : "Standort Wedding · BSC Rehberge"}</p></div>`,
              fromName: "Tennisschule A bis Z",
            }),
          });
        } catch {
          // E-Mail-Fehler nicht blockieren
        }
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
    setSubmitting(false);
  }

  const datumFormatted = slotInfo
    ? new Date(slotInfo.datum + "T12:00:00").toLocaleDateString("de-DE", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric"
      })
    : "";

  const trainerTelefon = trainerKontakt?.telefon?.trim() || null;
  const telefonAnzeige = trainerTelefon ?? SCHULE_TELEFON;
  const telefonLabel = trainerTelefon
    ? `Trainer ${trainerKontakt?.name ?? ""}`.trim()
    : "Tennisschule";
  const mailtoHref = `mailto:${SCHULE_EMAIL}?subject=${encodeURIComponent(
    `Kurzfristige Absage: Training am ${datumFormatted}`
  )}&body=${encodeURIComponent(
    `Hallo,\n\nich muss meine Trainingsstunde am ${datumFormatted} (${slotInfo?.von?.slice(0, 5) ?? ""} – ${slotInfo?.bis?.slice(0, 5) ?? ""} Uhr, ${slotInfo?.anlage ?? ""}) leider kurzfristig absagen.\n\nName: ${slotInfo?.buchungName ?? ""}\n\nViele Grüße`
  )}`;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#fafafa",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: "40px 32px",
        maxWidth: 480,
        width: "100%",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        textAlign: "center",
      }}>
        {loading ? (
          <p style={{ color: "#6b7280" }}>Laden...</p>
        ) : status === "notfound" ? (
          <>
            <h2 style={{ marginBottom: 8 }}>Termin nicht gefunden</h2>
            <p style={{ color: "#6b7280" }}>Dieser Absage-Link ist nicht mehr gültig.</p>
          </>
        ) : status === "already" ? (
          <>
            <h2 style={{ marginBottom: 8 }}>Bereits abgesagt</h2>
            <p style={{ color: "#6b7280" }}>Dieser Termin wurde bereits abgesagt oder ist nicht mehr gebucht.</p>
          </>
        ) : status === "success" ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#10003;</div>
            <h2 style={{ marginBottom: 8, color: "#22c55e" }}>Absage bestätigt</h2>
            <p style={{ color: "#6b7280" }}>
              Ihre Buchung für <strong>{datumFormatted}</strong> ({slotInfo?.von} – {slotInfo?.bis} Uhr) wurde kostenfrei storniert.
              Die Tennisschule wurde benachrichtigt.
            </p>
          </>
        ) : status === "error" ? (
          <>
            <h2 style={{ marginBottom: 8, color: "#ef4444" }}>Fehler</h2>
            <p style={{ color: "#6b7280" }}>Die Absage konnte nicht verarbeitet werden. Bitte kontaktieren Sie uns unter {SCHULE_EMAIL}.</p>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 8 }}>Termin absagen?</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              {kurzfristig
                ? "Ihr Training beginnt in weniger als 24 Stunden."
                : "Möchten Sie Ihre Buchung für folgenden Termin wirklich absagen?"}
            </p>
            <div style={{
              background: "#f9fafb",
              borderRadius: 10,
              padding: "16px 20px",
              marginBottom: 24,
              textAlign: "left",
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{datumFormatted}</div>
              <div style={{ color: "#6b7280" }}>{slotInfo?.von} – {slotInfo?.bis} Uhr</div>
              <div style={{ color: "#6b7280" }}>{slotInfo?.anlage}</div>
            </div>

            {kurzfristig ? (
              <>
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  padding: "16px 20px",
                  marginBottom: 24,
                  textAlign: "left",
                  color: "#991b1b",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Kurzfristige Absage</div>
                  Da Ihr Training in weniger als 24 Stunden beginnt, ist eine kostenfreie
                  Online-Absage leider nicht mehr möglich – laut unseren Bedingungen muss die
                  Stunde in diesem Fall bezahlt werden. Bitte schreiben Sie uns kurz eine
                  E-Mail oder kontaktieren Sie Ihren Trainer direkt – gemeinsam finden wir
                  eine Lösung.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <a
                    href={mailtoHref}
                    style={{
                      display: "block",
                      background: "#ef4444",
                      color: "white",
                      borderRadius: 8,
                      padding: "13px 28px",
                      fontWeight: 600,
                      fontSize: 15,
                      textDecoration: "none",
                    }}
                  >
                    Kurzfristig per E-Mail absagen
                  </a>
                  <a
                    href={`tel:${telefonAnzeige.replace(/\s/g, "")}`}
                    style={{
                      display: "block",
                      background: "white",
                      color: "#ef4444",
                      border: "1.5px solid #ef4444",
                      borderRadius: 8,
                      padding: "12px 28px",
                      fontWeight: 600,
                      fontSize: 15,
                      textDecoration: "none",
                    }}
                  >
                    {telefonLabel} anrufen: {telefonAnzeige}
                  </a>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: "#16a34a", fontSize: 13, marginBottom: 16 }}>
                  Kostenfreie Absage möglich – Ihr Termin liegt mehr als 24 Stunden in der Zukunft.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <button
                    onClick={handleAbsage}
                    disabled={submitting}
                    style={{
                      background: "#171717",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "12px 28px",
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: submitting ? "wait" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting ? "Wird abgesagt..." : "Ja, kostenfrei absagen"}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <div style={{ marginTop: 32, fontSize: 13, color: "#9ca3af" }}>
          Tennisschule A bis Z
        </div>
      </div>
    </div>
  );
}
