import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

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

  // Load Google Fonts — Fraunces (display) + Outfit (body)
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,400&family=Outfit:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  // Scroll-triggered fade-in animations
  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("fade-in-visible");
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    const els = document.querySelectorAll(".fade-in-section");
    els.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, [hasAnySlots]);

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
            <td style="background: linear-gradient(135deg, #e8a020 0%, #c4850a 100%); padding: 24px 40px; text-align: center;">
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

  // Vereinsfarben BSC Rehberge — elevated palette
  const colors = {
    primary: "#14351a",
    primaryLight: "#2a6b3a",
    accent: "#e8a020",
    accentDark: "#c4850a",
    white: "#fafaf8",
    bgLight: "#f0ede6",
    bgDark: "#0c1f10",
    text: "#1a1a18",
    textMuted: "#5c5c56",
    border: "#d8d4cc",
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
      bio: "Ehemaliger Leistungsspieler mit Erfahrung in den höchsten US-College-Ligen. Nach einer Verletzung widmet er sich nun leidenschaftlich dem Training.",
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
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
      color: colors.text,
      overflowX: "hidden",
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
              {["Angebot", "Tarife", "Aktuelles", ...(hasAnySlots ? ["Spontan"] : []), "Trainer", "FAQ", "Kontakt"].map((item) => (
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
                <a
                  href="/anmeldung-wedding"
                  style={{
                    background: "linear-gradient(135deg, #e8a020 0%, #c4850a 100%)",
                    color: "#fff",
                    padding: "11px 23px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    boxShadow: "0 4px 12px rgba(232, 160, 32, 0.3)",
                  }}
                >
                  Training buchen
                </a>
              </div>
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
              {["Angebot", "Tarife", "Aktuelles", ...(hasAnySlots ? ["Spontan"] : []), "Trainer", "FAQ", "Kontakt"].map((item) => (
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
                  background: "linear-gradient(135deg, #e8a020 0%, #c4850a 100%)",
                  color: "#fff",
                  padding: "12px 20px",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  textAlign: "center",
                  marginTop: 16,
                  boxShadow: "0 4px 12px rgba(232, 160, 32, 0.3)",
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
          minHeight: "90vh",
          display: "flex",
          alignItems: "center",
          background: `linear-gradient(160deg, #060d08 0%, ${colors.primary} 35%, #1a3d22 65%, #0a1a0e 100%)`,
          overflow: "hidden",
        }}
      >
        {/* Noise grain texture overlay */}
        <div className="grain-overlay" style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }} />

        {/* Diagonal court lines */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage: `
            repeating-linear-gradient(
              -35deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.5) 40px,
              rgba(255,255,255,0.5) 41px
            )
          `,
          pointerEvents: "none",
        }} />

        {/* Large decorative tennis ball — oversized, cropped */}
        <div className="hero-ball" style={{
          position: "absolute",
          right: "-12%",
          top: "50%",
          transform: "translateY(-55%)",
          width: "min(650px, 55vw)",
          height: "min(650px, 55vw)",
          borderRadius: "50%",
          background: "radial-gradient(circle at 30% 30%, #d4e040 0%, #b8c420 40%, #8a9818 100%)",
          opacity: 0.08,
          pointerEvents: "none",
          filter: "blur(1px)",
        }} />
        {/* Ball seam curve */}
        <div className="hero-ball-line" style={{
          position: "absolute",
          right: "calc(-12% + min(130px, 11vw))",
          top: "50%",
          transform: "translateY(-55%) rotate(-25deg)",
          width: "min(380px, 32vw)",
          height: "min(650px, 55vw)",
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.04)",
          pointerEvents: "none",
        }} />

        {/* Warm glow — top right */}
        <div style={{
          position: "absolute",
          top: "-25%",
          right: "5%",
          width: "45%",
          height: "65%",
          background: "radial-gradient(ellipse, rgba(232, 160, 32, 0.15) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />
        {/* Green glow — bottom left */}
        <div style={{
          position: "absolute",
          bottom: "-25%",
          left: "-8%",
          width: "55%",
          height: "55%",
          background: "radial-gradient(ellipse, rgba(42, 107, 58, 0.12) 0%, transparent 65%)",
          pointerEvents: "none",
        }} />

        {/* Content */}
        <div style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "140px 24px 100px",
        }}>
          <div style={{ maxWidth: 680 }}>
            {/* Location Badge */}
            <div className="hero-badge" style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              padding: "10px 20px",
              borderRadius: 100,
              marginBottom: 28,
              border: "1px solid rgba(255,255,255,0.12)",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
              }} />
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: 500, letterSpacing: "0.3px" }}>
                BSC Rehberge · Berlin-Wedding
              </span>
            </div>

            {/* Headline */}
            <h1 className="hero-title" style={{
              fontSize: "clamp(44px, 9vw, 80px)",
              fontFamily: "'Fraunces', serif",
              fontWeight: 900,
              lineHeight: 1.0,
              marginBottom: 24,
              letterSpacing: "-2px",
            }}>
              <span style={{ color: "#fff", display: "block" }}>Tennisschule</span>
              <span style={{
                background: "linear-gradient(135deg, #e8a020 0%, #f0c050 50%, #e8a020 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                display: "block",
                fontStyle: "italic",
              }}>
                A bis Z
              </span>
            </h1>

            {/* Tagline */}
            <p style={{
              fontSize: "clamp(18px, 3vw, 22px)",
              color: "rgba(255,255,255,0.75)",
              marginBottom: 40,
              fontWeight: 400,
              lineHeight: 1.6,
              maxWidth: 480,
            }}>
              Professionelles Tennistraining fur alle Alters- und Leistungsstufen in Berlin-Wedding.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <a
                href="/anmeldung-wedding"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #e8a020 0%, #c4850a 100%)",
                  color: "#fff",
                  padding: "16px 36px",
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: 16,
                  textDecoration: "none",
                  boxShadow: "0 4px 24px rgba(232, 160, 32, 0.35)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(232, 160, 32, 0.45)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 24px rgba(232, 160, 32, 0.35)";
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
                  fontWeight: 500,
                  fontSize: 16,
                  textDecoration: "none",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Unser Team
              </a>
            </div>
          </div>
        </div>

      </header>

      {/* Social Proof Strip — diagonal cut top */}
      <div style={{
        background: colors.primary,
        padding: "40px 24px",
        position: "relative",
        clipPath: "polygon(0 0, 100% 12px, 100% 100%, 0 100%)",
      }}>
        {/* Subtle noise */}
        <div className="grain-overlay" style={{
          position: "absolute", inset: 0, opacity: 0.15, pointerEvents: "none", mixBlendMode: "overlay",
        }} />
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: "48px",
          position: "relative",
        }}>
          {[
            { number: "7", label: "Trainer" },
            { number: "150+", label: "Aktive Spieler" },
            { number: "2", label: "Standorte in Berlin" },
            { number: "DTB", label: "Zertifizierte Methoden" },
          ].map((stat, i) => (
            <div key={i} className="stat-item" style={{ textAlign: "center", minWidth: 130 }}>
              <div style={{
                fontSize: 36,
                fontWeight: 900,
                color: colors.accent,
                fontFamily: "'Fraunces', serif",
                lineHeight: 1,
                marginBottom: 6,
              }}>
                {stat.number}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unser Angebot Section */}
      <section id="angebot" className="fade-in-section" style={{ padding: "100px 24px", background: colors.bgLight, position: "relative" }}>
        {/* Subtle geometric pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: `radial-gradient(circle at 1px 1px, ${colors.primary} 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "left", marginBottom: 56, maxWidth: 600 }}>
            <p style={{
              fontSize: 11,
              color: colors.accent,
              textTransform: "uppercase",
              letterSpacing: "4px",
              marginBottom: 16,
              fontWeight: 600,
            }}>
              Unser Angebot
            </p>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              color: colors.text,
              marginBottom: 16,
              lineHeight: 1.1,
              letterSpacing: "-1px",
            }}>
              Tennis fur jedes Alter und Level
            </h2>
            <p style={{ fontSize: 16, color: colors.textMuted, lineHeight: 1.7 }}>
              Von den ersten Schlagerfahrungen bis zum Wettkampftennis - wir begleiten euch auf jedem Level.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              {
                title: "Kindertraining",
                subtitle: "ab 5 Jahren",
                desc: "Tennis nach dem DTB-Konzept (Play+Stay / Tennis 10s). Altersgerechte Balle, angepasste Feldgrossen und viel Bewegung - Spass an erster Stelle.",
              },
              {
                title: "Jugendtraining",
                subtitle: "Technik, Taktik & Spielverstandnis",
                desc: "Gezieltes Training an Technik, Taktik und Spielverstandnis. Mix aus Korbtraining, Spielformen und Wettkampfsimulationen.",
              },
              {
                title: "Erwachsenentraining",
                subtitle: "Einsteiger bis Clubspieler",
                desc: "Training nach dem Tennis-Xpress-Konzept des DTB. Schnelle Spielfahigkeit und ein Training, das Fitness und Spass verbindet.",
              },
              {
                title: "Mannschaftstraining",
                subtitle: "Wettkampforientiert",
                desc: "Wettkampforientiertes Training mit gleichstarken Spielern. Fur Mannschafts- und Turnierspieler.",
              },
              {
                title: "Einzeltraining",
                subtitle: "Maximale Intensitat",
                desc: "Gezieltes Arbeiten an Technik, Schwachen und individuellen Zielen - mit direktem Feedback und maximaler Intensitat.",
              },
              {
                title: "Gruppentraining",
                subtitle: "Teamdynamik & Spielformen",
                desc: "Abwechslungsreiche Spielformen und die Motivation einer Gruppe. Vom Einsteiger bis zum Mannschaftsspieler.",
              },
              {
                title: "Camps",
                subtitle: "In den Sommerferien",
                desc: "Intensives Training in entspannter Atmosphare. Mehrere Stunden Tennis pro Tag, kombiniert mit Spielen und Spass.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flip-card"
                style={{
                  perspective: 800,
                  height: 200,
                  cursor: "pointer",
                }}
              >
                <div className="flip-card-inner" style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                  transformStyle: "preserve-3d",
                }}>
                  {/* Front */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    background: colors.white,
                    borderRadius: 12,
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 28,
                    textAlign: "center",
                  }}>
                    <h3 style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: colors.text,
                      marginBottom: 8,
                      fontFamily: "'Fraunces', serif",
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: 13,
                      color: colors.primary,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      margin: 0,
                    }}>
                      {item.subtitle}
                    </p>
                  </div>
                  {/* Back */}
                  <div style={{
                    position: "absolute",
                    inset: 0,
                    backfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                    background: colors.primary,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    padding: 28,
                  }}>
                    <h4 style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.7)",
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}>
                      {item.title}
                    </h4>
                    <p style={{
                      fontSize: 14,
                      color: "rgba(255,255,255,0.9)",
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarife Section */}
      <section id="tarife" className="fade-in-section" style={{ padding: "100px 24px", background: colors.white, position: "relative" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{
              fontSize: 11,
              color: colors.accent,
              textTransform: "uppercase",
              letterSpacing: "4px",
              marginBottom: 16,
              fontWeight: 600,
            }}>
              Tarife
            </p>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              color: colors.text,
              letterSpacing: "-1px",
            }}>
              Unsere Preise
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {/* Einzeltraining */}
            <div style={{
              background: colors.white,
              borderRadius: 16,
              padding: 32,
              border: `1px solid ${colors.border}`,
              textAlign: "center",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 16, width: 52, height: 52, borderRadius: 12, background: colors.bgLight, display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: colors.text, marginBottom: 8, fontFamily: "'Fraunces', serif" }}>Einzeltraining</h3>
              <p style={{ fontSize: 14, color: colors.textMuted, marginBottom: 24, lineHeight: 1.6 }}>Individuelles 1:1 Training mit vollem Fokus auf Ihre Ziele</p>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: colors.primary, fontFamily: "'Fraunces', serif" }}>40 €</span>
                <span style={{ fontSize: 14, color: colors.textMuted, marginLeft: 6 }}>/ Stunde</span>
              </div>
            </div>

            {/* Gruppentraining */}
            <div style={{
              background: colors.primary,
              borderRadius: 16,
              padding: 32,
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(27,71,27,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 16, width: 52, height: 52, borderRadius: 12, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>👥</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8, fontFamily: "'Fraunces', serif" }}>Gruppentraining</h3>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginBottom: 24, lineHeight: 1.6 }}>Training in Gruppen von bis zu 4 Personen</p>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 42, fontWeight: 900, color: "#fff", fontFamily: "'Fraunces', serif" }}>60 €</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginLeft: 6 }}>/ Monat</span>
              </div>
            </div>
          </div>

          <p style={{
            marginTop: 24,
            fontSize: 13,
            color: colors.textMuted,
            textAlign: "center",
            fontStyle: "italic",
          }}>
            Im Winter zzgl. Hallengebuhren
          </p>
        </div>
      </section>

      {/* Aktuelles Section */}
      <section id="aktuelles" className="fade-in-section" style={{ padding: "100px 24px", background: colors.white, position: "relative" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{
              fontSize: 11,
              color: colors.accent,
              textTransform: "uppercase",
              letterSpacing: "4px",
              marginBottom: 16,
              fontWeight: 600,
            }}>
              Aktuelles
            </p>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontFamily: "'Fraunces', serif", fontWeight: 700, color: colors.text, letterSpacing: "-1px" }}>
              Jetzt anmelden
            </h2>
          </div>

          {/* Tenniscamp Card */}
          <div
            style={{
              background: "linear-gradient(135deg, #e8a020 0%, #c4850a 100%)",
              borderRadius: 16,
              padding: "32px 36px",
              boxShadow: "0 12px 40px rgba(232, 160, 32, 0.25)",
              maxWidth: 460,
              margin: "0 auto",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative circle */}
            <div style={{
              position: "absolute",
              right: -30,
              top: -30,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              pointerEvents: "none",
            }} />
            <div style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.2)",
              padding: "5px 12px",
              borderRadius: 16,
              marginBottom: 12,
            }}>
              <span style={{ color: "#fff", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                Sommerferien 2026
              </span>
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
              Tenniscamps
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>Kindercamp</div>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>10:00–15:00 Uhr · 270 €</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", marginBottom: 2 }}>Erwachsenencamp</div>
                <div style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>18:00–20:00 Uhr · 140 €</div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", marginBottom: 16 }}>
              13.–17. Juli & 17.–21. August
            </p>

            <a
              href="/tenniscamp"
              style={{
                display: "inline-block",
                background: "#fff",
                color: "#d97706",
                padding: "10px 20px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              Anmelden
            </a>
          </div>
        </div>
      </section>

      {/* Spontane Stunden Buchung Section - nur anzeigen wenn überhaupt Slots vorhanden */}
      {!loadingSlots && hasAnySlots && (
        <section id="spontan" className="fade-in-section" style={{ padding: "60px 24px", background: colors.white }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <p style={{
                fontSize: 12,
                color: colors.primary,
                textTransform: "uppercase",
                letterSpacing: "3px",
                marginBottom: 12,
                fontWeight: 600,
              }}>
                Verfugbare Termine
              </p>
              <h2 style={{
                fontSize: 28,
                fontFamily: "'Fraunces', serif",
                fontWeight: 400,
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
      <section id="trainer" className="fade-in-section" style={{ padding: "100px 24px", background: colors.bgLight, position: "relative" }}>
        {/* Dot pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.025, pointerEvents: "none",
          backgroundImage: `radial-gradient(circle at 1px 1px, ${colors.primary} 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "left", marginBottom: 56, maxWidth: 500 }}>
            <p style={{
              fontSize: 11,
              color: colors.accent,
              textTransform: "uppercase",
              letterSpacing: "4px",
              marginBottom: 16,
              fontWeight: 600,
            }}>
              Unser Team
            </p>
            <h2 style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              color: colors.text,
              letterSpacing: "-1px",
              lineHeight: 1.1,
            }}>
              Trainer
            </h2>
          </div>

          <div className="trainer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {trainers.map((trainer, i) => (
              <div
                key={i}
                className="trainer-card"
                style={{
                  background: colors.white,
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                  transform: i % 3 === 1 ? "translateY(24px)" : "translateY(0)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = i % 3 === 1 ? "translateY(18px)" : "translateY(-6px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = i % 3 === 1 ? "translateY(24px)" : "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                }}
              >
                <div
                  style={{
                    aspectRatio: "3/4",
                    background: `linear-gradient(135deg, ${colors.bgLight} 0%, #e2ddd4 100%)`,
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
                        transition: "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                      onMouseEnter={(e) => {
                        const baseScale = "imageZoom" in trainer ? trainer.imageZoom || 1 : 1;
                        e.currentTarget.style.transform = `scale(${baseScale * 1.07})`;
                      }}
                      onMouseLeave={(e) => {
                        const baseScale = "imageZoom" in trainer ? trainer.imageZoom || 1 : 1;
                        e.currentTarget.style.transform = `scale(${baseScale})`;
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: 56, fontWeight: 900, color: colors.border, fontFamily: "'Fraunces', serif", opacity: 0.5 }}>
                      {trainer.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  )}
                </div>
                <div style={{ padding: 22 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.text, marginBottom: 8, fontFamily: "'Fraunces', serif", letterSpacing: "-0.3px" }}>
                    {trainer.name}
                  </h3>
                  <p style={{
                    fontSize: 11,
                    color: colors.accent,
                    background: "transparent",
                    padding: 0,
                    display: "block",
                    marginBottom: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}>
                    {trainer.qualification}
                  </p>
                  {trainer.bio && (
                    <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.65 }}>
                      {trainer.bio}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="fade-in-section" style={{ padding: "100px 24px", background: colors.white, position: "relative" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{
              fontSize: 11,
              color: colors.accent,
              textTransform: "uppercase",
              letterSpacing: "4px",
              marginBottom: 16,
              fontWeight: 600,
            }}>
              FAQ
            </p>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontFamily: "'Fraunces', serif", fontWeight: 700, color: colors.text, letterSpacing: "-1px" }}>
              Haufig gestellte Fragen
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              {
                q: "Ab welchem Alter kann mein Kind Tennis lernen?",
                a: "Kinder ab 5 Jahren sind bei uns herzlich willkommen. Wir trainieren Kinder jeden Alters und jeder Spielstärke."
              },
              {
                q: "Brauche ich eigene Ausrüstung?",
                a: "Sandplatzschuhe oder glatte Schuhe ohne Profil sind Pflicht. Ein Tennisschläger ist erforderlich, kann jedoch für Probetrainings vom Trainerteam begrenzt zur Verfügung gestellt werden."
              },
              {
                q: "Was ist der Unterschied zwischen Einzel- und Gruppentraining?",
                a: "Im Einzeltraining erhalten Sie die volle Aufmerksamkeit des Trainers für gezielte, individuelle Verbesserung. Gruppentraining bietet zusätzlich Spielpraxis mit anderen und ist kostengünstiger."
              },
              {
                q: "Wie groß sind die Trainingsgruppen?",
                a: "Die reguläre Trainingsgruppe besteht aus 4 Personen. Kleinere Gruppen sind nach Absprache möglich."
              },
              {
                q: "Kann ich eine Probestunde machen?",
                a: "Ja, melden Sie sich für ein Probetraining an. Nach dem Probetraining und dem Wunsch weiterzumachen erfolgt eine verbindliche Saisonanmeldung, sobald ein passender Trainingsslot gefunden wurde."
              },
              {
                q: "Was passiert bei schlechtem Wetter?",
                a: "Bei starkem Regen muss das Training pausiert werden, da die Plätze nicht bespielbar sind. Entscheidungen werden kurzfristig getroffen."
              },
              {
                q: "Wie läuft die Anmeldung ab?",
                a: "Nach Eingang Ihrer Anmeldung stimmen wir einen passenden Trainingsslot ab. Nach Vertragsunterzeichnung (SEPA-Mandat) ist die Anmeldung abgeschlossen. Wichtig: Auch nach einmaliger Anmeldung ist für jede Folgesaison eine erneute Anmeldung erforderlich, da die Planung zweimal jährlich erfolgt (Sommer/Winter). Allen Teilnehmenden wird rechtzeitig ein Anmeldeformular zugesendet."
              },
              {
                q: "Muss ich Vereinsmitglied sein?",
                a: "Grundsätzlich ja. Ausnahmen: Im Wintertraining ist für Erwachsene zunächst keine Mitgliedschaft nötig (Mitglieder werden bei Hallenkapazitäten priorisiert). Kinder dürfen eine Saison ohne Mitgliedschaft trainieren, müssen aber ab der zweiten Saison Mitglied werden."
              },
              {
                q: "Kann ich als Erwachsener Anfänger starten?",
                a: "Ja, jeder kann in jedem Alter beginnen. Für Anfänger (Kinder ab 12 und Erwachsene) empfehlen wir zunächst einige Einzelstunden, da Gruppen selten aus Anfängern bestehen."
              },
            ].map((faq, i) => (
              <div
                key={i}
                style={{
                  background: openFaqIndex === i ? colors.white : colors.bgLight,
                  borderRadius: 14,
                  overflow: "hidden",
                  transition: "background 0.3s ease, box-shadow 0.3s ease",
                  boxShadow: openFaqIndex === i ? "0 4px 20px rgba(0,0,0,0.06)" : "none",
                  border: `1px solid ${openFaqIndex === i ? colors.border : "transparent"}`,
                }}
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                  style={{
                    width: "100%",
                    padding: "22px 24px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    textAlign: "left",
                    gap: 16,
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: colors.text, margin: 0, lineHeight: 1.4 }}>
                    {faq.q}
                  </h3>
                  <span style={{
                    fontSize: 14,
                    color: colors.accent,
                    transform: openFaqIndex === i ? "rotate(45deg)" : "rotate(0deg)",
                    transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                    flexShrink: 0,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: openFaqIndex === i ? `${colors.accent}15` : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}>
                    +
                  </span>
                </button>
                <div className="faq-answer" style={{
                  maxHeight: openFaqIndex === i ? 300 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
                  opacity: openFaqIndex === i ? 1 : 0,
                }}>
                  <div style={{ padding: "0 24px 24px" }}>
                    <p style={{ fontSize: 15, color: colors.textMuted, lineHeight: 1.7, margin: 0 }}>
                      {faq.a}
                    </p>
                    {faq.q.includes("Probestunde") && (
                      <a
                        href="/anmeldung-wedding-probetraining"
                        style={{
                          display: "inline-block",
                          marginTop: 12,
                          padding: "8px 16px",
                          background: "linear-gradient(135deg, #e8a020 0%, #c4850a 100%)",
                          color: "#fff",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: "none",
                        }}
                      >
                        Probetraining anfragen
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kontakt Section */}
      <section id="kontakt" className="fade-in-section" style={{
        padding: "100px 24px",
        background: `linear-gradient(165deg, ${colors.bgLight} 0%, #e8e4dc 100%)`,
        position: "relative",
      }}>
        {/* Diagonal top cut */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 60,
          background: colors.white,
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 100%)",
        }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{
              fontSize: 11,
              color: colors.accent,
              textTransform: "uppercase",
              letterSpacing: "4px",
              marginBottom: 16,
              fontWeight: 600,
            }}>
              Kontakt
            </p>
            <h2 style={{ fontSize: "clamp(28px, 5vw, 42px)", fontFamily: "'Fraunces', serif", fontWeight: 700, color: colors.text, letterSpacing: "-1px" }}>
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
              background: colors.white,
              borderRadius: 12,
              padding: 28,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 20,
              }}>
                📍
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8, fontFamily: "'Fraunces', serif" }}>Adresse</h3>
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
              background: colors.white,
              borderRadius: 12,
              padding: 28,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 20,
              }}>
                📞
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8, fontFamily: "'Fraunces', serif" }}>Telefon</h3>
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
              background: colors.white,
              borderRadius: 12,
              padding: 28,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                fontSize: 20,
              }}>
                ✉️
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8, fontFamily: "'Fraunces', serif" }}>E-Mail</h3>
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
      <footer style={{ background: colors.bgDark, color: "#fff", padding: "56px 24px", position: "relative" }}>
        {/* Grain */}
        <div className="grain-overlay" style={{ position: "absolute", inset: 0, opacity: 0.2, pointerEvents: "none", mixBlendMode: "overlay" }} />
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
                {["Angebot", "Tarife", "Aktuelles", ...(hasAnySlots ? ["Spontan"] : []), "Trainer", "FAQ", "Kontakt"].map((item) => (
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
            <p>&copy; 2026 Tennisschule A bis Z. Alle Rechte vorbehalten.</p>
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
              <p style={{ marginTop: 16 }}><strong>Umsatzsteuer-ID</strong></p>
              <p>USt-IdNr.: DE450839939</p>
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

              <p style={{ marginTop: 16 }}><strong>2. Erhobene Daten</strong></p>
              <p>Bei Nutzung unserer Dienste erheben wir folgende Daten:</p>
              <p>• Anmeldeformular: Name, E-Mail, Telefon, Verfügbarkeit, Trainingsart, Erfahrungslevel, Alter, Nachricht<br />
              • Buchungsformular: Name, E-Mail, Telefon<br />
              • Technische Daten: IP-Adresse, Browsertyp, Zugriffszeit (durch Hosting-Anbieter)</p>

              <p style={{ marginTop: 16 }}><strong>3. Zweck und Rechtsgrundlage</strong></p>
              <p>Wir verarbeiten Ihre Daten zur Durchführung von Trainingsanfragen und Buchungen (Art. 6 Abs. 1 lit. b DSGVO – Vertragserfüllung) sowie zur Kontaktaufnahme (Art. 6 Abs. 1 lit. f DSGVO – berechtigtes Interesse).</p>

              <p style={{ marginTop: 16 }}><strong>4. Empfänger und Drittanbieter</strong></p>
              <p>• Supabase Inc. (Datenbank, Server in Frankfurt/EU)<br />
              • Vercel Inc. (Hosting, USA – EU-Standardvertragsklauseln)<br />
              • Google LLC (E-Mail-Versand via Gmail, USA – EU-Standardvertragsklauseln)</p>

              <p style={{ marginTop: 16 }}><strong>5. Speicherdauer</strong></p>
              <p>Ihre Daten werden gespeichert, solange die Geschäftsbeziehung besteht oder gesetzliche Aufbewahrungsfristen gelten. Anfragen werden nach Bearbeitung maximal 3 Jahre aufbewahrt.</p>

              <p style={{ marginTop: 16 }}><strong>6. Ihre Rechte</strong></p>
              <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Kontaktieren Sie uns unter tennisabisz@gmail.com.</p>

              <p style={{ marginTop: 16 }}><strong>7. Beschwerderecht</strong></p>
              <p>Sie haben das Recht, sich bei der zuständigen Datenschutz-Aufsichtsbehörde zu beschweren (für Brandenburg: Die Landesbeauftragte für den Datenschutz und für das Recht auf Akteneinsicht).</p>

              <p style={{ marginTop: 16 }}><strong>8. SSL-Verschlüsselung</strong></p>
              <p>Diese Website nutzt HTTPS für eine sichere Datenübertragung.</p>
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
        /* ── Responsive nav ── */
        @media (max-width: 768px) {
          .desktop-menu { display: none !important; }
          .mobile-menu-btn { display: block !important; }
          .trainer-grid { grid-template-columns: 1fr !important; }
          .trainer-card { transform: translateY(0) !important; }
        }

        /* ── Flip card hover ── */
        .flip-card:hover .flip-card-inner,
        .flip-card:focus-within .flip-card-inner {
          transform: rotateY(180deg);
        }

        /* ── Grain / noise texture (SVG-based) ── */
        .grain-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 128px 128px;
        }

        /* ── Scroll-triggered fade-in ── */
        .fade-in-section {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .fade-in-section.fade-in-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Staggered children reveal ── */
        .fade-in-visible .flip-card,
        .fade-in-visible .trainer-card,
        .fade-in-visible .stat-item {
          animation: staggerUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .fade-in-visible .flip-card:nth-child(1),
        .fade-in-visible .trainer-card:nth-child(1),
        .fade-in-visible .stat-item:nth-child(1) { animation-delay: 0s; }
        .fade-in-visible .flip-card:nth-child(2),
        .fade-in-visible .trainer-card:nth-child(2),
        .fade-in-visible .stat-item:nth-child(2) { animation-delay: 0.08s; }
        .fade-in-visible .flip-card:nth-child(3),
        .fade-in-visible .trainer-card:nth-child(3),
        .fade-in-visible .stat-item:nth-child(3) { animation-delay: 0.16s; }
        .fade-in-visible .flip-card:nth-child(4),
        .fade-in-visible .trainer-card:nth-child(4),
        .fade-in-visible .stat-item:nth-child(4) { animation-delay: 0.24s; }
        .fade-in-visible .flip-card:nth-child(5),
        .fade-in-visible .trainer-card:nth-child(5) { animation-delay: 0.32s; }
        .fade-in-visible .flip-card:nth-child(6),
        .fade-in-visible .trainer-card:nth-child(6) { animation-delay: 0.40s; }
        .fade-in-visible .flip-card:nth-child(7),
        .fade-in-visible .trainer-card:nth-child(7) { animation-delay: 0.48s; }

        @keyframes staggerUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Hero title entrance ── */
        .hero-title {
          animation: heroReveal 1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
        }
        .hero-badge {
          animation: heroReveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0s both;
        }
        @keyframes heroReveal {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Smooth link underlines ── */
        a[href^="mailto"], a[href^="tel"] {
          position: relative;
        }
        a[href^="mailto"]::after, a[href^="tel"]::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 2px;
          background: currentColor;
          transition: width 0.3s ease;
        }
        a[href^="mailto"]:hover::after, a[href^="tel"]:hover::after {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
