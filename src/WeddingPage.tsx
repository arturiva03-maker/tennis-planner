import React, { useState, useEffect } from "react";
import "./App.css";

export default function WeddingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const news = [
    {
      title: "Sommer Tenniscamps",
      date: "26. Dezember 2025",
      excerpt: "Sommerferiencamps für Kinder und Erwachsene",
    },
    {
      title: "Wintertraining läuft",
      date: "20. November 2025",
      excerpt: "Auch in der kalten Jahreszeit geht das Training weiter! Unsere Hallenplätze stehen bereit.",
    },
  ];

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
    },
    {
      name: "Marc Erdogan",
      qualification: "C-Lizenz Leistungssport",
      bio: "Trainiert Spieler aller Alters- und Leistungsstufen. Fokus auf Technik, Taktik und mentale Stärke.",
    },
    {
      name: "Konstantin Klein",
      qualification: "C-Lizenz Leistungssport (in Ausbildung)",
      bio: "",
    },
    {
      name: "Sascha Ivanenko",
      qualification: "Trainer",
      bio: "30 Jahre Erfahrung im Training seiner Söhne – bis in den Berliner und deutschen Spitzensport.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", fontFamily: "inherit" }}>
      {/* Navigation */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: "all 0.3s ease",
          background: scrolled ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(8px)" : "none",
          boxShadow: scrolled ? "var(--shadow-md)" : "none",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 72 }}>
            <span style={{ fontWeight: 700, fontSize: 20, color: scrolled ? "var(--text-primary)" : "#fff" }}>
              Tennisschule <span style={{ color: "var(--primary)" }}>A bis Z</span>
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {["Aktuelles", "Trainer", "Kontakt"].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase())}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 500,
                    fontSize: 15,
                    color: scrolled ? "var(--text-secondary)" : "rgba(255,255,255,0.9)",
                    transition: "color 0.2s",
                  }}
                >
                  {item}
                </button>
              ))}
              <a
                href="https://tennistrainer-app.de/anmeldung-wedding?a=9168a8e1-d237-4316-90fe-f0e7dfb665b9"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  padding: "10px 24px",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                Training buchen
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 50%, #1e3a5f 100%)",
        }}
      >
        {/* Animated Lines */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
          <div style={{ position: "absolute", top: "25%", left: 0, right: 0, height: 1, background: "#fff" }} />
          <div style={{ position: "absolute", top: "75%", left: 0, right: 0, height: 1, background: "#fff" }} />
          <div style={{ position: "absolute", left: "25%", top: 0, bottom: 0, width: 1, background: "#fff" }} />
          <div style={{ position: "absolute", right: "25%", top: 0, bottom: 0, width: 1, background: "#fff" }} />
        </div>

        {/* Content */}
        <div style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "0 24px", maxWidth: 900 }}>
          <h1
            style={{
              fontSize: "clamp(48px, 10vw, 96px)",
              fontWeight: 900,
              color: "#fff",
              marginBottom: 16,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Tennisschule
            <span style={{ display: "block", color: "#93c5fd" }}>A bis Z</span>
          </h1>
          <p style={{ fontSize: 20, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>
            Standort Wedding
          </p>
        </div>
      </header>

      {/* Aktuelles Section */}
      <section id="aktuelles" style={{ padding: "96px 24px", background: "var(--bg-main)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Aktuelles
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {news.map((item, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-lg)",
                  padding: 24,
                  boxShadow: "var(--shadow-md)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, marginBottom: 8 }}>
                  {item.date}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {item.excerpt}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainer Section */}
      <section id="trainer" style={{ padding: "96px 24px", background: "var(--bg-card)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
              Unsere Trainer
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
            {trainers.map((trainer, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-main)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    aspectRatio: "3/4",
                    background: "var(--bg-inset)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: 48, fontWeight: 700, color: "var(--border)" }}>
                    {trainer.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                    {trainer.name}
                  </h3>
                  <p style={{ fontSize: 14, color: "var(--primary)", marginBottom: 8 }}>
                    {trainer.qualification}
                  </p>
                  {trainer.bio && (
                    <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
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
      <section id="kontakt" style={{ padding: "96px 24px", background: "var(--bg-main)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>
              Kontakt
            </h2>
            <p style={{ fontSize: 18, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Sie möchten ein Training buchen oder haben Fragen? Wir antworten meistens innerhalb von 24 Stunden.
            </p>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              borderRadius: "var(--radius-xl)",
              padding: 40,
              boxShadow: "var(--shadow-lg)",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  background: "rgba(37, 99, 235, 0.1)",
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <svg
                  style={{ width: 32, height: 32, color: "var(--primary)" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 4 }}>E-Mail</div>
              <a
                href="mailto:tennisabisz@gmail.com"
                style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
              >
                tennisabisz@gmail.com
              </a>
            </div>

            <a
              href="https://tennistrainer-app.de/anmeldung-wedding?a=9168a8e1-d237-4316-90fe-f0e7dfb665b9"
              style={{
                display: "inline-block",
                background: "var(--primary)",
                color: "#fff",
                padding: "16px 48px",
                borderRadius: "var(--radius-md)",
                fontWeight: 600,
                fontSize: 18,
                textDecoration: "none",
                boxShadow: "var(--shadow-md)",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
            >
              Training buchen
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "var(--text-primary)", color: "#fff", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 48, marginBottom: 48 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18 }}>
                Tennisschule <span style={{ color: "var(--primary-light)" }}>A bis Z</span>
              </span>
              <p style={{ marginTop: 12, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                Standort Wedding
              </p>
            </div>

            <div>
              <h4 style={{ fontWeight: 600, marginBottom: 16 }}>Navigation</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["Aktuelles", "Trainer", "Kontakt"].map((item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item.toLowerCase())}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(255,255,255,0.6)",
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
              <h4 style={{ fontWeight: 600, marginBottom: 16 }}>Rechtliches</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => setShowImpressum(true)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.6)",
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
                    color: "rgba(255,255,255,0.6)",
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

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 32, textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
            <p>&copy; 2025 Tennisschule <span style={{ color: "var(--primary-light)" }}>A bis Z</span>. Alle Rechte vorbehalten.</p>
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
            backdropFilter: "blur(4px)",
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
              borderRadius: "var(--radius-xl)",
              maxWidth: 600,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>Impressum</h2>
              <button
                onClick={() => setShowImpressum(false)}
                style={{
                  width: 40,
                  height: 40,
                  background: "var(--bg-inset)",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
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
            backdropFilter: "blur(4px)",
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
              borderRadius: "var(--radius-xl)",
              maxWidth: 600,
              width: "100%",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 32,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>Datenschutzerklärung</h2>
              <button
                onClick={() => setShowDatenschutz(false)}
                style={{
                  width: 40,
                  height: 40,
                  background: "var(--bg-inset)",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 20,
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
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
    </div>
  );
}
