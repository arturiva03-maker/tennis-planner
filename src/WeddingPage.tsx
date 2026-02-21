import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";

type SpontaneStundeBuchung = {
  name: string;
  email: string;
  telefon?: string;
  gebuchtAm: string;
};

type SpontaneStunde = {
  id: string;
  datum: string;
  uhrzeitVon: string;
  uhrzeitBis: string;
  trainerId: string;
  trainerName?: string;
  tarifId?: string;
  customPreisProStunde?: number;
  status: "offen" | "gebucht";
  anlage: "Wedding" | "Britz";
  veroeffentlicht: boolean;
  buchung?: SpontaneStundeBuchung;
};

const WEDDING_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

function startOfWeekISO(dateISO: string) {
  const d = new Date(dateISO + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISO(dateISO: string, days: number) {
  const d = new Date(dateISO + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WeddingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);

  // Spontane Stunden Buchung
  const [spontaneStunden, setSpontaneStunden] = useState<SpontaneStunde[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(todayISO()));
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SpontaneStunde | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingTelefon, setBookingTelefon] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const fetchSpontaneStunden = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const weekEnd = addDaysISO(weekStart, 6);
      const { data, error } = await supabase
        .from("spontane_stunden")
        .select("*")
        .eq("account_id", WEDDING_ACCOUNT_ID)
        .eq("anlage", "Wedding")
        .eq("veroeffentlicht", true)
        .eq("status", "offen")
        .gte("datum", weekStart)
        .lte("datum", weekEnd)
        .order("datum", { ascending: true })
        .order("uhrzeit_von", { ascending: true });

      if (error) {
        console.error("Error fetching slots:", error);
        return;
      }

      const mapped: SpontaneStunde[] = (data || []).map((row: {
        id: string;
        datum: string;
        uhrzeit_von: string;
        uhrzeit_bis: string;
        trainer_id: string;
        tarif_id?: string;
        custom_preis_pro_stunde?: number;
        status: string;
        anlage: string;
        veroeffentlicht: boolean;
        buchung?: SpontaneStundeBuchung;
      }) => ({
        id: row.id,
        datum: row.datum,
        uhrzeitVon: row.uhrzeit_von,
        uhrzeitBis: row.uhrzeit_bis,
        trainerId: row.trainer_id,
        tarifId: row.tarif_id,
        customPreisProStunde: row.custom_preis_pro_stunde,
        status: row.status as "offen" | "gebucht",
        anlage: row.anlage as "Wedding" | "Britz",
        veroeffentlicht: row.veroeffentlicht,
        buchung: row.buchung,
      }));
      setSpontaneStunden(mapped);
    } catch (err) {
      console.error("Error fetching slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, [weekStart]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchSpontaneStunden();
  }, [fetchSpontaneStunden]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const openBookingModal = (slot: SpontaneStunde) => {
    setSelectedSlot(slot);
    setBookingName("");
    setBookingEmail("");
    setBookingTelefon("");
    setBookingError(null);
    setBookingSuccess(false);
    setShowBookingModal(true);
  };

  const submitBooking = async () => {
    if (!selectedSlot) return;

    const name = bookingName.trim();
    const email = bookingEmail.trim();
    const telefon = bookingTelefon.trim();

    if (!name) {
      setBookingError("Bitte geben Sie Ihren Namen ein.");
      return;
    }
    if (!email || !email.includes("@")) {
      setBookingError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      const buchung: SpontaneStundeBuchung = {
        name,
        email,
        telefon: telefon || undefined,
        gebuchtAm: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("spontane_stunden")
        .update({
          status: "gebucht",
          buchung,
        })
        .eq("id", selectedSlot.id)
        .eq("status", "offen");

      if (error) {
        console.error("Booking error:", error);
        setBookingError("Dieser Termin ist leider nicht mehr verfügbar.");
        return;
      }

      // Send confirmation email to customer
      const datumFormatted = new Date(selectedSlot.datum + "T12:00:00").toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      const preisHtml = selectedSlot.customPreisProStunde
        ? `<br><strong>Preis:</strong> ${selectedSlot.customPreisProStunde.toFixed(2).replace(".", ",")} EUR`
        : "";

      const confirmationHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1b471b;">Buchungsbestätigung</h2>
    <p>Hallo ${name},</p>
    <p>Ihre spontane Trainingsstunde wurde erfolgreich gebucht!</p>
    <div style="background: #f6f6f6; padding: 16px; border-left: 4px solid #1b471b; margin: 20px 0;">
      <strong>Termin:</strong> ${datumFormatted}<br>
      <strong>Uhrzeit:</strong> ${selectedSlot.uhrzeitVon} – ${selectedSlot.uhrzeitBis} Uhr<br>
      <strong>Ort:</strong> BSC Rehberge, Wedding${preisHtml}
    </div>
    <p>Falls Sie Fragen haben, kontaktieren Sie uns unter tennisabisz@gmail.com.</p>
    <p>Sportliche Grüße,<br>Tennisschule A bis Z</p>
  </div>
</body>
</html>`;

      const preisText = selectedSlot.customPreisProStunde
        ? `\nPreis: ${selectedSlot.customPreisProStunde.toFixed(2).replace(".", ",")} EUR`
        : "";

      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [email],
            subject: `Buchungsbestätigung – ${datumFormatted}`,
            body: `Hallo ${name},\n\nIhre spontane Trainingsstunde wurde erfolgreich gebucht!\n\nTermin: ${datumFormatted}\nUhrzeit: ${selectedSlot.uhrzeitVon} – ${selectedSlot.uhrzeitBis} Uhr\nOrt: BSC Rehberge, Wedding${preisText}\n\nFalls Sie Fragen haben, kontaktieren Sie uns unter tennisabisz@gmail.com.\n\nSportliche Grüße,\nTennisschule A bis Z`,
            html: confirmationHtml,
            fromName: "Tennisschule A bis Z",
          }),
        });
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }

      // Send notification to admin
      const adminHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1b471b;">Neue Spontanbuchung</h2>
    <div style="background: #f6f6f6; padding: 16px; border-left: 4px solid #1b471b; margin: 20px 0;">
      <strong>Name:</strong> ${name}<br>
      <strong>E-Mail:</strong> ${email}<br>
      ${telefon ? `<strong>Telefon:</strong> ${telefon}<br>` : ""}
      <hr style="border: none; border-top: 1px solid #ddd; margin: 12px 0;">
      <strong>Termin:</strong> ${datumFormatted}<br>
      <strong>Uhrzeit:</strong> ${selectedSlot.uhrzeitVon} – ${selectedSlot.uhrzeitBis} Uhr<br>
      <strong>Anlage:</strong> ${selectedSlot.anlage}${selectedSlot.customPreisProStunde ? `<br><strong>Preis:</strong> ${selectedSlot.customPreisProStunde.toFixed(2).replace(".", ",")} EUR` : ""}
    </div>
  </div>
</body>
</html>`;

      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: ["tennisabisz@gmail.com"],
            subject: `Neue Spontanbuchung: ${name} – ${datumFormatted}`,
            body: `Neue Spontanbuchung!\n\nName: ${name}\nE-Mail: ${email}${telefon ? `\nTelefon: ${telefon}` : ""}\n\nTermin: ${datumFormatted}\nUhrzeit: ${selectedSlot.uhrzeitVon} – ${selectedSlot.uhrzeitBis} Uhr\nAnlage: ${selectedSlot.anlage}${preisText}`,
            html: adminHtml,
            fromName: "Tennisschule A bis Z",
          }),
        });
      } catch (emailErr) {
        console.error("Admin email error:", emailErr);
      }

      setBookingSuccess(true);
      setSpontaneStunden((prev) => prev.filter((s) => s.id !== selectedSlot.id));
    } catch (err) {
      console.error("Booking error:", err);
      setBookingError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const slotsByDate = spontaneStunden.reduce((acc, slot) => {
    if (!acc[slot.datum]) acc[slot.datum] = [];
    acc[slot.datum].push(slot);
    return acc;
  }, {} as Record<string, SpontaneStunde[]>);

  // Vereinsfarben BSC Rehberge
  const colors = {
    primary: "#1b471b",
    primaryLight: "#418231",
    white: "#ffffff",
    bgLight: "#f6f6f6",
    text: "#333333",
    textMuted: "#666666",
    border: "#d2d2d2",
  };


  const trainers = [
    {
      name: "Zlatan Palazov",
      qualification: "B-Lizenz Leistungssport | Organisator",
      bio: "Ehemaliger Profispieler. Trainiert Kinder, Jugendliche und Erwachsene.",
    },
    {
      name: "Artur Ivanenko",
      qualification: "B-Lizenz Leistungssport | Organisator",
      bio: "Spielt seit der Kindheit Tennis. Trainiert im Breiten- und Leistungssport.",
    },
    {
      name: "Joshua Kugel",
      qualification: "B-Lizenz Leistungssport",
      bio: "",
    },
    {
      name: "Jesper Fremuth",
      qualification: "Trainer",
      bio: "",
      image: "/jesper-fremuth.jpg",
      imageZoom: 1.3,
    },
    {
      name: "Marc Erdogan",
      qualification: "C-Lizenz Leistungssport",
      bio: "Trainiert Spieler aller Alters- und Leistungsstufen. Fokus auf Technik, Taktik und mentale Stärke.",
      image: "/marc-erdogan.jpg",
      imagePosition: "10% center",
    },
    {
      name: "Konstantin Klein",
      qualification: "C-Lizenz Leistungssport (in Ausbildung)",
      bio: "",
      image: "/konstantin-klein.jpg",
      imageZoom: 1.2,
    },
    {
      name: "Sascha Ivanenko",
      qualification: "Trainer",
      bio: "30 Jahre Erfahrung im Training seiner Söhne – bis in den Berliner und deutschen Spitzensport.",
      image: "/sascha-ivanenko.jpg",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: colors.white,
      fontFamily: "'PT Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      color: colors.text,
    }}>
      {/* Navigation */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "all 0.3s ease",
          background: scrolled ? colors.white : "transparent",
          boxShadow: scrolled ? "0 2px 10px rgba(0,0,0,0.1)" : "none",
          borderBottom: scrolled ? `1px solid ${colors.border}` : "none",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 70 }}>
            <span style={{
              fontWeight: 700,
              fontSize: 18,
              color: scrolled ? colors.primary : "#fff",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Tennisschule A bis Z
            </span>

            {/* Desktop Menu */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="desktop-menu">
              {["Aktuelles", "Spontan", "Trainer", "Kontakt"].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: scrolled ? colors.text : "rgba(255,255,255,0.95)",
                    transition: "color 0.2s",
                    padding: "8px 0",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = colors.primaryLight}
                  onMouseLeave={(e) => e.currentTarget.style.color = scrolled ? colors.text : "rgba(255,255,255,0.95)"}
                >
                  {item}
                </button>
              ))}
              <a
                href="https://tennistrainer-app.de/anmeldung-wedding?a=9168a8e1-d237-4316-90fe-f0e7dfb665b9"
                style={{
                  background: colors.primary,
                  color: "#fff",
                  padding: "11px 23px",
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: "none",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Training buchen
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 8,
                color: scrolled ? colors.text : "#fff",
              }}
              className="mobile-menu-btn"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div style={{
              background: colors.white,
              padding: 16,
              borderTop: `1px solid ${colors.border}`,
            }}>
              {["Aktuelles", "Spontan", "Trainer", "Kontakt"].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    color: colors.text,
                    padding: "12px 0",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {item}
                </button>
              ))}
              <a
                href="https://tennistrainer-app.de/anmeldung-wedding?a=9168a8e1-d237-4316-90fe-f0e7dfb665b9"
                style={{
                  display: "block",
                  background: colors.primary,
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  textAlign: "center",
                  marginTop: 16,
                }}
              >
                Training buchen
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <header
        style={{
          position: "relative",
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: colors.primary,
        }}
      >
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "100px 24px 60px" }}>
          <h1
            style={{
              fontSize: "clamp(32px, 6vw, 56px)",
              fontWeight: 700,
              color: "#fff",
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Tennisschule A bis Z
          </h1>
          <p style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.9)",
            marginBottom: 8,
            fontWeight: 400,
          }}>
            Standort Wedding · BSC Rehberge
          </p>
          <div style={{
            width: 60,
            height: 3,
            background: "rgba(255,255,255,0.5)",
            margin: "24px auto 0",
          }} />
        </div>
      </header>

      {/* Aktuelles Section */}
      <section id="aktuelles" style={{ padding: "80px 24px", background: colors.white }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.primary,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}>
              Aktuelles
            </h2>
            <div style={{
              width: 50,
              height: 3,
              background: colors.primary,
              margin: "16px auto 0",
            }} />
          </div>

          <div
            style={{
              background: colors.bgLight,
              padding: 32,
              borderLeft: `4px solid ${colors.primary}`,
              textAlign: "center",
            }}
          >
            <h3 style={{ fontSize: 22, fontWeight: 700, color: colors.text, marginBottom: 16 }}>
              Anmeldung für das Sommertraining läuft
            </h3>
            <p style={{ fontSize: 15, color: colors.textMuted, lineHeight: 1.6, marginBottom: 24 }}>
              Sichern Sie sich jetzt Ihren Platz für die Sommersaison!
            </p>
            <a
              href="https://tennistrainer-app.de/anmeldung-wedding?a=9168a8e1-d237-4316-90fe-f0e7dfb665b9"
              style={{
                display: "inline-block",
                background: colors.primary,
                color: "#fff",
                padding: "12px 32px",
                borderRadius: 2,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Jetzt anmelden
            </a>
          </div>
        </div>
      </section>

      {/* Spontane Stunden Buchung Section */}
      <section id="spontan" style={{ padding: "80px 24px", background: colors.bgLight }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.primary,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}>
              Spontane Stunden
            </h2>
            <div style={{
              width: 50,
              height: 3,
              background: colors.primary,
              margin: "16px auto 0",
            }} />
            <p style={{ marginTop: 20, fontSize: 15, color: colors.textMuted }}>
              Buchen Sie eine freie Trainingsstunde direkt online
            </p>
          </div>

          {/* Week Navigation */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            background: colors.white,
            padding: "12px 20px",
            border: `1px solid ${colors.border}`,
          }}>
            <button
              onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 24,
                color: colors.primary,
                padding: "4px 12px",
              }}
            >
              &larr;
            </button>
            <span style={{ fontWeight: 700, color: colors.text }}>
              {(() => {
                const start = new Date(weekStart + "T12:00:00");
                const end = new Date(addDaysISO(weekStart, 6) + "T12:00:00");
                const months = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
                return `${start.getDate()}. ${months[start.getMonth()]} – ${end.getDate()}. ${months[end.getMonth()]} ${end.getFullYear()}`;
              })()}
            </span>
            <button
              onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 24,
                color: colors.primary,
                padding: "4px 12px",
              }}
            >
              &rarr;
            </button>
          </div>

          {/* Week Calendar */}
          {loadingSlots ? (
            <div style={{ textAlign: "center", padding: 40, color: colors.textMuted }}>
              Lade verfügbare Termine...
            </div>
          ) : spontaneStunden.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: 40,
              background: colors.white,
              border: `1px solid ${colors.border}`,
              color: colors.textMuted,
            }}>
              In dieser Woche sind keine spontanen Stunden verfügbar.
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 12,
            }}>
              {weekDays.map((day) => {
                const slots = slotsByDate[day] || [];
                const dayDate = new Date(day + "T12:00:00");
                const weekDayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
                const isPast = day < todayISO();

                return (
                  <div
                    key={day}
                    style={{
                      background: colors.white,
                      border: `1px solid ${colors.border}`,
                      opacity: isPast ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      padding: "10px 12px",
                      background: colors.primary,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      textAlign: "center",
                    }}>
                      {weekDayNames[dayDate.getDay()]} {dayDate.getDate()}.{dayDate.getMonth() + 1}.
                    </div>
                    <div style={{ padding: 8, minHeight: 80 }}>
                      {slots.length === 0 ? (
                        <div style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", paddingTop: 20 }}>
                          –
                        </div>
                      ) : (
                        slots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => !isPast && openBookingModal(slot)}
                            disabled={isPast}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "8px 10px",
                              marginBottom: 6,
                              background: isPast ? colors.bgLight : colors.primary,
                              color: "#fff",
                              border: "none",
                              borderRadius: 2,
                              cursor: isPast ? "not-allowed" : "pointer",
                              fontWeight: 600,
                              fontSize: 13,
                              textAlign: "center",
                            }}
                          >
                            {slot.uhrzeitVon.slice(0, 5)} – {slot.uhrzeitBis.slice(0, 5)}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Trainer Section */}
      <section id="trainer" style={{ padding: "80px 24px", background: colors.white }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.primary,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}>
              Unsere Trainer
            </h2>
            <div style={{
              width: 50,
              height: 3,
              background: colors.primary,
              margin: "16px auto 0",
            }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {trainers.map((trainer, i) => (
              <div
                key={i}
                style={{
                  background: colors.white,
                  border: `1px solid ${colors.border}`,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    aspectRatio: "1",
                    background: colors.bgLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderBottom: `1px solid ${colors.border}`,
                    overflow: "hidden",
                  }}
                >
                  {"image" in trainer && trainer.image ? (
                    <img
                      src={trainer.image}
                      alt={trainer.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: ("imagePosition" in trainer && trainer.imagePosition) || "center",
                        transform: "imageZoom" in trainer ? `scale(${trainer.imageZoom})` : undefined,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 36, fontWeight: 700, color: colors.border }}>
                      {trainer.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  )}
                </div>
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 4 }}>
                    {trainer.name}
                  </h3>
                  <p style={{ fontSize: 13, color: colors.primary, marginBottom: 8, fontWeight: 700 }}>
                    {trainer.qualification}
                  </p>
                  {trainer.bio && (
                    <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5 }}>
                      {trainer.bio}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kontakt Section */}
      <section id="kontakt" style={{ padding: "80px 24px", background: colors.white }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{
            fontSize: 28,
            fontWeight: 700,
            color: colors.primary,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}>
            Kontakt
          </h2>
          <div style={{
            width: 50,
            height: 3,
            background: colors.primary,
            margin: "16px auto 32px",
          }} />

          <p style={{ fontSize: 16, color: colors.textMuted, lineHeight: 1.7, marginBottom: 32 }}>
            Sie möchten ein Training buchen oder haben Fragen? Wir antworten meistens innerhalb von 24 Stunden.
          </p>

          <div style={{
            background: colors.bgLight,
            padding: 32,
            marginBottom: 32,
            borderLeft: `4px solid ${colors.primary}`,
          }}>
            <div style={{ fontSize: 14, color: colors.textMuted, marginBottom: 8 }}>E-Mail</div>
            <a
              href="mailto:tennisabisz@gmail.com"
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: colors.primary,
                textDecoration: "none",
              }}
            >
              tennisabisz@gmail.com
            </a>
          </div>

          <a
            href="https://tennistrainer-app.de/anmeldung-wedding?a=9168a8e1-d237-4316-90fe-f0e7dfb665b9"
            style={{
              display: "inline-block",
              background: colors.primary,
              color: "#fff",
              padding: "14px 40px",
              borderRadius: 2,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Training buchen
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: colors.primary, color: "#fff", padding: "48px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 32, marginBottom: 32 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 16, textTransform: "uppercase" }}>
                Tennisschule A bis Z
              </span>
              <p style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                Standort Wedding<br />
                BSC Rehberge
              </p>
            </div>

            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, textTransform: "uppercase" }}>Navigation</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Aktuelles", "Spontan", "Trainer", "Kontakt"].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item.toLowerCase())}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.7)",
                      fontSize: 14,
                      textAlign: "left",
                      padding: 0,
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, textTransform: "uppercase" }}>Rechtliches</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => setShowImpressum(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 14,
                    textAlign: "left",
                    padding: 0,
                  }}
                >
                  Impressum
                </button>
                <button
                  onClick={() => setShowDatenschutz(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 14,
                    textAlign: "left",
                    padding: 0,
                  }}
                >
                  Datenschutz
                </button>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 24, textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            <p>&copy; 2025 Tennisschule A bis Z. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>

      {/* Impressum Modal */}
      {showImpressum && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setShowImpressum(false)}
        >
          <div
            style={{
              background: "#fff",
              maxWidth: 600,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>Impressum</h2>
              <button
                onClick={() => setShowImpressum(false)}
                style={{
                  width: 36,
                  height: 36,
                  background: colors.bgLight,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.8 }}>
              <p><strong>Angaben gemäß § 5 TMG</strong></p>
              <p>Tennisschule Zlatan Palazov und Artur Ivanenko GbR<br />
              Ricarda-Huch-Straße 40<br />
              14480 Potsdam</p>
              <p style={{ marginTop: 16 }}><strong>Vertreten durch</strong></p>
              <p>Zlatan Palazov (Gesellschafter)<br />
              Artur Ivanenko (Gesellschafter)</p>
              <p style={{ marginTop: 16 }}><strong>Kontakt</strong></p>
              <p>E-Mail: tennisabisz@gmail.com</p>
            </div>
          </div>
        </div>
      )}

      {/* Datenschutz Modal */}
      {showDatenschutz && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setShowDatenschutz(false)}
        >
          <div
            style={{
              background: "#fff",
              maxWidth: 600,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>Datenschutzerklärung</h2>
              <button
                onClick={() => setShowDatenschutz(false)}
                style={{
                  width: 36,
                  height: 36,
                  background: colors.bgLight,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.8 }}>
              <p><strong>1. Verantwortlicher</strong></p>
              <p>Tennisschule Zlatan Palazov und Artur Ivanenko GbR<br />
              Ricarda-Huch-Straße 40, 14480 Potsdam<br />
              E-Mail: tennisabisz@gmail.com</p>
              <p style={{ marginTop: 16 }}><strong>2. Ihre Rechte</strong></p>
              <p>Sie haben jederzeit das Recht auf Auskunft, Berichtigung oder Löschung Ihrer Daten.</p>
              <p style={{ marginTop: 16 }}><strong>3. Hosting</strong></p>
              <p>Diese Website wird extern gehostet. Erfasste Daten werden auf den Servern des Hosters gespeichert.</p>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => !bookingSubmitting && setShowBookingModal(false)}
        >
          <div
            style={{
              background: "#fff",
              maxWidth: 500,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {bookingSuccess ? (
              <>
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "#22c55e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}>
                    <span style={{ color: "#fff", fontSize: 30 }}>✓</span>
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.primary, marginBottom: 12 }}>
                    Buchung erfolgreich!
                  </h2>
                  <p style={{ color: colors.textMuted, marginBottom: 20 }}>
                    Sie erhalten in Kürze eine Bestätigungs-E-Mail.
                  </p>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    style={{
                      background: colors.primary,
                      color: "#fff",
                      border: "none",
                      padding: "12px 32px",
                      borderRadius: 2,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                    }}
                  >
                    Schließen
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: colors.primary }}>Termin buchen</h2>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    disabled={bookingSubmitting}
                    style={{
                      width: 36,
                      height: 36,
                      background: colors.bgLight,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                    }}
                  >
                    &times;
                  </button>
                </div>

                <div style={{
                  background: colors.bgLight,
                  padding: 16,
                  borderLeft: `4px solid ${colors.primary}`,
                  marginBottom: 24,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {new Date(selectedSlot.datum + "T12:00:00").toLocaleDateString("de-DE", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                  </div>
                  <div style={{ color: colors.textMuted }}>
                    {selectedSlot.uhrzeitVon.slice(0, 5)} – {selectedSlot.uhrzeitBis.slice(0, 5)} Uhr
                  </div>
                  {selectedSlot.customPreisProStunde && (
                    <div style={{ marginTop: 8, fontWeight: 700, color: colors.primary, fontSize: 18 }}>
                      {selectedSlot.customPreisProStunde.toFixed(2).replace(".", ",")} EUR
                    </div>
                  )}
                </div>

                {bookingError && (
                  <div style={{
                    background: "#fee2e2",
                    color: "#dc2626",
                    padding: 12,
                    borderRadius: 4,
                    marginBottom: 16,
                    fontSize: 14,
                  }}>
                    {bookingError}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={bookingName}
                    onChange={(e) => setBookingName(e.target.value)}
                    placeholder="Ihr Name"
                    disabled={bookingSubmitting}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 2,
                      fontSize: 15,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={bookingEmail}
                    onChange={(e) => setBookingEmail(e.target.value)}
                    placeholder="ihre@email.de"
                    disabled={bookingSubmitting}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 2,
                      fontSize: 15,
                    }}
                  />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                    Telefon (optional)
                  </label>
                  <input
                    type="tel"
                    value={bookingTelefon}
                    onChange={(e) => setBookingTelefon(e.target.value)}
                    placeholder="Ihre Telefonnummer"
                    disabled={bookingSubmitting}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 2,
                      fontSize: 15,
                    }}
                  />
                </div>

                <button
                  onClick={submitBooking}
                  disabled={bookingSubmitting}
                  style={{
                    width: "100%",
                    background: bookingSubmitting ? colors.textMuted : colors.primary,
                    color: "#fff",
                    border: "none",
                    padding: "14px 24px",
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: bookingSubmitting ? "not-allowed" : "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {bookingSubmitting ? "Wird gebucht..." : "Jetzt buchen"}
                </button>

                <p style={{ marginTop: 16, fontSize: 12, color: colors.textMuted, textAlign: "center" }}>
                  Mit der Buchung akzeptieren Sie unsere Datenschutzerklärung.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-menu {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
