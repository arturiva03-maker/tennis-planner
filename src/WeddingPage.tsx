import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useInView } from "framer-motion";
import "./App.css";
import { supabase } from "./supabaseClient";
import { checkIBAN, normalizeIBAN } from "./iban";
import { ImpressumContent, DatenschutzContent } from "./LegalText";

const supportsHover = typeof window !== "undefined"
  ? window.matchMedia("(hover: hover) and (pointer: fine)").matches
  : false;

// Animated counter component for stats
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const numericPart = parseInt(value);
  const isNumeric = !isNaN(numericPart);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView && isNumeric) {
      let start = 0;
      const end = numericPart;
      const duration = 2000;
      const stepTime = Math.max(Math.floor(duration / end), 30);
      const timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start >= end) clearInterval(timer);
      }, stepTime);
      return () => clearInterval(timer);
    }
  }, [isInView, isNumeric, numericPart]);

  return <span ref={ref}>{isInView ? (isNumeric ? count + suffix : value) : "0"}</span>;
}

// Reveal-on-scroll wrapper
function ScrollReveal({ children, delay = 0, direction = "up" }: { children: React.ReactNode; delay?: number; direction?: "up" | "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const hiddenTransform = direction === "up"
    ? "translateY(60px)"
    : direction === "left"
    ? "translateX(-60px)"
    : "translateX(60px)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, transform: hiddenTransform }}
      animate={isInView
        ? { opacity: 1, transform: "translate(0px, 0px)" }
        : { opacity: 0, transform: hiddenTransform }
      }
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

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

// IBAN in 4er-Blöcken formatieren (Eingabekomfort im eingebetteten Mandat)
function formatIbanGroups(value: string): string {
  return value.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}
// Mandatsreferenz für ein direkt im Buchungsfenster erteiltes SEPA-Mandat
function generateSpontanMandatsreferenz(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SEPA-${y}${m}${d}-${rnd}`;
}

// Namensfeld mit Live-Vorschlägen aus der Spieler-/Mandatsdatenbank. Der
// Mandats-Status wird NICHT in der Vorschlagsliste angezeigt, sondern erst
// nach Auswahl eines Spielers (oder exaktem Treffer) per spontan_hat_mandat
// geprüft. hatMandat: null = noch unbekannt.
function MandatNameField({
  value,
  hatMandat,
  onChange,
  placeholder,
  accountId,
  colors,
  disabled,
}: {
  value: string;
  hatMandat: boolean | null;
  onChange: (name: string, hatMandat: boolean | null) => void;
  placeholder?: string;
  accountId: string;
  colors: Record<string, string>;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const reqRef = useRef(0);
  const pickedRef = useRef(false);

  // Mandat erst bei Auswahl / exaktem Treffer prüfen (nicht für die ganze Liste)
  const resolveMandat = async (name: string) => {
    try {
      const { data } = await supabase.rpc("spontan_hat_mandat", { p_account_id: accountId, p_name: name, p_email: null });
      onChange(name, Boolean(data));
    } catch {
      onChange(name, false);
    }
  };

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (pickedRef.current) {
      pickedRef.current = false;
      return;
    }
    const my = ++reqRef.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc("spontan_spieler_suche", { p_account_id: accountId, q });
        if (my !== reqRef.current) return;
        const list = (Array.isArray(data) ? data : []) as string[];
        setSuggestions(list);
        setOpen(list.length > 0);
        // Mandat nur prüfen, wenn der getippte Name exakt einem Vorschlag entspricht
        const exact = list.find((s) => s.toLowerCase() === q.toLowerCase());
        if (exact) resolveMandat(exact);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, accountId]);

  const pick = (name: string) => {
    pickedRef.current = true;
    setOpen(false);
    setSuggestions([]);
    onChange(name, null);     // Name sofort übernehmen
    resolveMandat(name);      // Mandat im Hintergrund prüfen
  };

  const showStatus = value.trim().length >= 2 && hatMandat !== null && !open;

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, null)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          const v = value.trim();
          if (v.length >= 2) resolveMandat(v);
        }, 180)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${hatMandat === false ? "#c2392f" : colors.border}`,
          borderRadius: 2,
          fontSize: 15,
          boxSizing: "border-box",
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 30,
          background: colors.white,
          border: `1px solid ${colors.border}`,
          borderTop: "none",
          maxHeight: 220,
          overflowY: "auto",
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
        }}>
          {suggestions.map((name, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(name); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                background: "none",
                border: "none",
                borderBottom: `1px solid ${colors.bgLight}`,
                cursor: "pointer",
                fontSize: 14,
                color: colors.text,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {showStatus && (
        <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 600, color: hatMandat ? "#1a7a3a" : "#c2392f" }}>
          {hatMandat ? "✓ SEPA-Lastschriftmandat hinterlegt" : "⚠ Kein SEPA-Lastschriftmandat hinterlegt"}
        </p>
      )}
    </div>
  );
}

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

