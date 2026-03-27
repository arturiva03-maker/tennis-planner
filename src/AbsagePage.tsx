import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function AbsagePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"confirm" | "success" | "error" | "already" | "notfound">("confirm");
  const [slotInfo, setSlotInfo] = useState<{ datum: string; von: string; bis: string; anlage: string; trainingId?: string; buchungEmail?: string; buchungName?: string; accountId?: string; preis?: number } | null>(null);
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
          trainingId: data.training_id ?? undefined,
          buchungEmail: data.buchung?.email ?? undefined,
          buchungName: data.buchung?.name ?? undefined,
          accountId: data.account_id ?? undefined,
          preis: data.custom_preis_pro_stunde ?? undefined,
        });
        setStatus("confirm");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleAbsage() {
    if (!id) return;
    setSubmitting(true);

    try {
      // Status auf "offen" zurücksetzen, Buchung entfernen, wieder veröffentlichen
      const { error } = await supabase
        .from("spontane_stunden")
        .update({
          status: "offen",
          buchung: null,
          veroeffentlicht: true,
        })
        .eq("id", id)
        .eq("status", "gebucht");

      if (error) {
        setStatus("error");
        setSubmitting(false);
        return;
      }

      // Verknüpftes Training aus dem Kalender (account_state) löschen
      if (slotInfo?.trainingId && slotInfo?.accountId) {
        try {
          const { data: stateRow } = await supabase
            .from("account_state")
            .select("data, updated_at")
            .eq("account_id", slotInfo.accountId)
            .single();

          if (stateRow?.data) {
            const appState = stateRow.data as { trainings?: { id: string }[] };
            if (appState.trainings) {
              appState.trainings = appState.trainings.filter(
                (t) => t.id !== slotInfo.trainingId
              );
              const updatedAt = new Date().toISOString();
              await supabase.from("account_state").upsert({
                account_id: slotInfo.accountId,
                data: appState,
                updated_at: updatedAt,
              });
            }
          }
        } catch {
          // Training-Löschung nicht blockieren
        }
      }

      // Benachrichtigung an tennisabisz@gmail.com senden
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
            to: ["tennisabisz@gmail.com"],
            subject: `Absage: Kurzfristiges Training ${datumFormatted}`,
            body: `Eine kurzfristige Trainingsstunde wurde abgesagt.\n\nTermin: ${datumFormatted}\nUhrzeit: ${zeitInfo}\nAnlage: ${slotInfo?.anlage ?? ""}\n\nDie Stunde ist jetzt wieder online buchbar.`,
            html: `<p>Eine kurzfristige Trainingsstunde wurde abgesagt.</p><p><strong>Termin:</strong> ${datumFormatted}<br><strong>Uhrzeit:</strong> ${zeitInfo}<br><strong>Anlage:</strong> ${slotInfo?.anlage ?? ""}</p><p>Die Stunde ist jetzt wieder online buchbar.</p>`,
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
              body: `Hallo ${slotInfo.buchungName ?? ""},\n\nIhre Buchung wurde erfolgreich storniert.\n\nTermin: ${datumFormatted}\nUhrzeit: ${zeitInfo}\nAnlage: ${slotInfo.anlage}${slotInfo.preis ? `\nPreis: ${slotInfo.preis.toFixed(2).replace(".", ",")} EUR` : ""}\n\nBei Fragen erreichen Sie uns unter tennisabisz@gmail.com.\n\nSportliche Grüße,\nTennisschule A bis Z`,
              html: `<p>Hallo ${slotInfo.buchungName ?? ""},</p><p>Ihre Buchung wurde erfolgreich storniert.</p><p><strong>Termin:</strong> ${datumFormatted}<br><strong>Uhrzeit:</strong> ${zeitInfo}<br><strong>Anlage:</strong> ${slotInfo.anlage}${slotInfo.preis ? `<br><strong>Preis:</strong> ${slotInfo.preis.toFixed(2).replace(".", ",")} EUR` : ""}</p><p style="margin: 0 0 8px; color: #666666; font-size: 14px;">Bei Fragen erreichen Sie uns unter <a href="mailto:tennisabisz@gmail.com" style="color: #1b5e20; font-weight: 600; text-decoration: none;">tennisabisz@gmail.com</a></p><div style="background-color: #f8faf8; padding: 24px 40px; border-top: 1px solid #e5e7eb; margin-top: 24px;"><p style="margin: 0 0 4px; color: #333333; font-size: 14px; font-weight: 600;">Sportliche Grüße</p><p style="margin: 0; color: #1b471b; font-size: 15px; font-weight: 700;">Tennisschule A bis Z</p><p style="margin: 12px 0 0; color: #999999; font-size: 12px;">${slotInfo.anlage === "Britz" ? "Standort Britz · TC Blau-Weiß Britz" : "Standort Wedding · BSC Rehberge"}</p></div>`,
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
              Ihre Buchung für <strong>{datumFormatted}</strong> ({slotInfo?.von} – {slotInfo?.bis} Uhr) wurde storniert.
              Die Tennisschule wurde benachrichtigt.
            </p>
          </>
        ) : status === "error" ? (
          <>
            <h2 style={{ marginBottom: 8, color: "#ef4444" }}>Fehler</h2>
            <p style={{ color: "#6b7280" }}>Die Absage konnte nicht verarbeitet werden. Bitte kontaktieren Sie uns unter tennisabisz@gmail.com.</p>
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 8 }}>Termin absagen?</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              Möchten Sie Ihre Buchung für folgenden Termin wirklich absagen?
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
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={handleAbsage}
                disabled={submitting}
                style={{
                  background: "#ef4444",
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
                {submitting ? "Wird abgesagt..." : "Ja, absagen"}
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 32, fontSize: 13, color: "#9ca3af" }}>
          Tennisschule A bis Z
        </div>
      </div>
    </div>
  );
}
