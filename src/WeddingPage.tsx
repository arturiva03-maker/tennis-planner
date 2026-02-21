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
<head>
  <meta charset="UTF-8">
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
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Buchungsbestätigung</h1>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: inline-block; line-height: 64px; text-align: center;">
                <span style="color: #ffffff; font-size: 32px;">✓</span>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h2 style="margin: 0 0 8px; color: #333333; font-size: 22px; font-weight: 600;">Hallo ${name}!</h2>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 1.5;">Ihre Trainingsstunde wurde erfolgreich gebucht.</p>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8faf8; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Ihre Termindetails</p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 32px; font-size: 18px;">📅</td>
                              <td style="color: #333333; font-size: 15px; font-weight: 600;">${datumFormatted}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 32px; font-size: 18px;">🕐</td>
                              <td style="color: #333333; font-size: 15px;">${selectedSlot.uhrzeitVon.slice(0, 5)} – ${selectedSlot.uhrzeitBis.slice(0, 5)} Uhr</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;${selectedSlot.customPreisProStunde ? ' border-bottom: 1px solid #e5e7eb;' : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 32px; font-size: 18px;">📍</td>
                              <td style="color: #333333; font-size: 15px;">BSC Rehberge, Wedding</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${selectedSlot.customPreisProStunde ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 32px; font-size: 18px;">💰</td>
                              <td style="color: #1b471b; font-size: 16px; font-weight: 700;">${selectedSlot.customPreisProStunde.toFixed(2).replace(".", ",")} EUR</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contact Info -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: #666666; font-size: 14px; line-height: 1.6;">Bei Fragen erreichen Sie uns unter:</p>
              <a href="mailto:tennisabisz@gmail.com" style="color: #1b471b; font-weight: 600; text-decoration: none;">tennisabisz@gmail.com</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8faf8; padding: 24px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px; color: #333333; font-size: 14px; font-weight: 600;">Sportliche Grüße</p>
              <p style="margin: 0; color: #1b471b; font-size: 15px; font-weight: 700;">Tennisschule A bis Z</p>
              <p style="margin: 12px 0 0; color: #999999; font-size: 12px;">Standort Wedding · BSC Rehberge</p>
            </td>
          </tr>
        </table>

        <!-- Footer Text -->
        <p style="margin: 24px 0 0; color: #999999; font-size: 12px; text-align: center;">
          © 2025 Tennisschule A bis Z. Alle Rechte vorbehalten.
        </p>
      </td>
    </tr>
  </table>
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
<head>
  <meta charset="UTF-8">
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
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">🎾 Neue Spontanbuchung</h1>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Kundendaten</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8faf8; border-radius: 8px; border: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Name:</span>
                          <span style="color: #333333; font-size: 15px; font-weight: 600; margin-left: 8px;">${name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">E-Mail:</span>
                          <a href="mailto:${email}" style="color: #1b471b; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      ${telefon ? `
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: #666666; font-size: 13px;">Telefon:</span>
                          <a href="tel:${telefon}" style="color: #1b471b; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${telefon}</a>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <p style="margin: 0 0 16px; color: #1b471b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Termindetails</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff8e6; border-radius: 8px; border: 1px solid #fcd34d;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 16px; margin-right: 8px;">📅</span>
                          <span style="color: #333333; font-size: 15px; font-weight: 600;">${datumFormatted}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 16px; margin-right: 8px;">🕐</span>
                          <span style="color: #333333; font-size: 15px;">${selectedSlot.uhrzeitVon.slice(0, 5)} – ${selectedSlot.uhrzeitBis.slice(0, 5)} Uhr</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 16px; margin-right: 8px;">📍</span>
                          <span style="color: #333333; font-size: 15px;">${selectedSlot.anlage}</span>
                        </td>
                      </tr>
                      ${selectedSlot.customPreisProStunde ? `
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 16px; margin-right: 8px;">💰</span>
                          <span style="color: #1b471b; font-size: 16px; font-weight: 700;">${selectedSlot.customPreisProStunde.toFixed(2).replace(".", ",")} EUR</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Note -->
          <tr>
            <td style="background-color: #f8faf8; padding: 20px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #666666; font-size: 13px;">⚡ Bitte in der App unter "Weiteres → Spontan" in den Kalender übernehmen</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
      image: "/zlatan-palazov.jpg",
      imagePosition: "center 20%",
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

      {/* Spontane Stunden Buchung Section - nur anzeigen wenn Slots vorhanden */}
      {!loadingSlots && spontaneStunden.length > 0 && (
        <section id="spontan" style={{ padding: "60px 24px", background: colors.white }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <p style={{
                fontSize: 12,
                color: colors.primary,
                textTransform: "uppercase",
                letterSpacing: "2px",
                marginBottom: 8,
                fontWeight: 600,
              }}>
                Verfügbare Termine
              </p>
              <h2 style={{
                fontSize: 24,
                fontWeight: 700,
                color: colors.text,
                marginBottom: 8,
              }}>
                Spontane Trainingsstunden
              </h2>
              <p style={{ fontSize: 14, color: colors.textMuted }}>
                Buchen Sie einen freien Termin direkt online
              </p>
            </div>

            {/* Week Navigation */}
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 24,
              marginBottom: 24,
            }}>
              <button
                onClick={() => setWeekStart(addDaysISO(weekStart, -7))}
                style={{
                  background: "none",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  fontSize: 16,
                  color: colors.textMuted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ←
              </button>
              <span style={{ fontWeight: 600, color: colors.text, fontSize: 14 }}>
                {(() => {
                  const start = new Date(weekStart + "T12:00:00");
                  const end = new Date(addDaysISO(weekStart, 6) + "T12:00:00");
                  const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
                  if (start.getMonth() === end.getMonth()) {
                    return `${start.getDate()}. – ${end.getDate()}. ${months[end.getMonth()]} ${end.getFullYear()}`;
                  }
                  return `${start.getDate()}. ${months[start.getMonth()]} – ${end.getDate()}. ${months[end.getMonth()]}`;
                })()}
              </span>
              <button
                onClick={() => setWeekStart(addDaysISO(weekStart, 7))}
                style={{
                  background: "none",
                  border: `1px solid ${colors.border}`,
                  borderRadius: "50%",
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  fontSize: 16,
                  color: colors.textMuted,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                →
              </button>
            </div>

            {/* Slots als Liste statt Grid */}
            <div style={{
              background: colors.bgLight,
              borderRadius: 8,
              padding: 20,
            }}>
              {weekDays.map((day) => {
                const slots = slotsByDate[day] || [];
                const dayDate = new Date(day + "T12:00:00");
                const weekDayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                const isPast = day < todayISO();

                if (slots.length === 0) return null;

                return (
                  <div key={day} style={{ marginBottom: 16 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isPast ? colors.textMuted : colors.text,
                      marginBottom: 8,
                      opacity: isPast ? 0.5 : 1,
                    }}>
                      {weekDayNames[dayDate.getDay()]}, {dayDate.getDate()}.{dayDate.getMonth() + 1}.
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {slots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => !isPast && openBookingModal(slot)}
                          disabled={isPast}
                          style={{
                            padding: "10px 16px",
                            background: isPast ? colors.bgLight : colors.white,
                            color: isPast ? colors.textMuted : colors.text,
                            border: `1px solid ${isPast ? colors.border : colors.primary}`,
                            borderRadius: 6,
                            cursor: isPast ? "not-allowed" : "pointer",
                            fontWeight: 500,
                            fontSize: 14,
                            opacity: isPast ? 0.5 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isPast) {
                              e.currentTarget.style.background = colors.primary;
                              e.currentTarget.style.color = "#fff";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isPast) {
                              e.currentTarget.style.background = colors.white;
                              e.currentTarget.style.color = colors.text;
                            }
                          }}
                        >
                          {slot.uhrzeitVon.slice(0, 5)} – {slot.uhrzeitBis.slice(0, 5)}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {spontaneStunden.length === 0 && (
                <p style={{ textAlign: "center", color: colors.textMuted, fontSize: 14 }}>
                  Diese Woche keine Termine verfügbar
                </p>
              )}
            </div>
          </div>
        </section>
      )}

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
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  boxShadow: "0 8px 24px rgba(34, 197, 94, 0.25)",
                }}>
                  <span style={{ color: "#fff", fontSize: 36, fontWeight: 300 }}>✓</span>
                </div>

                <h2 style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: colors.text,
                  marginBottom: 8,
                }}>
                  Buchung erfolgreich!
                </h2>

                <p style={{
                  color: colors.textMuted,
                  marginBottom: 24,
                  fontSize: 15,
                  lineHeight: 1.5,
                }}>
                  Vielen Dank für Ihre Buchung. Sie erhalten in Kürze eine Bestätigungs-E-Mail an <strong style={{ color: colors.text }}>{bookingEmail}</strong>.
                </p>

                <div style={{
                  background: colors.bgLight,
                  borderRadius: 8,
                  padding: 20,
                  marginBottom: 24,
                  textAlign: "left",
                }}>
                  <div style={{
                    fontSize: 11,
                    color: colors.primary,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 600,
                    marginBottom: 12,
                  }}>
                    Ihre Termindetails
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>📅</span>
                    <span style={{ fontWeight: 600, color: colors.text }}>
                      {new Date(selectedSlot.datum + "T12:00:00").toLocaleDateString("de-DE", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🕐</span>
                    <span style={{ color: colors.text }}>
                      {selectedSlot.uhrzeitVon.slice(0, 5)} – {selectedSlot.uhrzeitBis.slice(0, 5)} Uhr
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 18 }}>📍</span>
                    <span style={{ color: colors.text }}>BSC Rehberge, Wedding</span>
                  </div>
                  {selectedSlot.customPreisProStunde && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: `1px solid ${colors.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}>
                      <span style={{ fontSize: 18 }}>💰</span>
                      <span style={{ fontWeight: 700, color: colors.primary, fontSize: 16 }}>
                        {selectedSlot.customPreisProStunde.toFixed(2).replace(".", ",")} EUR
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowBookingModal(false)}
                  style={{
                    background: colors.primary,
                    color: "#fff",
                    border: "none",
                    padding: "14px 40px",
                    borderRadius: 4,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = colors.primaryLight}
                  onMouseLeave={(e) => e.currentTarget.style.background = colors.primary}
                >
                  Schließen
                </button>
              </div>
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
