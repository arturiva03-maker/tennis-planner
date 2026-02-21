import React, { useState, useEffect } from "react";
import "./App.css";

export default function WeddingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

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
      imagePosition: "20% center",
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
              {["Aktuelles", "Trainer", "Kontakt"].map((item) => (
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
              {["Aktuelles", "Trainer", "Kontakt"].map((item) => (
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

      {/* Trainer Section */}
      <section id="trainer" style={{ padding: "80px 24px", background: colors.bgLight }}>
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
                {["Aktuelles", "Trainer", "Kontakt"].map((item) => (
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
