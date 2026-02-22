import React, { useState } from "react";
import "./App.css";

export default function TenniscampInfoPage() {
  const [kindercampOpen, setKindercampOpen] = useState(false);
  const [erwachsenencampOpen, setErwachsenencampOpen] = useState(false);

  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 900 }}>
        <div style={{
          background: "linear-gradient(135deg, #1b471b 0%, #2d5a2d 100%)",
          color: "white",
          padding: "32px 24px",
          borderRadius: 8,
          marginBottom: 24,
          textAlign: "center"
        }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 700 }}>Tenniscamps 2025</h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.95 }}>Tennisschule A bis Z am BSC Rehberge</p>
        </div>

        <div style={{
          background: "var(--bg-inset)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
          lineHeight: 1.7
        }}>
          <p style={{ margin: 0 }}>
            Auch dieses Jahr bieten wir wieder Tenniscamps für Kinder und Erwachsene in den Sommerferien an.
            Egal ob Anfänger oder Fortgeschrittener – bei uns ist jeder willkommen!
            Unsere erfahrenen Trainer sorgen für ein abwechslungsreiches Programm mit viel Spaß am Spiel.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 16,
          marginBottom: 24
        }}>
          <div style={{
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20
          }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-muted)", textTransform: "uppercase" }}>Wo?</h3>
            <p style={{ margin: 0, fontWeight: 600 }}>BSC Rehberge</p>
            <p style={{ margin: "4px 0 0 0" }}>Sambesistraße 11</p>
            <p style={{ margin: "4px 0 0 0" }}>13351 Berlin-Wedding</p>
          </div>
          <div style={{
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20
          }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-muted)", textTransform: "uppercase" }}>Fragen?</h3>
            <p style={{ margin: 0 }}>
              <a href="tel:+4915560062745" style={{ color: "var(--primary)", textDecoration: "none" }}>0155 60062745</a>
            </p>
            <p style={{ margin: "4px 0 0 0" }}>
              <a href="mailto:tennisabisz@gmail.com" style={{ color: "var(--primary)", textDecoration: "none" }}>tennisabisz@gmail.com</a>
            </p>
          </div>
        </div>

        {/* ==================== KINDERCAMP ==================== */}
        <div style={{
          background: "#f0fdf4",
          border: "2px solid #22c55e",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden"
        }}>
          <button
            onClick={() => setKindercampOpen(!kindercampOpen)}
            style={{
              width: "100%",
              padding: "20px 24px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>🧒</span>
              <div>
                <h2 style={{ margin: 0, color: "#166534", fontSize: 20 }}>Kindercamp</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#15803d" }}>
                  14.-18. Juli & 18.-22. August · 10:00-15:00 Uhr · 270 €
                </p>
              </div>
            </div>
            <span style={{
              fontSize: 24,
              color: "#22c55e",
              transition: "transform 0.2s",
              transform: kindercampOpen ? "rotate(180deg)" : "rotate(0deg)"
            }}>
              ▼
            </span>
          </button>

          {kindercampOpen && (
            <div style={{ padding: "0 24px 24px 24px" }}>
              <p style={{ margin: "0 0 20px 0", fontSize: 14, lineHeight: 1.6, color: "#166534" }}>
                Eine Woche voller Tennis, Spiel und Spaß! Wir teilen die Kinder am ersten Tag in passende Gruppen ein,
                sodass jeder auf seinem Level gefördert wird. Mittags gibt's eine warme Mahlzeit – so können sich alle stärken
                für den Nachmittag.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{
                  background: "white",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>1. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>14. - 18. Juli</div>
                </div>
                <div style={{
                  background: "white",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>6. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>18. - 22. August</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#15803d" }}>Wann?</h3>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Mo - Fr, 10:00 - 15:00 Uhr</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#166534" }}>
                    Mittagspause 12:00 - 13:00 Uhr
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#15803d" }}>Kosten</h3>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#166534" }}>270 €</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#166534" }}>inkl. warmes Mittagessen</p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, margin: "0 0 8px 0", color: "#15803d" }}>So läuft ein Camptag ab:</h3>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
                  <li>Gemeinsame Aufwärmung im Park nebenan</li>
                  <li>Tennis in kleinen Gruppen (nach Spielstärke)</li>
                  <li>Mittags: Warme Mahlzeit + Pause</li>
                  <li>Bewegungsspiele & weiter geht's mit Tennis</li>
                </ul>
              </div>

              <div style={{
                background: "white",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: 14
              }}>
                <h4 style={{ fontSize: 13, margin: "0 0 8px 0", color: "#166534" }}>Was muss mit?</h4>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Sandplatzschuhe (Pflicht!) · Wasserflasche · Tennisschläger (Ausleihe möglich)
                </p>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: "#dcfce7", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                  Kostenlose Absage bis 2 Wochen vorher möglich.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ==================== ERWACHSENENCAMP ==================== */}
        <div style={{
          background: "#eff6ff",
          border: "2px solid #3b82f6",
          borderRadius: 12,
          marginBottom: 32,
          overflow: "hidden"
        }}>
          <button
            onClick={() => setErwachsenencampOpen(!erwachsenencampOpen)}
            style={{
              width: "100%",
              padding: "20px 24px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textAlign: "left"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>🎾</span>
              <div>
                <h2 style={{ margin: 0, color: "#1e40af", fontSize: 20 }}>Erwachsenencamp</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#1d4ed8" }}>
                  28.07.-01.08. & 25.-29.08. · 18:00-20:00 Uhr · 140 €
                </p>
              </div>
            </div>
            <span style={{
              fontSize: 24,
              color: "#3b82f6",
              transition: "transform 0.2s",
              transform: erwachsenencampOpen ? "rotate(180deg)" : "rotate(0deg)"
            }}>
              ▼
            </span>
          </button>

          {erwachsenencampOpen && (
            <div style={{ padding: "0 24px 24px 24px" }}>
              <p style={{ margin: "0 0 20px 0", fontSize: 14, lineHeight: 1.6, color: "#1e40af" }}>
                Fünf Abende intensives Training nach Feierabend! Wir teilen euch am ersten Tag in Gruppen ein,
                damit ihr mit Spielern auf eurem Level trainieren könnt. Unsere drei Trainer wechseln täglich
                zwischen den Gruppen – so bekommt jeder unterschiedliche Impulse.
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                marginBottom: 20
              }}>
                <div style={{
                  background: "white",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 4 }}>1. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>28. Juli - 01. Aug</div>
                </div>
                <div style={{
                  background: "white",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 4 }}>6. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>25. - 29. August</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#1d4ed8" }}>Wann?</h3>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Mo - Fr, 18:00 - 20:00 Uhr</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e40af" }}>
                    Treffpunkt kurz vor 18 Uhr am Montag
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#1d4ed8" }}>Kosten</h3>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e40af" }}>140 €</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e40af" }}>max. 12 Teilnehmer</p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, margin: "0 0 8px 0", color: "#1d4ed8" }}>Das erwartet euch:</h3>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
                  <li>Gruppentraining nach Spielstärke (Anfänger bis Fortgeschrittene)</li>
                  <li>3 Trainer, die täglich rotieren</li>
                  <li>Technik, Taktik und viele Spielformen</li>
                </ul>
              </div>

              <div style={{
                background: "white",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: 14
              }}>
                <h4 style={{ fontSize: 13, margin: "0 0 8px 0", color: "#1e40af" }}>Was muss mit?</h4>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Eigener Schläger · Sandplatzschuhe (Pflicht!) · Wasserflasche
                </p>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: "#dbeafe", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1e40af" }}>
                  Kostenlose Absage bis 2 Wochen vorher möglich.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Stornierung */}
        <div style={{
          background: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: 8,
          padding: 16,
          marginBottom: 32,
          fontSize: 14,
          color: "#78350f",
          lineHeight: 1.6
        }}>
          <strong>Zur Stornierung:</strong> Die Gebühr wird 2 Wochen vor Campbeginn abgebucht.
          Bis dahin könnt ihr kostenfrei absagen – einfach kurze Mail an{" "}
          <a href="mailto:tennisabisz@gmail.com" style={{ color: "#92400e" }}>tennisabisz@gmail.com</a>.
          Danach ist eine Erstattung leider nicht mehr möglich.
        </div>

        {/* Anmeldung Button */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a
            href="/tenniscamp"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #1b471b 0%, #2d5a2d 100%)",
              color: "white",
              padding: "16px 40px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 18,
              boxShadow: "0 4px 12px rgba(27, 71, 27, 0.3)"
            }}
          >
            Jetzt anmelden
          </a>
        </div>

        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          <p style={{ margin: 0 }}>Wir freuen uns auf euch!</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>Euer Trainerteam A bis Z</p>
        </div>
      </div>
    </div>
  );
}
