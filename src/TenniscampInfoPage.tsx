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
          <h1 style={{ margin: "0 0 8px 0", fontSize: 28, fontWeight: 700 }}>Tenniscamps 2026</h1>
          <p style={{ margin: 0, fontSize: 16, opacity: 0.95 }}>Tennisschule A bis Z am BSC Rehberge</p>
        </div>

        <div style={{
          marginBottom: 24,
          lineHeight: 1.7,
          fontSize: 15
        }}>
          <p style={{ margin: 0 }}>
            In den Sommerferien 2026 finden am BSC Rehberge Tenniscamps für Kinder und Erwachsene statt.
            Das Kindercamp läuft täglich von 10:00 bis 15:00 Uhr inklusive Mittagessen (270 €).
            Das Erwachsenencamp findet abends von 18:00 bis 20:00 Uhr statt (140 €).
            Die Teilnehmer werden nach Spielstärke in Gruppen eingeteilt.
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
            <div>
                <h2 style={{ margin: 0, color: "#166534", fontSize: 20 }}>Kindercamp</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#15803d" }}>
                  13.-17. Juli & 17.-21. August · 10:00-15:00 Uhr · 270 €
                </p>
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
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>13. - 17. Juli</div>
                </div>
                <div style={{
                  background: "white",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>LETZTE FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>17. - 21. August</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#15803d" }}>Uhrzeit</h3>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Mo - Fr, 10:00 - 15:00 Uhr</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#166534" }}>
                    Mittagspause 12:00 - 13:00 Uhr
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#15803d" }}>Kosten</h3>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#166534" }}>270 €</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#166534" }}>inkl. Mittagessen</p>
                </div>
              </div>

              <div style={{
                background: "white",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: 14,
                marginBottom: 12
              }}>
                <h4 style={{ fontSize: 13, margin: "0 0 8px 0", color: "#166534" }}>Mitzubringen</h4>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Sandplatzschuhe (Pflicht) · Wasserflasche · Tennisschläger (Ausleihe möglich)
                </p>
              </div>

              <div style={{ padding: "12px 14px", background: "#dcfce7", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                  Kostenlose Stornierung bis 2 Wochen vor Beginn.
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
            <div>
                <h2 style={{ margin: 0, color: "#1e40af", fontSize: 20 }}>Erwachsenencamp</h2>
                <p style={{ margin: "4px 0 0 0", fontSize: 14, color: "#1d4ed8" }}>
                  13.-17. Juli & 17.-21. August · 18:00-20:00 Uhr · 140 €
                </p>
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
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>13. - 17. Juli</div>
                </div>
                <div style={{
                  background: "white",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 4 }}>LETZTE FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>17. - 21. August</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#1d4ed8" }}>Uhrzeit</h3>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Mo - Fr, 18:00 - 20:00 Uhr</p>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#1d4ed8" }}>Kosten</h3>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e40af" }}>140 €</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e40af" }}>max. 12 Teilnehmer</p>
                </div>
              </div>

              <div style={{
                background: "white",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: 14,
                marginBottom: 12
              }}>
                <h4 style={{ fontSize: 13, margin: "0 0 8px 0", color: "#1e40af" }}>Mitzubringen</h4>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Eigener Schläger · Sandplatzschuhe (Pflicht) · Wasserflasche
                </p>
              </div>

              <div style={{ padding: "12px 14px", background: "#dbeafe", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1e40af" }}>
                  Kostenlose Stornierung bis 2 Wochen vor Beginn.
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
          marginBottom: 24,
          fontSize: 14,
          color: "#78350f",
          lineHeight: 1.6
        }}>
          <strong>Stornierung:</strong> Die Gebühr wird 2 Wochen vor Campbeginn abgebucht.
          Bis dahin ist eine kostenfreie Stornierung per E-Mail an{" "}
          <a href="mailto:tennisabisz@gmail.com" style={{ color: "#92400e" }}>tennisabisz@gmail.com</a> möglich.
        </div>
      </div>
    </div>
  );
}
