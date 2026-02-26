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

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthStart(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}

function getMonthEnd(year: number, month: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekDay = (firstDay.getDay() + 6) % 7; // Monday = 0
  const days: (string | null)[] = [];

  // Add empty cells for days before the 1st
  for (let i = 0; i < startWeekDay; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }

  return days;
}

export default function WeddingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);

  // Spontane Stunden Buchung
  const [spontaneStunden, setSpontaneStunden] = useState<SpontaneStunde[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [hasAnySlots, setHasAnySlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SpontaneStunde | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingTelefon, setBookingTelefon] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [expandedAngebot, setExpandedAngebot] = useState<number | null>(null);

  const fetchSpontaneStunden = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const monthStart = getMonthStart(currentMonth.year, currentMonth.month);
      const monthEnd = getMonthEnd(currentMonth.year, currentMonth.month);
      const { data, error } = await supabase
        .from("spontane_stunden")
        .select("*")
        .eq("account_id", WEDDING_ACCOUNT_ID)
        .eq("anlage", "Wedding")
        .eq("veroeffentlicht", true)
        .eq("status", "offen")
        .gte("datum", monthStart)
        .lte("datum", monthEnd)
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
  }, [currentMonth]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchSpontaneStunden();
  }, [fetchSpontaneStunden]);

  // Check if there are ANY slots available (for showing/hiding the section)
  useEffect(() => {
    async function checkAnySlots() {
      const { data } = await supabase
        .from("spontane_stunden")
        .select("id")
        .eq("account_id", WEDDING_ACCOUNT_ID)
        .eq("anlage", "Wedding")
        .eq("veroeffentlicht", true)
        .eq("status", "offen")
        .gte("datum", todayISO())
        .limit(1);
      setHasAnySlots((data || []).length > 0);
    }
    checkAnySlots();
  }, []);

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
          © 2026 Tennisschule A bis Z. Alle Rechte vorbehalten.
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

  const calendarDays = getCalendarDays(currentMonth.year, currentMonth.month);
  const slotsByDate = spontaneStunden.reduce((acc, slot) => {
    if (!acc[slot.datum]) acc[slot.datum] = [];
    acc[slot.datum].push(slot);
    return acc;
  }, {} as Record<string, SpontaneStunde[]>);
  const selectedDateSlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const weekDayLabels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

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
      imagePosition: "70% 20%",
    },
    {
      name: "Artur Ivanenko",
      qualification: "B-Lizenz Leistungssport | Organisator",
      bio: "Spielt seit der Kindheit Tennis. Trainiert im Breiten- und Leistungssport.",
      image: "/artur-ivanenko.jpg",
    },
    {
      name: "Joshua Kugel",
      qualification: "B-Lizenz Leistungssport",
      bio: "Langjährige Erfahrung als Trainer. Spielt in der höchsten Berliner Liga.",
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
      bio: "Als Kind und Jugendlicher täglich auf dem Platz. Viel Spaß am Training mit Erwachsenen und Kindern.",
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
              {["Angebot", "Aktuelles", ...(hasAnySlots ? ["Spontan"] : []), "Trainer", "Kontakt"].map((item) => (
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
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
                {/* Animated Arrow with Text */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  animation: "bounce-right 1s ease-in-out infinite",
                }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: scrolled ? "#dc2626" : "#fca5a5",
                    whiteSpace: "nowrap",
                  }}>
                    Anmeldung Sommertraining bis 10.3.
                  </span>
                  <span style={{
                    fontSize: 20,
                    color: scrolled ? "#dc2626" : "#fca5a5",
                  }}>
                    →
                  </span>
                </div>
                <a
                  href="/anmeldung-wedding"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "#fff",
                    padding: "11px 23px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  Training buchen
                </a>
              </div>
            </div>

            <style>
              {`
                @keyframes bounce-right {
                  0%, 100% { transform: translateX(0); }
                  50% { transform: translateX(6px); }
                }
              `}
            </style>

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
              {["Angebot", "Aktuelles", ...(hasAnySlots ? ["Spontan"] : []), "Trainer", "Kontakt"].map((item) => (
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
                href="https://tennistrainer-app.de/anmeldung-wedding"
                style={{
                  display: "block",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  textAlign: "center",
                  marginTop: 16,
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
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
          minHeight: "70vh",
          display: "flex",
          alignItems: "center",
          background: `linear-gradient(135deg, #0f2f1a 0%, ${colors.primary} 50%, #1a3d24 100%)`,
          overflow: "hidden",
        }}
      >
        {/* Tennis Court Lines Background */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage: `
            linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.5) 49%, rgba(255,255,255,0.5) 51%, transparent 51%),
            linear-gradient(0deg, transparent 49%, rgba(255,255,255,0.5) 49%, rgba(255,255,255,0.5) 51%, transparent 51%),
            linear-gradient(90deg, transparent 24%, rgba(255,255,255,0.3) 24%, rgba(255,255,255,0.3) 26%, transparent 26%),
            linear-gradient(90deg, transparent 74%, rgba(255,255,255,0.3) 74%, rgba(255,255,255,0.3) 76%, transparent 76%)
          `,
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 100% 100%",
        }} />

        {/* Glow Effects */}
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "50%",
          height: "70%",
          background: "radial-gradient(ellipse, rgba(245, 158, 11, 0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-30%",
          left: "-10%",
          width: "60%",
          height: "60%",
          background: "radial-gradient(ellipse, rgba(34, 197, 94, 0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Noise Texture Overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          pointerEvents: "none",
        }} />

        {/* Content */}
        <div style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "120px 24px 80px",
        }}>
          <div style={{ maxWidth: 650 }}>
            {/* Location Badge */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              padding: "8px 16px",
              borderRadius: 100,
              marginBottom: 24,
              border: "1px solid rgba(255,255,255,0.15)",
            }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.9)" }}>
                BSC Rehberge · Berlin-Wedding
              </span>
            </div>

            {/* Headline */}
            <h1 style={{
              fontSize: "clamp(36px, 7vw, 64px)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 16,
            }}>
              <span style={{ color: "#fff" }}>Tennisschule</span>
              <br />
              <span style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                A bis Z
              </span>
            </h1>

            {/* Tagline */}
            <p style={{
              fontSize: "clamp(18px, 3vw, 24px)",
              color: "rgba(255,255,255,0.85)",
              marginBottom: 32,
              fontWeight: 400,
              lineHeight: 1.5,
            }}>
              Tennis lernen, von A bis Z.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <a
                href="/anmeldung-wedding"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "#fff",
                  padding: "16px 32px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(245, 158, 11, 0.4)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 24px rgba(245, 158, 11, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(245, 158, 11, 0.4)";
                }}
              >
                Jetzt anmelden
              </a>
              <a
                href="#trainer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  color: "#fff",
                  padding: "16px 32px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  textDecoration: "none",
                  border: "2px solid rgba(255,255,255,0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.6)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Trainer kennenlernen
              </a>
            </div>
          </div>
        </div>

        </header>

      {/* Unser Angebot Section */}
      <section id="angebot" style={{ padding: "80px 24px", background: colors.bgLight }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{
              fontSize: 12,
              color: colors.primary,
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: 8,
              fontWeight: 600,
            }}>
              Unser Angebot
            </p>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.text,
              marginBottom: 16,
            }}>
              Tennis für jedes Alter und Level
            </h2>
          </div>

          {(() => {
            const angebote = [
              {
                title: "Kindertraining",
                subtitle: "ab 5 Jahren",
                desc: "Kinder lernen bei uns Tennis nach dem DTB-Kindertennis-Konzept (Play+Stay / Tennis 10s). Mit altersgerechten Bällen, angepassten Feldgrößen und viel Bewegung steht der Spaß an erster Stelle. Die Kleinsten starten in der Ball- und Bewegungswelt mit Fang-, Wurf- und Bewegungsspielen, bevor es über die Stufen Rot, Orange und Grün Schritt für Schritt aufs große Feld geht. Koordination, Ballgefühl und Spielfreude stehen im Vordergrund – Erfolgserlebnisse von der ersten Stunde an."
              },
              {
                title: "Jugendtraining",
                subtitle: "Technik, Taktik & Spielverständnis",
                desc: "Im Jugendtraining wird gezielt an Technik, Taktik und Spielverständnis gearbeitet. Grundschläge werden stabilisiert, erste taktische Muster wie Aufschlag + Punktaufbau trainiert und in Matchsituationen umgesetzt. Wir achten auf einen abwechslungsreichen Mix aus Korbtraining, Spielformen und Wettkampfsimulationen – damit Motivation und Fortschritt Hand in Hand gehen."
              },
              {
                title: "Erwachsenentraining",
                subtitle: "Einsteiger bis Clubspieler",
                desc: "Ob Einsteiger, Wiedereinsteiger oder Clubspieler – unser Training für Erwachsene orientiert sich am Tennis-Xpress-Konzept des DTB. Verständliche Erklärungen, schnelle Spielfähigkeit und ein Training, das Fitness und Spaß verbindet. Bei Bedarf kommen auch druckreduzierte Bälle zum Einsatz, um den Einstieg zu erleichtern und Technik sauber aufzubauen."
              },
              {
                title: "Einzeltraining",
                subtitle: "Maximale Intensität",
                desc: "Im Einzeltraining steht dein Spiel im Mittelpunkt. Wir arbeiten gezielt an Technik, Schwächen und individuellen Zielen – mit direktem Feedback und maximaler Trainingsintensität. Ob Feinschliff am Aufschlag, Vorbereitung auf ein Turnier oder systematischer Technikaufbau: Jede Stunde ist auf dich zugeschnitten."
              },
              {
                title: "Gruppentraining",
                subtitle: "Teamdynamik & Spielformen",
                desc: "Im Gruppentraining profitierst du von abwechslungsreichen Spielformen, Teamdynamik und der Motivation, die eine Gruppe mitbringt. Durch angepasste Aufgaben und verschiedene Leistungsstufen kommt jeder auf seine Kosten – vom Einsteiger bis zum Mannschaftsspieler."
              },
              {
                title: "Camps",
                subtitle: "In den Sommerferien",
                desc: "In unseren Tenniscamps in den Sommerferien erleben Kinder und Erwachsene intensives Training in entspannter Atmosphäre. Mehrere Stunden Tennis pro Tag, kombiniert mit Spielen und Spaß – der perfekte Einstieg oder die ideale Ergänzung zum regulären Training."
              },
            ];
            const selectedAngebot = expandedAngebot !== null ? angebote[expandedAngebot] : null;
            return (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 20,
                }}>
                  {angebote.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => setExpandedAngebot(i)}
                      style={{
                        background: colors.white,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 12,
                        padding: 24,
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        display: "flex",
                        flexDirection: "column",
                        textAlign: "center",
                        minHeight: 120,
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                        e.currentTarget.style.borderColor = colors.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                        e.currentTarget.style.borderColor = colors.border;
                      }}
                    >
                      <h3 style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: colors.text,
                        margin: 0,
                        marginBottom: 8,
                      }}>
                        {item.title}
                      </h3>
                      <p style={{
                        fontSize: 14,
                        color: colors.textMuted,
                        margin: 0,
                      }}>
                        {item.subtitle}
                      </p>
                      <div style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: colors.primary,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                      }}>
                        Mehr erfahren
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                          <path d="M5 2L10 7L5 12" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal für Details */}
                {selectedAngebot && (
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 100,
                      padding: 16,
                    }}
                    onClick={() => setExpandedAngebot(null)}
                  >
                    <div
                      style={{
                        background: colors.white,
                        borderRadius: 16,
                        padding: 32,
                        maxWidth: 500,
                        width: "100%",
                        maxHeight: "80vh",
                        overflow: "auto",
                        position: "relative",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setExpandedAngebot(null)}
                        style={{
                          position: "absolute",
                          top: 16,
                          right: 16,
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: colors.bgLight,
                          border: "none",
                          cursor: "pointer",
                          fontSize: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: colors.textMuted,
                        }}
                      >
                        ×
                      </button>
                      <h3 style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: colors.text,
                        margin: 0,
                        marginBottom: 8,
                      }}>
                        {selectedAngebot.title}
                      </h3>
                      <p style={{
                        fontSize: 14,
                        color: colors.primary,
                        fontWeight: 600,
                        margin: 0,
                        marginBottom: 20,
                      }}>
                        {selectedAngebot.subtitle}
                      </p>
                      <p style={{
                        fontSize: 15,
                        color: colors.textMuted,
                        lineHeight: 1.8,
                        margin: 0,
                      }}>
                        {selectedAngebot.desc}
                      </p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* Aktuelles Section - Cards nebeneinander */}
      <section id="aktuelles" style={{ padding: "80px 24px", background: colors.white }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <p style={{
              fontSize: 12,
              color: colors.primary,
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: 8,
              fontWeight: 600,
            }}>
              Aktuelles
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: colors.text }}>
              Jetzt anmelden
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
          }}>
            {/* Sommertraining Card */}
            <div
              style={{
                background: `linear-gradient(135deg, ${colors.primary} 0%, #2d5a2d 100%)`,
                borderRadius: 16,
                padding: "32px",
                boxShadow: "0 12px 40px rgba(27, 71, 27, 0.25)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{
                position: "absolute",
                top: -30,
                right: -30,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
              }} />

              <div style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.2)",
                padding: "6px 14px",
                borderRadius: 20,
                marginBottom: 16,
                alignSelf: "flex-start",
              }}>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Sommer 2026
                </span>
              </div>

              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                Sommertraining
              </h3>

              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 12, flex: 1 }}>
                Sichern Sie sich jetzt Ihren Platz für die Sommersaison.
              </p>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#ff6b6b", marginBottom: 16 }}>
                Anmeldung bis 10.3.!
              </p>

              <a
                href="/anmeldung-wedding"
                style={{
                  display: "inline-block",
                  background: "#fff",
                  color: colors.primary,
                  padding: "12px 24px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  textAlign: "center",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                Jetzt anmelden
              </a>
            </div>

            {/* Tenniscamp Card */}
            <div
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                borderRadius: 16,
                padding: "32px",
                boxShadow: "0 12px 40px rgba(245, 158, 11, 0.25)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
              }} />

              <div style={{
                display: "inline-block",
                background: "rgba(255,255,255,0.2)",
                padding: "6px 14px",
                borderRadius: 20,
                marginBottom: 16,
                alignSelf: "flex-start",
              }}>
                <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                  Sommerferien
                </span>
              </div>

              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                Tenniscamps
              </h3>

              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 1.6, marginBottom: 20, flex: 1 }}>
                Kinder & Erwachsene<br />
                13.-17. Juli & 17.-21. August
              </p>

              <a
                href="/tenniscamp"
                style={{
                  display: "inline-block",
                  background: "#fff",
                  color: "#d97706",
                  padding: "12px 24px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  textAlign: "center",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                Zum Tenniscamp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Spontane Stunden Buchung Section - nur anzeigen wenn überhaupt Slots vorhanden */}
      {!loadingSlots && hasAnySlots && (
        <section id="spontan" style={{ padding: "60px 24px", background: colors.white }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
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
                Wählen Sie einen Tag mit verfügbaren Terminen
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: selectedDate ? "1fr 1fr" : "1fr",
              gap: 24,
              maxWidth: selectedDate ? 800 : 400,
              margin: "0 auto",
            }}>
              {/* Calendar Grid */}
              <div style={{
                background: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                padding: 20,
              }}>
                {/* Month Navigation */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}>
                  <button
                    onClick={() => setCurrentMonth(prev => {
                      const newMonth = prev.month - 1;
                      if (newMonth < 0) return { year: prev.year - 1, month: 11 };
                      return { ...prev, month: newMonth };
                    })}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                      color: colors.textMuted,
                      padding: 8,
                    }}
                  >
                    ‹
                  </button>
                  <span style={{ fontWeight: 600, color: colors.text, fontSize: 16 }}>
                    {monthNames[currentMonth.month]} {currentMonth.year}
                  </span>
                  <button
                    onClick={() => setCurrentMonth(prev => {
                      const newMonth = prev.month + 1;
                      if (newMonth > 11) return { year: prev.year + 1, month: 0 };
                      return { ...prev, month: newMonth };
                    })}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 20,
                      color: colors.textMuted,
                      padding: 8,
                    }}
                  >
                    ›
                  </button>
                </div>

                {/* Weekday Headers */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 4,
                  marginBottom: 8,
                }}>
                  {weekDayLabels.map(day => (
                    <div key={day} style={{
                      textAlign: "center",
                      fontSize: 12,
                      fontWeight: 600,
                      color: colors.textMuted,
                      padding: "8px 0",
                    }}>
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 4,
                }}>
                  {calendarDays.map((day, i) => {
                    if (!day) {
                      return <div key={`empty-${i}`} style={{ aspectRatio: "1" }} />;
                    }

                    const dayNum = parseInt(day.split("-")[2]);
                    const hasSlots = (slotsByDate[day] || []).length > 0;
                    const isPast = day < todayISO();
                    const isSelected = day === selectedDate;
                    const isToday = day === todayISO();

                    return (
                      <button
                        key={day}
                        onClick={() => hasSlots && !isPast && setSelectedDate(day)}
                        disabled={!hasSlots || isPast}
                        style={{
                          aspectRatio: "1",
                          border: isToday ? `2px solid ${colors.primary}` : isSelected ? `2px solid ${colors.primary}` : "1px solid transparent",
                          borderRadius: 8,
                          background: isSelected ? colors.primary : "transparent",
                          color: isSelected ? "#fff" : isPast ? colors.border : colors.text,
                          cursor: hasSlots && !isPast ? "pointer" : "default",
                          fontWeight: isToday || isSelected ? 600 : 400,
                          fontSize: 14,
                          transition: "all 0.15s",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                          position: "relative",
                        }}
                      >
                        {dayNum}
                        {hasSlots && !isPast && !isSelected && (
                          <span style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: colors.primary,
                            position: "absolute",
                            bottom: 4,
                          }} />
                        )}
                      </button>
                    );
                  })}
                </div>

                {spontaneStunden.length === 0 && (
                  <p style={{ textAlign: "center", color: colors.textMuted, fontSize: 13, marginTop: 16 }}>
                    Keine Termine in diesem Monat
                  </p>
                )}
              </div>

              {/* Time Slots Panel */}
              {selectedDate && (
                <div style={{
                  background: colors.bgLight,
                  borderRadius: 12,
                  padding: 20,
                }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: colors.text,
                    marginBottom: 16,
                  }}>
                    {(() => {
                      const d = new Date(selectedDate + "T12:00:00");
                      const weekDayNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                      return `${weekDayNames[d.getDay()]}, ${d.getDate()}. ${monthNames[d.getMonth()]}`;
                    })()}
                  </div>

                  {selectedDateSlots.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selectedDateSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => openBookingModal(slot)}
                          style={{
                            padding: "14px 16px",
                            background: colors.white,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            fontWeight: 500,
                            fontSize: 15,
                            textAlign: "left",
                            transition: "all 0.15s",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = colors.primary;
                            e.currentTarget.style.background = "#f8fdf8";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = colors.border;
                            e.currentTarget.style.background = colors.white;
                          }}
                        >
                          <span>{slot.uhrzeitVon.slice(0, 5)} – {slot.uhrzeitBis.slice(0, 5)} Uhr</span>
                          {slot.customPreisProStunde && (
                            <span style={{ color: colors.primary, fontWeight: 600 }}>
                              {slot.customPreisProStunde.toFixed(0)} €
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: colors.textMuted, fontSize: 14 }}>
                      Keine Termine an diesem Tag
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Trainer Section */}
      <section id="trainer" style={{ padding: "80px 24px", background: colors.bgLight }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{
              fontSize: 12,
              color: colors.primary,
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: 8,
              fontWeight: 600,
            }}>
              Unser Team
            </p>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              color: colors.text,
            }}>
              Lizenzierte Trainer
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            {trainers.map((trainer, i) => (
              <div
                key={i}
                style={{
                  background: colors.white,
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                }}
              >
                <div
                  style={{
                    aspectRatio: "1",
                    background: colors.bgLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    position: "relative",
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
                        transition: "transform 0.3s ease",
                      }}
                      onMouseEnter={(e) => {
                        const baseScale = "imageZoom" in trainer ? trainer.imageZoom || 1 : 1;
                        e.currentTarget.style.transform = `scale(${baseScale * 1.05})`;
                      }}
                      onMouseLeave={(e) => {
                        const baseScale = "imageZoom" in trainer ? trainer.imageZoom || 1 : 1;
                        e.currentTarget.style.transform = `scale(${baseScale})`;
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 48, fontWeight: 700, color: colors.border }}>
                      {trainer.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  )}
                </div>
                <div style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 6 }}>
                    {trainer.name}
                  </h3>
                  <p style={{
                    fontSize: 12,
                    color: colors.white,
                    background: colors.primary,
                    padding: "4px 10px",
                    borderRadius: 4,
                    display: "inline-block",
                    marginBottom: 12,
                    fontWeight: 500,
                  }}>
                    {trainer.qualification}
                  </p>
                  {trainer.bio && (
                    <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.6 }}>
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
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <p style={{
              fontSize: 12,
              color: colors.primary,
              textTransform: "uppercase",
              letterSpacing: "2px",
              marginBottom: 8,
              fontWeight: 600,
            }}>
              Kontakt
            </p>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: colors.text }}>
              So erreichen Sie uns
            </h2>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 24,
          }}>
            {/* Adresse */}
            <div style={{
              background: colors.bgLight,
              borderRadius: 12,
              padding: 28,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 20,
              }}>
                📍
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8 }}>Adresse</h3>
              <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                BSC Rehberge 1945 e.V. Abt. Tennis<br />
                Sambesistraße 11<br />
                13351 Berlin-Wedding
              </p>
              <a
                href="https://maps.google.com/?q=BSC+Rehberge+Sambesistraße+11+Berlin"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 14,
                  color: colors.primary,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                In Google Maps öffnen →
              </a>
            </div>

            {/* Telefon */}
            <div style={{
              background: colors.bgLight,
              borderRadius: 12,
              padding: 28,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 20,
              }}>
                📞
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8 }}>Telefon</h3>
              <a
                href="tel:+4915560062745"
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: colors.primary,
                  textDecoration: "none",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                0155 60062745
              </a>
              <p style={{ fontSize: 13, color: colors.textMuted }}>
                Auch per WhatsApp erreichbar
              </p>
            </div>

            {/* E-Mail */}
            <div style={{
              background: colors.bgLight,
              borderRadius: 12,
              padding: 28,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: colors.primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 20,
              }}>
                ✉️
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8 }}>E-Mail</h3>
              <a
                href="mailto:tennisabisz@gmail.com"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.primary,
                  textDecoration: "none",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                tennisabisz@gmail.com
              </a>
              <p style={{ fontSize: 13, color: colors.textMuted }}>
                Antwort meist innerhalb 24h
              </p>
            </div>
          </div>
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
                {["Angebot", "Aktuelles", ...(hasAnySlots ? ["Spontan"] : []), "Trainer", "Kontakt"].map((item) => (
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