export default function WeddingPage({ autoScrollSommertraining = false }: { autoScrollSommertraining?: boolean } = {}) {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroParallaxTransform = useTransform(heroScrollProgress, [0, 1], ["translateY(0%)", "translateY(30%)"]);

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Spontane Stunden Buchung
  const [spontaneStunden, setSpontaneStunden] = useState<SpontaneStunde[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [hasAnySlots, setHasAnySlots] = useState(false);
  const [naechsterSlot, setNaechsterSlot] = useState<{ datum: string; uhrzeitVon: string } | null>(null);
  // Trainer-Vornamen (id -> Name), damit gleichzeitige Slots verschiedener Trainer unterscheidbar sind
  const [trainerNamen, setTrainerNamen] = useState<Record<string, string>>({});
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SpontaneStunde | null>(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingNameMandat, setBookingNameMandat] = useState<boolean | null>(null);
  const [bookingEmail, setBookingEmail] = useState("");
  const [bookingTelefon, setBookingTelefon] = useState("");
  const [bookingHinweis, setBookingHinweis] = useState("");
  // Eingebettetes SEPA-Mandat (nur falls für den Bucher noch keines hinterlegt ist)
  const [bookingIban, setBookingIban] = useState("");
  const [bookingStrasse, setBookingStrasse] = useState("");
  const [bookingPlz, setBookingPlz] = useState("");
  const [bookingOrt, setBookingOrt] = useState("");
  const [bookingKontoinhaberAbweichend, setBookingKontoinhaberAbweichend] = useState(false);
  const [bookingKontoinhaberName, setBookingKontoinhaberName] = useState("");
  const [bookingMandatConsent, setBookingMandatConsent] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);


  const fetchSpontaneStunden = useCallback(async (silent = false) => {
    if (!silent) setLoadingSlots(true);
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
      if (!silent) setLoadingSlots(false);
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

    const style = document.createElement("style");
    style.textContent = `
      .wedding-page {
        --card: #faf9f5;
        --ring: #c96442;
        --input: #b4b2a7;
        --muted: #ede9de;
        --accent: #e9e6dc;
        --border: #dad9d4;
        --radius: 0.5rem;
        --chart-1: #b05730;
        --chart-2: #9c87f5;
        --chart-3: #ded8c4;
        --chart-4: #dbd3f0;
        --chart-5: #b4552d;
        --popover: #ffffff;
        --primary: #c96442;
        --sidebar: #f5f4ee;
        --secondary: #e9e6dc;
        --background: #faf9f5;
        --foreground: #3d3929;
        --destructive: #141413;
        --sidebar-ring: #b5b5b5;
        --sidebar-accent: #e9e6dc;
        --sidebar-border: #ebebeb;
        --card-foreground: #141413;
        --sidebar-primary: #c96442;
        --muted-foreground: #83827d;
        --accent-foreground: #28261b;
        --popover-foreground: #28261b;
        --primary-foreground: #ffffff;
        --sidebar-foreground: #3d3d3a;
        --secondary-foreground: #535146;
        --destructive-foreground: #ffffff;
        --sidebar-accent-foreground: #343434;
        --sidebar-primary-foreground: #fbfbfb;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(style);
    };
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

  // Gibt es überhaupt freie Termine? Und wann ist das nächste freie Training?
  const ladeNaechstenSlot = useCallback(async () => {
    const { data } = await supabase
      .from("spontane_stunden")
      .select("datum, uhrzeit_von")
      .eq("account_id", WEDDING_ACCOUNT_ID)
      .eq("anlage", "Wedding")
      .eq("veroeffentlicht", true)
      .eq("status", "offen")
      .gte("datum", todayISO())
      .order("datum", { ascending: true })
      .order("uhrzeit_von", { ascending: true })
      .limit(1);
    const first = (data || [])[0] as { datum: string; uhrzeit_von: string } | undefined;
    setHasAnySlots(Boolean(first));
    setNaechsterSlot(first ? { datum: first.datum, uhrzeitVon: first.uhrzeit_von } : null);
  }, []);

  useEffect(() => {
    ladeNaechstenSlot();
  }, [ladeNaechstenSlot]);

  // Route /sommertraining: direkt zum Buchungs-Abschnitt scrollen. Der Abschnitt
  // erscheint erst, sobald Slots geladen sind -> kurz pollen, bis er da ist.
  useEffect(() => {
    if (!autoScrollSommertraining) return;
    let tries = 0;
    const iv = window.setInterval(() => {
      const el = document.getElementById("sommertraining");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.clearInterval(iv);
      } else if (++tries > 40) {
        window.clearInterval(iv); // nach ~8s aufgeben (keine Termine vorhanden)
      }
    }, 200);
    return () => window.clearInterval(iv);
  }, [autoScrollSommertraining]);

  // Trainer-Vornamen laden (einmalig; nur id -> Vorname, via SECURITY-DEFINER-RPC)
  useEffect(() => {
    supabase
      .rpc("spontan_trainer_namen", { p_account_id: WEDDING_ACCOUNT_ID })
      .then(({ data }) => {
        if (data && typeof data === "object") setTrainerNamen(data as Record<string, string>);
      });
  }, []);

  // Realtime: Slot-Änderungen aus der App (Freigabe, neue Stunden, Buchungen)
  // sofort anzeigen, ohne dass die Seite neu geladen werden muss. Der Fetch
  // läuft "silent", damit der Kalender dabei nicht kurz ausgraut. Ref statt
  // Dependency, damit der Channel bei Monatswechseln nicht neu aufgebaut wird.
  const fetchSpontaneStundenRef = useRef(fetchSpontaneStunden);
  useEffect(() => {
    fetchSpontaneStundenRef.current = fetchSpontaneStunden;
  }, [fetchSpontaneStunden]);

  useEffect(() => {
    let debounce: number | undefined;
    const channel = supabase
      .channel("wedding_spontane_stunden")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "spontane_stunden",
          filter: `account_id=eq.${WEDDING_ACCOUNT_ID}`,
        },
        () => {
          if (debounce) window.clearTimeout(debounce);
          debounce = window.setTimeout(() => {
            fetchSpontaneStundenRef.current(true);
            ladeNaechstenSlot();
          }, 250);
        }
      )
      .subscribe();
    return () => {
      if (debounce) window.clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [ladeNaechstenSlot]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const openBookingModal = (slot: SpontaneStunde) => {
    setSelectedSlot(slot);
    setBookingName("");
    setBookingNameMandat(null);
    setBookingEmail("");
    setBookingTelefon("");
    setBookingHinweis("");
    setBookingIban("");
    setBookingStrasse("");
    setBookingPlz("");
    setBookingOrt("");
    setBookingKontoinhaberAbweichend(false);
    setBookingKontoinhaberName("");
    setBookingMandatConsent(false);
    setBookingError(null);
    setBookingSuccess(false);
    setShowBookingModal(true);
  };

  // SEPA-Mandats-Gate (nur Hauptbucher).
  // Fehlt dem Bucher ein Mandat, wird es direkt im Fenster erteilt.
  const mandatNeeded = bookingNameMandat === false;
  const ibanCheckLive = checkIBAN(bookingIban);
  const mandatFormOk =
    ibanCheckLive.valid &&
    bookingStrasse.trim() !== "" &&
    bookingPlz.trim() !== "" &&
    bookingOrt.trim() !== "" &&
    (!bookingKontoinhaberAbweichend || bookingKontoinhaberName.trim() !== "") &&
    bookingMandatConsent;
  const alleMandateOk =
    bookingName.trim() !== "" &&
    bookingNameMandat !== null &&
    (bookingNameMandat === true || mandatFormOk);

  const submitBooking = async () => {
    if (!selectedSlot) return;

    const name = bookingName.trim();
    const email = bookingEmail.trim();
    const telefon = bookingTelefon.trim();
    const hinweis = bookingHinweis.trim();

    if (!name) {
      setBookingError("Bitte geben Sie Ihren Namen ein.");
      return;
    }
    if (!email || !email.includes("@")) {
      setBookingError("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    if (bookingNameMandat === null) {
      setBookingError("Bitte geben Sie Ihren vollständigen Namen ein.");
      return;
    }
    if (mandatNeeded && !mandatFormOk) {
      setBookingError(
        !ibanCheckLive.valid
          ? "Bitte geben Sie eine gültige IBAN für das SEPA-Mandat ein."
          : "Bitte füllen Sie die Bankdaten aus und bestätigen Sie das SEPA-Lastschriftmandat."
      );
      return;
    }

    setBookingSubmitting(true);
    setBookingError(null);

    try {
      // Kein Mandat hinterlegt? Dann wird es direkt hier erteilt (kein Link, keine
      // Weiterleitung), damit sofort gebucht werden kann.
      if (mandatNeeded) {
        const parts = name.split(/\s+/);
        const vorname = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
        const nachname = parts.length > 1 ? parts[parts.length - 1] : "";
        const { error: mandatError } = await supabase.from("sepa_mandates").insert({
          account_id: WEDDING_ACCOUNT_ID,
          vorname,
          nachname,
          ist_kind: bookingKontoinhaberAbweichend,
          elternteil_name: bookingKontoinhaberAbweichend ? bookingKontoinhaberName.trim() : null,
          strasse: bookingStrasse.trim(),
          plz: bookingPlz.trim(),
          ort: bookingOrt.trim(),
          iban: normalizeIBAN(bookingIban),
          email,
          telefon: telefon || "",
          mandatsreferenz: generateSpontanMandatsreferenz(),
          unterschriftsdatum: new Date().toISOString().split("T")[0],
          anlage: "Wedding",
        });
        if (mandatError) {
          console.error("Mandat-Fehler:", mandatError);
          setBookingError("Das SEPA-Mandat konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.");
          setBookingSubmitting(false);
          return;
        }
      }

      // Bucht den Slot und übernimmt ihn serverseitig direkt in den App-Kalender
      const { data: buchenResult, error } = await supabase.rpc("spontan_buchen", {
        slot_id: selectedSlot.id,
        p_name: name,
        p_email: email,
        p_telefon: telefon || null,
        p_hinweis: hinweis || null,
      });

      if (error || !buchenResult?.ok) {
        console.error("Booking error:", error, buchenResult);
        if (buchenResult?.fehler === "kein_mandat") {
          const namen = Array.isArray(buchenResult.ohneMandat) ? buchenResult.ohneMandat.join(", ") : "";
          setBookingError(`Für folgende Personen ist kein SEPA-Lastschriftmandat hinterlegt: ${namen}. Bitte erteilen Sie zuerst das Mandat.`);
        } else {
          setBookingError("Dieser Termin ist leider nicht mehr verfügbar.");
        }
        return;
      }

      const autoUebernommen = Boolean(buchenResult?.training_id);

      // Send confirmation email to customer
      const datumFormatted = new Date(selectedSlot.datum + "T12:00:00").toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      });

      const trainerName = trainerNamen[selectedSlot.trainerId] || "";
      const preisUebersichtHtml =
        "1 Person 40 €<br>2 Personen je 25 € pro Person<br>3 Personen je 20 € pro Person<br>4 Personen je 15 € pro Person";
      const preisUebersichtText =
        "1 Person 40 €, 2 Personen je 25 € p.P., 3 Personen je 20 € p.P., 4 Personen je 15 € p.P.";
      const hinweisHtml = hinweis.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.bgLight}; font-family: 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.bgLight};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: ${colors.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryMid} 100%); padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: ${colors.white}; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Buchungsbestätigung</h1>
            </td>
          </tr>

          <!-- Success Icon -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <div style="width: 64px; height: 64px; background: linear-gradient(135deg, ${colors.accent} 0%, ${colors.successDark} 100%); border-radius: 50%; display: inline-block; line-height: 64px; text-align: center;">
                <span style="color: ${colors.white}; font-size: 32px;">✓</span>
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <h2 style="margin: 0 0 8px; color: ${colors.primary}; font-size: 22px; font-weight: 600;">Hallo ${name}!</h2>
              <p style="margin: 0; color: ${colors.textMuted}; font-size: 16px; line-height: 1.5;">Ihr Training in den Sommerferien wurde erfolgreich gebucht.</p>
            </td>
          </tr>

          <!-- Booking Details -->
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.bgLight}; border-radius: 8px; border: 1px solid ${colors.border};">
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 16px; color: ${colors.primary}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Ihre Termindetails</p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid ${colors.border};">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: ${colors.primary}; font-size: 15px; font-weight: 600;">${datumFormatted}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid ${colors.border};">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: ${colors.primary}; font-size: 15px;">${selectedSlot.uhrzeitVon.slice(0, 5)} – ${selectedSlot.uhrzeitBis.slice(0, 5)} Uhr</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${trainerName ? `<tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid ${colors.border};">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: ${colors.primary}; font-size: 15px;">Trainer: ${trainerName}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid ${colors.border};">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: ${colors.primary}; font-size: 15px;">BSC Rehberge, Wedding</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;${hinweis ? ` border-bottom: 1px solid ${colors.border};` : ''}">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: ${colors.primary}; font-size: 14px; font-weight: 600; line-height: 1.65;">
                                ${preisUebersichtHtml}
                                <span style="display: block; font-weight: 400; font-size: 12px; color: ${colors.textMuted}; margin-top: 4px;">Preis je nach Gruppengröße · Einzug per SEPA-Lastschrift</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      ${hinweis ? `<tr>
                        <td style="padding: 8px 0;">
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: ${colors.primary}; font-size: 15px; line-height: 1.6;">${hinweisHtml}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Wichtige Hinweise -->
          <tr>
            <td style="padding: 0 40px 24px;">
              <div style="background-color: ${colors.accentBg}; border: 1px solid ${colors.accentLight}; border-radius: 8px; padding: 16px;">
                <p style="margin: 0 0 8px; color: ${colors.text}; font-size: 13px; font-weight: 700;">Wichtige Hinweise</p>
                <p style="margin: 0; color: ${colors.text}; font-size: 13px; line-height: 1.7;">
                  • In den Sommerferien findet kein reguläres Training statt – dies ist ein Einzeltermin mit einem unserer Trainer.<br>
                  • Das Training ist ausschließlich für Mitglieder buchbar.<br>
                  • Die Teilnahme setzt ein erteiltes SEPA-Lastschriftmandat voraus; der Betrag wird per Lastschrift eingezogen.<br>
                  • Eine kostenfreie Absage ist bis 48 Stunden vor dem Termin möglich – danach muss das Training bezahlt werden.
                </p>
              </div>
            </td>
          </tr>

          <!-- Cancel Link -->
          <tr>
            <td style="padding: 0 40px 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: ${colors.textMuted}; font-size: 14px;">Können Sie den Termin nicht wahrnehmen?</p>
              <p style="margin: 0 0 12px; color: ${colors.textMuted}; font-size: 13px;">Kostenfrei bis 48 Stunden vor dem Termin – bei späterer Absage wird die Stunde berechnet.</p>
              <a href="${window.location.origin}/absage/${selectedSlot.id}" style="display: inline-block; background: ${colors.bgLight}; color: ${colors.primary}; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid ${colors.border};">Termin absagen</a>
            </td>
          </tr>

          <!-- Contact Info -->
          <tr>
            <td style="padding: 0 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: ${colors.textMuted}; font-size: 14px; line-height: 1.6;">Bei Fragen erreichen Sie uns unter:</p>
              <a href="mailto:tennisabisz@gmail.com" style="color: ${colors.primary}; font-weight: 600; text-decoration: none;">tennisabisz@gmail.com</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.bgLight}; padding: 24px 40px; border-top: 1px solid ${colors.border};">
              <p style="margin: 0 0 4px; color: ${colors.primary}; font-size: 14px; font-weight: 600;">Sportliche Grüße</p>
              <p style="margin: 0; color: ${colors.primary}; font-size: 15px; font-weight: 700;">Tennisschule A bis Z</p>
              <p style="margin: 12px 0 0; color: ${colors.textSubtle}; font-size: 12px;">Standort Wedding · BSC Rehberge</p>
            </td>
          </tr>
        </table>

        <!-- Footer Text -->
        <p style="margin: 24px 0 0; color: ${colors.textSubtle}; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} Tennisschule A bis Z. Alle Rechte vorbehalten.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const preisText = `\nPreis: ${preisUebersichtText}`;

      try {
        await fetch("/api/send-newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [email],
            subject: `Buchungsbestätigung – ${datumFormatted}`,
            body: `Hallo ${name},\n\nIhr Training in den Sommerferien wurde erfolgreich gebucht!\n\nTermin: ${datumFormatted}\nUhrzeit: ${selectedSlot.uhrzeitVon} – ${selectedSlot.uhrzeitBis} Uhr\nOrt: BSC Rehberge, Wedding${trainerName ? `\nTrainer: ${trainerName}` : ""}${preisText}${hinweis ? `\nHinweis: ${hinweis}` : ""}\n\nWichtige Hinweise:\n- In den Sommerferien findet kein reguläres Training statt – dies ist ein Einzeltermin mit einem unserer Trainer.\n- Das Training ist ausschließlich für Mitglieder buchbar.\n- Die Teilnahme setzt ein erteiltes SEPA-Lastschriftmandat voraus; der Betrag wird per Lastschrift eingezogen.\n- Eine kostenfreie Absage ist bis 48 Stunden vor dem Termin möglich – danach muss das Training bezahlt werden.\n\nSollten Sie den Termin nicht wahrnehmen können, sagen Sie hier ab:\n${window.location.origin}/absage/${selectedSlot.id}\n\nFalls Sie Fragen haben, kontaktieren Sie uns unter tennisabisz@gmail.com.\n\nSportliche Grüße,\nTennisschule A bis Z`,
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
<body style="margin: 0; padding: 0; background-color: ${colors.bgLight}; font-family: 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.bgLight};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: ${colors.white}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%); padding: 24px 40px; text-align: center;">
              <h1 style="margin: 0; color: ${colors.white}; font-size: 20px; font-weight: 700;">Neue Buchung – Sommerferien-Training</h1>
            </td>
          </tr>

          <!-- Customer Info -->
          <tr>
            <td style="padding: 32px 40px 24px;">
              <p style="margin: 0 0 16px; color: ${colors.primary}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Kundendaten</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.bgLight}; border-radius: 8px; border: 1px solid ${colors.border};">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.textMuted}; font-size: 13px;">Name:</span>
                          <span style="color: ${colors.primary}; font-size: 15px; font-weight: 600; margin-left: 8px;">${name}</span>
                        </td>
                      </tr>
                      ${hinweis ? `
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.textMuted}; font-size: 13px;">Hinweis:</span>
                          <span style="color: ${colors.primary}; font-size: 15px; font-weight: 600; margin-left: 8px;">${hinweisHtml}</span>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.textMuted}; font-size: 13px;">E-Mail:</span>
                          <a href="mailto:${email}" style="color: ${colors.primary}; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      ${telefon ? `
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.textMuted}; font-size: 13px;">Telefon:</span>
                          <a href="tel:${telefon}" style="color: ${colors.primary}; font-size: 15px; font-weight: 600; margin-left: 8px; text-decoration: none;">${telefon}</a>
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
              <p style="margin: 0 0 16px; color: ${colors.primary}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Termindetails</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.accentBg}; border-radius: 8px; border: 1px solid ${colors.accentLight};">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.primary}; font-size: 15px; font-weight: 600;">${datumFormatted}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.primary}; font-size: 15px;">${selectedSlot.uhrzeitVon.slice(0, 5)} – ${selectedSlot.uhrzeitBis.slice(0, 5)} Uhr</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.primary}; font-size: 15px;">${selectedSlot.anlage}</span>
                        </td>
                      </tr>
                      ${trainerName ? `<tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.primary}; font-size: 15px;">Trainer: ${trainerName}</span>
                        </td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="color: ${colors.primary}; font-size: 13.5px; font-weight: 600; line-height: 1.6;">${preisUebersichtHtml}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Note -->
          <tr>
            <td style="background-color: ${colors.bgLight}; padding: 20px 40px; border-top: 1px solid ${colors.border}; text-align: center;">
              <p style="margin: 0; color: ${colors.textMuted}; font-size: 13px;">${autoUebernommen ? "Die Buchung wurde automatisch in den Kalender übernommen und erscheint beim Trainer." : 'Automatische Übernahme fehlgeschlagen – bitte in der App unter "Weiteres → Spontan" in den Kalender übernehmen'}</p>
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
            subject: `Neue Buchung Sommerferien-Training: ${name} – ${datumFormatted}`,
            body: `Neue Buchung Sommerferien-Training!\n\nName: ${name}\nE-Mail: ${email}${telefon ? `\nTelefon: ${telefon}` : ""}${hinweis ? `\nHinweis: ${hinweis}` : ""}\n\nTermin: ${datumFormatted}\nUhrzeit: ${selectedSlot.uhrzeitVon} – ${selectedSlot.uhrzeitBis} Uhr\nAnlage: ${selectedSlot.anlage}${preisText}\n\n${autoUebernommen ? "Die Buchung wurde automatisch in den Kalender übernommen." : "Automatische Übernahme fehlgeschlagen – bitte in der App unter Weiteres → Spontan übernehmen."}`,
            html: adminHtml,
            fromName: "Tennisschule A bis Z",
          }),
        });
      } catch (emailErr) {
        console.error("Admin email error:", emailErr);
      }

      setBookingSuccess(true);
      setSpontaneStunden((prev) => prev.filter((s) => s.id !== selectedSlot.id));
      ladeNaechstenSlot();
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

  // ── Theme: Alle Farben hier ändern ──
  const colors = {
    primary: "#c96442",        // Hauptfarbe (Buttons, Überschriften)
    primaryMid: "#a8533a",     // Mittlere Variante (E-Mail-Header Gradient)
    primaryDark: "#8b4430",    // Dunklere Variante (Gradient-Ende)
    primaryLight: "#d97757",   // Helle Akzentfarbe (Links, Highlights)
    accent: "#c96442",         // Akzent (Badges, Borders, Dots)
    accentLight: "#e8a48e",    // Heller Akzent (Gradient-Mitte)
    accentDark: "#b05730",     // Dunkler Akzent
    accentBg: "#faf3ef",       // Akzent-Hintergrund (z.B. Info-Boxen)
    white: "#faf9f5",          // Weiß / Hintergrund
    bgLight: "#ede9de",        // Heller Hintergrund
    bgDark: "#3d3929",         // Dunkler Hintergrund (Footer)
    text: "#3d3929",           // Primärtext
    textMuted: "#83827d",      // Gedämpfter Text
    textSubtle: "#b4b2a7",     // Subtiler Text (Footer-Details)
    border: "#dad9d4",         // Rahmenfarbe
    success: "#c96442",        // Erfolg (Bestätigungs-Icons)
    successDark: "#b05730",    // Erfolg dunkel
    error: "#141413",          // Fehler
    errorBg: "#ede9de",        // Fehler-Hintergrund
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
      name: "Marc Erdogan",
      qualification: "C-Lizenz Leistungssport",
      bio: "Trainiert Spieler aller Alters- und Leistungsstufen. Fokus auf Technik, Taktik und mentale Stärke.",
      image: "/marc-erdogan.jpg",
      imagePosition: "10% center",
    },
    {
      name: "Konstantin Klein",
      qualification: "C-Lizenz Leistungssport",
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
    {
      name: "Ramon Odavas",
      qualification: "C-Trainer in Ausbildung",
      bio: "",
      image: "/ramon-odavas.jpg",
      imagePosition: "center 20%",
    },
    {
      name: "Leon Weinfurtner",
      qualification: "C-Trainer",
      bio: "",
    },
  ];

  return (
    <div className="wedding-page" style={{
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
              color: scrolled ? colors.primary : colors.white,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}>
              Tennisschule A bis Z
            </span>

            {/* Desktop Menu */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }} className="desktop-menu">
              {["Angebot", "Tarife", "Aktuelles", ...(hasAnySlots ? ["Sommertraining"] : []), "Trainer", "FAQ", "Kontakt"].map((item) => (
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
                color: scrolled ? colors.text : colors.white,
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
          <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, transform: "translateY(-8px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              exit={{ opacity: 0, transform: "translateY(-8px)" }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
              background: colors.white,
              padding: 16,
              borderTop: `1px solid ${colors.border}`,
            }}>
              {["Angebot", "Tarife", "Aktuelles", ...(hasAnySlots ? ["Sommertraining"] : []), "Trainer", "FAQ", "Kontakt"].map((item) => (
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
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        ref={heroRef}
        style={{
          position: "relative",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        {/* Background photo with parallax */}
        <motion.img
          src="/hero-wedding.webp"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "120%",
            objectFit: "cover",
            objectPosition: "center 60%",
            transform: heroParallaxTransform,
          }}
        />
        {/* Dark overlay for text readability */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(160deg, rgba(10,10,10,0.55) 0%, rgba(23,23,23,0.35) 40%, rgba(23,23,23,0.25) 70%, rgba(10,10,10,0.45) 100%)",
          pointerEvents: "none",
        }} />
        {/* Grain texture */}
        <div className="grain-overlay" style={{
          position: "absolute",
          inset: 0,
          opacity: 0.25,
          pointerEvents: "none",
          mixBlendMode: "overlay",
        }} />

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "relative",
            zIndex: 10,
            width: "100%",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "140px 24px 100px",
          }}
        >
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
                background: colors.accent,
                display: "inline-block",
                boxShadow: "0 0 8px rgba(201, 100, 66, 0.6)",
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
              <span style={{ color: colors.white, display: "block" }}>Tennisschule</span>
              <span style={{
                background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentLight} 50%, ${colors.accent} 100%)`,
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
              Professionelles Tennistraining in Berlin-Wedding –{" "}
              <span style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "rgba(255,255,255,0.95)" }}>
                vom ersten Schlag bis zum Wettkampf.
              </span>
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
              <a
                href="#trainer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  color: colors.white,
                  padding: "16px 32px",
                  borderRadius: 8,
                  fontWeight: 500,
                  fontSize: 16,
                  textDecoration: "none",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  transition: "border-color 160ms ease, background 160ms ease, transform 160ms cubic-bezier(0.23, 1, 0.32, 1)",
                }}
                onMouseEnter={(e) => {
                  if (!supportsHover) return;
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "";
                }}
                onPointerDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
                onPointerUp={(e) => { e.currentTarget.style.transform = ""; }}
              >
                Unser Team
              </a>
            </div>
          </div>
        </motion.div>

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
            { number: "6", suffix: "", label: "Trainer" },
            { number: "150", suffix: "+", label: "Aktive Spieler" },
            { number: "2", suffix: "", label: "Standorte in Berlin" },
            { number: "DTB", suffix: "", label: "Zertifizierte Methoden" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className="stat-item"
              style={{ textAlign: "center", minWidth: 130 }}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div style={{
                fontSize: 36,
                fontWeight: 900,
                color: "#fff",
                fontFamily: "'Fraunces', serif",
                lineHeight: 1,
                marginBottom: 6,
              }}>
                <AnimatedCounter value={stat.number} suffix={stat.suffix} />
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Unser Angebot Section */}
      <section id="angebot" style={{ padding: "100px 24px", background: colors.bgLight, position: "relative" }}>
        {/* Subtle geometric pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03, pointerEvents: "none",
          backgroundImage: `radial-gradient(circle at 1px 1px, ${colors.primary} 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <ScrollReveal>
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
              Tennis für jedes Alter und Level
            </h2>
            <p style={{ fontSize: 16, color: colors.textMuted, lineHeight: 1.7 }}>
              Von den ersten Schlägerfahrungen bis zum Wettkampftennis – wir begleiten euch auf jedem Level.
            </p>
          </div>
          </ScrollReveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {[
              {
                title: "Kindertraining",
                subtitle: "ab 5 Jahren",
                desc: "Tennis nach dem DTB-Konzept (Play+Stay / Tennis 10s). Altersgerechte Bälle, angepasste Feldgrößen und viel Bewegung – Spaß an erster Stelle.",
              },
              {
                title: "Jugendtraining",
                subtitle: "Technik, Taktik & Spielverständnis",
                desc: "Gezieltes Training an Technik, Taktik und Spielverständnis. Mix aus Korbtraining, Spielformen und Wettkampfsimulationen.",
              },
              {
                title: "Erwachsenentraining",
                subtitle: "Einsteiger bis Clubspieler",
                desc: "Training nach dem Tennis-Xpress-Konzept des DTB. Schnelle Spielfähigkeit und ein Training, das Fitness und Spaß verbindet.",
              },
              {
                title: "Mannschaftstraining",
                subtitle: "Wettkampforientiert",
                desc: "Wettkampforientiertes Training mit gleichstarken Spielern. Für Mannschafts- und Turnierspieler.",
              },
              {
                title: "Einzeltraining",
                subtitle: "Maximale Intensität",
                desc: "Gezieltes Arbeiten an Technik, Schwächen und individuellen Zielen – mit direktem Feedback und maximaler Intensität.",
              },
              {
                title: "Gruppentraining",
                subtitle: "Teamdynamik & Spielformen",
                desc: "Abwechslungsreiche Spielformen und die Motivation einer Gruppe. Vom Einsteiger bis zum Mannschaftsspieler.",
              },
              {
                title: "Camps",
                subtitle: "In den Sommerferien",
                desc: "Intensives Training in entspannter Atmosphäre. Mehrere Stunden Tennis pro Tag, kombiniert mit Spielen und Spaß.",
              },
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
              <div
                className="angebot-card"
                style={{
                  position: "relative",
                  height: "100%",
                  boxSizing: "border-box",
                  background: colors.white,
                  borderRadius: 14,
                  border: `1px solid ${colors.border}`,
                  padding: "26px 24px 24px",
                  overflow: "hidden",
                  transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.35s ease",
                }}
                onMouseEnter={(e) => {
                  if (!supportsHover) return;
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 18px 40px rgba(61, 57, 41, 0.10)";
                  e.currentTarget.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                <span aria-hidden="true" style={{
                  position: "absolute",
                  top: -16,
                  right: 8,
                  fontFamily: "'Fraunces', serif",
                  fontStyle: "italic",
                  fontWeight: 900,
                  fontSize: 90,
                  lineHeight: 1,
                  color: colors.primary,
                  opacity: 0.08,
                  pointerEvents: "none",
                  userSelect: "none",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p style={{
                  fontSize: 11,
                  color: colors.primary,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  margin: "0 0 10px",
                }}>
                  {item.subtitle}
                </p>
                <h3 style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: colors.text,
                  marginBottom: 10,
                  fontFamily: "'Fraunces', serif",
                  letterSpacing: "-0.3px",
                }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.65, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Tarife Section */}
      <section id="tarife" style={{ padding: "100px 24px", background: colors.white, position: "relative" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <ScrollReveal>
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
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
          <div style={{
            background: "#fffefb",
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: "10px 40px",
            boxShadow: "0 10px 40px rgba(61, 57, 41, 0.06)",
          }}>
            {[
              {
                name: "Einzeltraining",
                desc: "Individuelles 1:1-Training mit vollem Fokus auf Ihre Ziele",
                price: "40 €",
                unit: "pro Stunde",
              },
              {
                name: "Gruppentraining",
                desc: "Training in Gruppen von bis zu 5 Personen",
                price: "60 €",
                unit: "pro Monat",
              },
            ].map((tarif, i, arr) => (
              <div key={tarif.name} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 24,
                flexWrap: "wrap",
                padding: "30px 0",
                borderBottom: i < arr.length - 1 ? `1px solid ${colors.border}` : "none",
              }}>
                <div style={{ flex: "1 1 240px" }}>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: colors.text, margin: "0 0 6px", fontFamily: "'Fraunces', serif", letterSpacing: "-0.3px" }}>
                    {tarif.name}
                  </h3>
                  <p style={{ fontSize: 14, color: colors.textMuted, margin: 0, lineHeight: 1.6 }}>
                    {tarif.desc}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 40, fontWeight: 900, color: colors.primary, fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
                    {tarif.price}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: colors.textMuted, textTransform: "uppercase", letterSpacing: "1px", marginTop: 4 }}>
                    {tarif.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
          </ScrollReveal>

          <p style={{
            marginTop: 24,
            fontSize: 13,
            color: colors.textMuted,
            textAlign: "center",
            fontStyle: "italic",
          }}>
            Im Winter zzgl. Hallengebühren
          </p>
          <p style={{
            marginTop: 8,
            fontSize: 13,
            textAlign: "center",
          }}>
            <a href="/agb" style={{ color: colors.primary, textDecoration: "none", fontWeight: 500 }}>
              Trainingsbedingungen und Preise ansehen
            </a>
          </p>
        </div>
      </section>

      {/* Aktuelles Section */}
      <section id="aktuelles" style={{ padding: "100px 24px", background: colors.white, position: "relative" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <ScrollReveal>
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
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
          {/* Tenniscamp Card — photo-driven layout */}
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              maxWidth: 790,
              margin: "0 auto",
              boxShadow: "0 16px 48px rgba(0,0,0,0.12)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              minHeight: 396,
            }}
            className="camp-card"
          >
            {/* Photo side */}
            <div style={{
              position: "relative",
              overflow: "hidden",
            }}>
              <img
                src="/tenniscamp.jpg"
                alt="Tenniscamp Gruppenfoto"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "40% 40%",
                  transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                onMouseEnter={(e) => { if (supportsHover) e.currentTarget.style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              />
              {/* Gradient overlay on photo */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to right, transparent 60%, rgba(23, 23, 23, 0.3) 100%)",
                pointerEvents: "none",
              }} />
            </div>

            {/* Info side */}
            <div style={{
              background: colors.primary,
              padding: "36px 32px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              position: "relative",
            }}>
              {/* Grain */}
              <div className="grain-overlay" style={{
                position: "absolute", inset: 0, opacity: 0.12, pointerEvents: "none", mixBlendMode: "overlay",
              }} />

              <div style={{ position: "relative" }}>
                <span style={{
                  display: "inline-block",
                  background: colors.accent,
                  color: colors.bgDark,
                  padding: "5px 14px",
                  borderRadius: 100,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  marginBottom: 20,
                }}>
                  Sommerferien 2026
                </span>

                <h3 style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: colors.white,
                  marginBottom: 20,
                  fontFamily: "'Fraunces', serif",
                  letterSpacing: "-0.5px",
                  lineHeight: 1.1,
                }}>
                  Tennis&shy;camps
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  <div style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    borderLeft: `3px solid ${colors.accent}`,
                  }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "1px" }}>Kindercamp</div>
                    <div style={{ fontSize: 15, color: colors.white, fontWeight: 600 }}>10:00–15:00 Uhr · 270 €</div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    borderLeft: `3px solid ${colors.accent}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "1px" }}>Erwachsenencamp</span>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: colors.bgDark, background: colors.accent, borderRadius: 999, padding: "2px 8px" }}>Warteliste</span>
                    </div>
                    <div style={{ fontSize: 15, color: colors.white, fontWeight: 600 }}>18:00–20:00 Uhr · 140 €</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 4, lineHeight: 1.4 }}>Ausgebucht – Anmeldung nur noch über die Warteliste</div>
                  </div>
                </div>

                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 12, lineHeight: 1.5 }}>
                  13.–17. Juli & 17.–21. August
                </p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 24, lineHeight: 1.5 }}>
                  Bei nicht ausreichender Teilnehmerzahl kann ein Camp abgesagt werden. In diesem Fall bieten wir die Teilnahme in einer anderen Woche an oder erstatten die Gebühr vollständig zurück.
                </p>

                <a
                  href="/tenniscamp"
                  style={{
                    display: "inline-block",
                    background: colors.accent,
                    color: colors.bgDark,
                    padding: "12px 28px",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 14,
                    textDecoration: "none",
                    transition: "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s ease",
                    letterSpacing: "0.3px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(23, 23, 23, 0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Anmelden
                </a>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Spontane Stunden Buchung Section - nur anzeigen wenn überhaupt Slots vorhanden */}
      {hasAnySlots && (
        <section id="sommertraining"  style={{ padding: "60px 24px", background: colors.white }}>
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
                Sommerferien
              </p>
              <h2 style={{
                fontSize: 28,
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                color: colors.text,
                marginBottom: 8,
                letterSpacing: "-0.5px",
              }}>
                Training in den Sommerferien
              </h2>
              <p style={{ fontSize: 14, color: colors.textMuted }}>
                Wählen Sie einen Tag mit verfügbaren Terminen
              </p>
            </div>

            {/* Hinweistext zum Sommerferien-Training */}
            <div style={{
              maxWidth: 760,
              margin: "0 auto 32px",
              background: colors.bgLight,
              border: `1px solid ${colors.border}`,
              borderRadius: 14,
              padding: "24px 26px",
            }}>
              <p style={{ fontSize: 15, color: colors.text, lineHeight: 1.7, margin: 0 }}>
                In den Sommerferien findet kein reguläres Training statt. Ein Training mit einem unserer
                Trainer kann gerne hier gebucht werden. Dies ist ausschließlich für Mitglieder. Für die
                Teilnahme an unserem Tennistraining ist ein SEPA-Lastschriftmandat erforderlich.
              </p>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 400,
              margin: "0 auto",
            }}>
              {/* Nächstes freies Training – schneller Einstieg */}
              {naechsterSlot && (
                <button
                  onClick={() => {
                    const d = new Date(naechsterSlot.datum + "T12:00:00");
                    setCurrentMonth({ year: d.getFullYear(), month: d.getMonth() });
                    setSelectedDate(naechsterSlot.datum);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                    background: colors.accentBg,
                    border: `1px solid ${colors.accentLight}`,
                    borderRadius: 12,
                    padding: "13px 16px",
                    cursor: "pointer",
                    textAlign: "left",
                    touchAction: "manipulation",
                  }}
                >
                  <span style={{ fontSize: 13.5, color: colors.text, lineHeight: 1.5 }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: colors.accentDark, marginBottom: 2 }}>
                      Nächstes freies Training
                    </span>
                    <strong>
                      {new Date(naechsterSlot.datum + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "long" })}
                      {" · "}{naechsterSlot.uhrzeitVon.slice(0, 5)} Uhr
                    </strong>
                  </span>
                  <span style={{ color: colors.primary, fontWeight: 700, fontSize: 18, flexShrink: 0 }}>→</span>
                </button>
              )}

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
                      touchAction: "manipulation",
                    }}
                  >
                    ‹
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <span style={{ fontWeight: 600, color: colors.text, fontSize: 16 }}>
                      {monthNames[currentMonth.month]} {currentMonth.year}
                    </span>
                    <button
                      onClick={() => {
                        const d = new Date();
                        setCurrentMonth({ year: d.getFullYear(), month: d.getMonth() });
                        setSelectedDate(todayISO());
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        color: colors.primary,
                        padding: "2px 8px",
                        touchAction: "manipulation",
                      }}
                    >
                      Heute
                    </button>
                  </div>
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
                      touchAction: "manipulation",
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
                  opacity: loadingSlots ? 0.55 : 1,
                  transition: "opacity 0.2s ease",
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
                          border: isToday || isSelected ? `2px solid ${colors.primary}` : "2px solid transparent",
                          borderRadius: 8,
                          background: isSelected ? colors.primary : "transparent",
                          color: isSelected ? colors.white : isPast ? colors.border : colors.text,
                          cursor: hasSlots && !isPast ? "pointer" : "default",
                          fontWeight: isToday || isSelected ? 600 : 400,
                          fontSize: 14,
                          transition: "background 0.15s, color 0.15s, border-color 0.15s",
                          touchAction: "manipulation",
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

              {/* Time Slots Panel – immer gerendert, damit beim Tippen nichts aufklappt/springt */}
              <div style={{
                background: colors.bgLight,
                borderRadius: 12,
                padding: 20,
                minHeight: 118,
                boxSizing: "border-box",
              }}>
                {!selectedDate ? (
                  <p style={{ color: colors.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                    Wählen Sie oben einen Tag mit Punkt-Markierung, um die freien Uhrzeiten zu sehen.
                  </p>
                ) : (
                <>
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
                            e.currentTarget.style.background = colors.bgLight;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = colors.border;
                            e.currentTarget.style.background = colors.white;
                          }}
                        >
                          <span>{slot.uhrzeitVon.slice(0, 5)} – {slot.uhrzeitBis.slice(0, 5)} Uhr</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: colors.textMuted, fontSize: 14 }}>
                      Keine Termine an diesem Tag
                    </p>
                  )}
                </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Trainer Section */}
      <section id="trainer" style={{ padding: "100px 24px", background: colors.bgLight, position: "relative" }}>
        {/* Dot pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.025, pointerEvents: "none",
          backgroundImage: `radial-gradient(circle at 1px 1px, ${colors.primary} 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <ScrollReveal>
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
          </ScrollReveal>

          <div className="trainer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {trainers.map((trainer, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
              <div
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
                  if (!supportsHover) return;
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
                    background: `linear-gradient(135deg, ${colors.bgLight} 0%, ${colors.border} 100%)`,
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
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" style={{ padding: "100px 24px", background: colors.white, position: "relative" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <ScrollReveal>
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
              Häufig gestellte Fragen
            </h2>
          </div>
          </ScrollReveal>

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
                a: "Die reguläre Trainingsgruppe besteht aus bis zu 5 Personen. Kleinere Gruppen sind nach Absprache möglich."
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
                  display: "grid",
                  gridTemplateRows: openFaqIndex === i ? "1fr" : "0fr",
                  transition: openFaqIndex === i
                    ? "grid-template-rows 350ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease-out"
                    : "grid-template-rows 180ms cubic-bezier(0.4, 0, 1, 1), opacity 150ms ease-in",
                  opacity: openFaqIndex === i ? 1 : 0,
                }}>
                  <div style={{ minHeight: 0, overflow: "hidden" }}>
                  <div style={{ padding: "0 24px 24px" }}>
                    <p style={{ fontSize: 15, color: colors.textMuted, lineHeight: 1.7, margin: 0 }}>
                      {faq.a}
                    </p>
                  </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Kontakt Section */}
      <section id="kontakt" style={{
        padding: "100px 24px",
        background: `linear-gradient(165deg, ${colors.bgLight} 0%, ${colors.border} 100%)`,
        position: "relative",
      }}>
        {/* Diagonal top cut */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 60,
          background: colors.white,
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 0 100%)",
        }} />
        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
          <ScrollReveal>
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
          </ScrollReveal>

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
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 4.5-7 13-7 13S5 13.5 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
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
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.07 11.9 19.79 19.79 0 0 1 1 3.32 2 2 0 0 1 2.96 1.1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.18-1.18a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z"/></svg>
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
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
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
      <footer style={{ background: colors.bgDark, color: colors.white, padding: "56px 24px", position: "relative" }}>
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
                {["Angebot", "Tarife", "Aktuelles", ...(hasAnySlots ? ["Sommertraining"] : []), "Trainer", "FAQ", "Kontakt"].map((item) => (
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
            <p>&copy; {new Date().getFullYear()} Tennisschule A bis Z. Alle Rechte vorbehalten.</p>
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
              background: colors.white,
              maxWidth: 600,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 32,
              borderRadius: 16,
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
              <ImpressumContent />
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
              background: colors.white,
              maxWidth: 600,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              borderRadius: 16,
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
              <DatenschutzContent />
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedSlot && (
        <div
          className="tcb-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => !bookingSubmitting && setShowBookingModal(false)}
        >
          <div
            className="tcb-card"
            style={{
              background: colors.white,
              width: "100%",
              overflow: "auto",
              WebkitOverflowScrolling: "touch",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {bookingSuccess ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.successDark} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                  boxShadow: "0 8px 24px rgba(201, 100, 66, 0.25)",
                }}>
                  <span style={{ color: colors.white, fontSize: 36, fontWeight: 300 }}>✓</span>
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
                    <span style={{ color: colors.text }}>
                      {selectedSlot.uhrzeitVon.slice(0, 5)} – {selectedSlot.uhrzeitBis.slice(0, 5)} Uhr
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: colors.text }}>BSC Rehberge, Wedding</span>
                  </div>
                  {bookingHinweis.trim() && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 8 }}>
                      <span style={{ color: colors.text }}>{bookingHinweis.trim()}</span>
                    </div>
                  )}
                  <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}>
                    <span style={{ fontWeight: 500, color: colors.textMuted, fontSize: 13 }}>
                      Einzug per SEPA-Lastschrift
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowBookingModal(false)}
                  style={{
                    background: colors.primary,
                    color: colors.white,
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
                </div>

                <div style={{
                  background: colors.accentBg,
                  border: `1px solid ${colors.accentLight}`,
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 24,
                  fontSize: 13,
                  color: colors.text,
                  lineHeight: 1.6,
                }}>
                  <strong>Bitte beachten:</strong> In den Sommerferien findet kein reguläres Training statt –
                  dies ist ein Einzeltermin mit einem unserer Trainer, ausschließlich für Mitglieder. Für die
                  Teilnahme ist ein SEPA-Lastschriftmandat erforderlich; der Betrag wird per Lastschrift eingezogen.
                  Eine kostenfreie Absage ist bis 48 Stunden vor dem Termin möglich – danach muss das Training bezahlt werden.
                </div>

                {bookingError && (
                  <div style={{
                    background: colors.errorBg,
                    color: colors.error,
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
                  <MandatNameField
                    value={bookingName}
                    hatMandat={bookingNameMandat}
                    onChange={(n, m) => { setBookingName(n); setBookingNameMandat(m); }}
                    accountId={WEDDING_ACCOUNT_ID}
                    colors={colors}
                    disabled={bookingSubmitting}
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

                {/* Hinweis-Feld (z.B. weitere Mitspieler) */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: "block", fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                    Hinweis (optional)
                  </label>
                  <textarea
                    value={bookingHinweis}
                    onChange={(e) => setBookingHinweis(e.target.value)}
                    disabled={bookingSubmitting}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${colors.border}`,
                      borderRadius: 2,
                      fontSize: 15,
                      fontFamily: "inherit",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                  <p style={{ margin: "8px 0 0", fontSize: 12.5, color: colors.textMuted, lineHeight: 1.5 }}>
                    Wenn Sie weitere Mitspieler mitbringen, passt sich der Preis an: 1 Person 40 €, 2 Personen je 25 €,
                    3 Personen je 20 €, 4 Personen je 15 € (pro Person).
                  </p>
                </div>

                {/* Kein Mandat hinterlegt? SEPA-Lastschriftmandat direkt hier erteilen */}
                {mandatNeeded && (
                  <div style={{
                    background: colors.bgLight,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20,
                  }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 14, color: colors.text }}>SEPA-Lastschriftmandat</p>
                    <p style={{ margin: "0 0 14px", fontSize: 12.5, color: colors.textMuted, lineHeight: 1.5 }}>
                      Für Sie ist noch kein Mandat hinterlegt. Erteilen Sie es einmalig direkt hier – danach buchen Sie sofort, ganz ohne Umweg.
                    </p>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: 5, fontSize: 13 }}>IBAN *</label>
                      <input
                        type="text"
                        value={bookingIban}
                        onChange={(e) => setBookingIban(formatIbanGroups(e.target.value))}
                        disabled={bookingSubmitting}
                        autoComplete="off"
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${bookingIban.trim() && !ibanCheckLive.valid ? "#c2392f" : colors.border}`, borderRadius: 2, fontSize: 15, fontFamily: "monospace", letterSpacing: 0.5, boxSizing: "border-box" }}
                      />
                      {bookingIban.trim() && !ibanCheckLive.valid && (
                        <p style={{ margin: "5px 0 0", fontSize: 12, color: "#c2392f" }}>Bitte geben Sie eine gültige IBAN ein.</p>
                      )}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontWeight: 600, marginBottom: 5, fontSize: 13 }}>Straße und Hausnummer *</label>
                      <input
                        type="text"
                        value={bookingStrasse}
                        onChange={(e) => setBookingStrasse(e.target.value)}
                        disabled={bookingSubmitting}
                        style={{ width: "100%", padding: "10px 12px", border: `1px solid ${colors.border}`, borderRadius: 2, fontSize: 15, boxSizing: "border-box" }}
                      />
                    </div>

                    <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 110, flexShrink: 0 }}>
                        <label style={{ display: "block", fontWeight: 600, marginBottom: 5, fontSize: 13 }}>PLZ *</label>
                        <input
                          type="text"
                          value={bookingPlz}
                          onChange={(e) => setBookingPlz(e.target.value)}
                          inputMode="numeric"
                          disabled={bookingSubmitting}
                          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${colors.border}`, borderRadius: 2, fontSize: 15, boxSizing: "border-box" }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <label style={{ display: "block", fontWeight: 600, marginBottom: 5, fontSize: 13 }}>Ort *</label>
                        <input
                          type="text"
                          value={bookingOrt}
                          onChange={(e) => setBookingOrt(e.target.value)}
                          disabled={bookingSubmitting}
                          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${colors.border}`, borderRadius: 2, fontSize: 15, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>

                    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 12.5, color: colors.text, lineHeight: 1.5, marginBottom: 12 }}>
                      <input
                        type="checkbox"
                        checked={bookingKontoinhaberAbweichend}
                        onChange={(e) => setBookingKontoinhaberAbweichend(e.target.checked)}
                        disabled={bookingSubmitting}
                        style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18 }}
                      />
                      <span>Kontoinhaber/in weicht vom Teilnehmer ab (z.B. Elternteil bei Kindern).</span>
                    </label>
                    {bookingKontoinhaberAbweichend && (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontWeight: 600, marginBottom: 5, fontSize: 13 }}>Name des Kontoinhabers / der/des Erziehungsberechtigten *</label>
                        <input
                          type="text"
                          value={bookingKontoinhaberName}
                          onChange={(e) => setBookingKontoinhaberName(e.target.value)}
                          disabled={bookingSubmitting}
                          style={{ width: "100%", padding: "10px 12px", border: `1px solid ${colors.border}`, borderRadius: 2, fontSize: 15, boxSizing: "border-box" }}
                        />
                      </div>
                    )}
                    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 12.5, color: colors.text, lineHeight: 1.5 }}>
                      <input
                        type="checkbox"
                        checked={bookingMandatConsent}
                        onChange={(e) => setBookingMandatConsent(e.target.checked)}
                        disabled={bookingSubmitting}
                        style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18 }}
                      />
                      <span>Ich ermächtige die Tennisschule A bis Z, Zahlungen von meinem Konto mittels SEPA-Lastschrift einzuziehen, und weise mein Kreditinstitut an, die Lastschriften einzulösen.</span>
                    </label>
                  </div>
                )}

                <button
                  onClick={submitBooking}
                  disabled={bookingSubmitting || !alleMandateOk}
                  style={{
                    width: "100%",
                    background: (bookingSubmitting || !alleMandateOk) ? colors.textMuted : colors.primary,
                    color: colors.white,
                    border: "none",
                    padding: "14px 24px",
                    borderRadius: 2,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: (bookingSubmitting || !alleMandateOk) ? "not-allowed" : "pointer",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {bookingSubmitting ? "Wird gebucht..." : mandatNeeded ? "Mandat erteilen & buchen" : "Verbindlich buchen"}
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
          .camp-card { grid-template-columns: 1fr !important; }
          .camp-card > div:first-child { min-height: 220px; }
        }
        @media (max-width: 1100px) {
          .camp-card { max-width: 100% !important; }
        }

        /* ── Buchungs-Modal (mobil-freundlich, auf kleinen Screens als Bottom-Sheet) ── */
        .tcb-overlay { align-items: center; padding: 16px; }
        .tcb-card { max-width: 500px; max-height: 85vh; padding: 32px; border-radius: 16px; }
        @media (max-width: 600px) {
          .tcb-overlay { align-items: flex-end; padding: 0; }
          .tcb-card { max-width: 100%; max-height: 94vh; padding: 20px 16px calc(20px + env(safe-area-inset-bottom)); border-radius: 18px 18px 0 0; }
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
        .fade-in-visible .angebot-card,
        .fade-in-visible .trainer-card,
        .fade-in-visible .stat-item {
          animation: staggerUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .fade-in-visible .angebot-card:nth-child(1),
        .fade-in-visible .trainer-card:nth-child(1),
        .fade-in-visible .stat-item:nth-child(1) { animation-delay: 0s; }
        .fade-in-visible .angebot-card:nth-child(2),
        .fade-in-visible .trainer-card:nth-child(2),
        .fade-in-visible .stat-item:nth-child(2) { animation-delay: 0.08s; }
        .fade-in-visible .angebot-card:nth-child(3),
        .fade-in-visible .trainer-card:nth-child(3),
        .fade-in-visible .stat-item:nth-child(3) { animation-delay: 0.16s; }
        .fade-in-visible .angebot-card:nth-child(4),
        .fade-in-visible .trainer-card:nth-child(4),
        .fade-in-visible .stat-item:nth-child(4) { animation-delay: 0.24s; }
        .fade-in-visible .angebot-card:nth-child(5),
        .fade-in-visible .trainer-card:nth-child(5) { animation-delay: 0.32s; }
        .fade-in-visible .angebot-card:nth-child(6),
        .fade-in-visible .trainer-card:nth-child(6) { animation-delay: 0.40s; }
        .fade-in-visible .angebot-card:nth-child(7),
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
