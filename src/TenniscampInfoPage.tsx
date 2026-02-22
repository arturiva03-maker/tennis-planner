import React, { useState } from "react";
import "./App.css";

export default function TenniscampInfoPage() {
  const [kindercampOpen, setKindercampOpen] = useState(false);
  const [erwachsenencampOpen, setErwachsenencampOpen] = useState(false);

  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 900 }}>
        <h1>Informationen Tenniscamps 2025</h1>

        <div style={{
          background: "linear-gradient(135deg, #1b471b 0%, #2d5a2d 100%)",
          color: "white",
          padding: 24,
          borderRadius: 8,
          marginBottom: 32,
          textAlign: "center"
        }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 20 }}>Trainerteam A bis Z</h2>
          <p style={{ margin: 0, opacity: 0.9 }}>Tennisschule für Kinder und Erwachsene</p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: 16,
          marginBottom: 32
        }}>
          <div style={{
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20
          }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-muted)", textTransform: "uppercase" }}>Trainingsort</h3>
            <p style={{ margin: 0, fontWeight: 600 }}>BSC Rehberge 1945 e.V.</p>
            <p style={{ margin: "4px 0 0 0" }}>Abteilung Tennis</p>
            <p style={{ margin: "4px 0 0 0" }}>Sambesistraße 11</p>
            <p style={{ margin: "4px 0 0 0" }}>13351 Berlin</p>
          </div>
          <div style={{
            background: "var(--bg-inset)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 20
          }}>
            <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--text-muted)", textTransform: "uppercase" }}>Kontakt</h3>
            <p style={{ margin: 0 }}>
              <span style={{ marginRight: 8 }}>📞</span>
              <a href="tel:+4915560062745" style={{ color: "var(--primary)", textDecoration: "none" }}>+49 155 60062745</a>
            </p>
            <p style={{ margin: "8px 0 0 0" }}>
              <span style={{ marginRight: 8 }}>✉️</span>
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
              {/* Termine */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                marginBottom: 24
              }}>
                <div style={{
                  background: "white",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>1. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>14. - 18. Juli 2025</div>
                </div>
                <div style={{
                  background: "white",
                  border: "1px solid #bbf7d0",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>6. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>18. - 22. August 2025</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#15803d" }}>Kurszeiten</h3>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Mo - Fr, 10:00 - 15:00 Uhr</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#166534" }}>
                    inkl. Mittagspause 12:00 - 13:00 Uhr
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#15803d" }}>Kursgebühr</h3>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#166534" }}>270 € pro Kind</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#166534" }}>inkl. warme Mahlzeit</p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, margin: "0 0 8px 0", color: "#15803d" }}>Ablauf eines Trainingstages</h3>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
                  <li>Gemeinsame Aufwärmung im nahegelegenen Park</li>
                  <li>Einteilung in spielstärkengerechte Gruppen (am ersten Tag)</li>
                  <li>Gezielte Übungs- und Spielformen rund um das Tennisspiel</li>
                  <li><strong>12:00 - 13:00 Uhr:</strong> Mittagspause mit warmer Mahlzeit</li>
                  <li>Gemeinsames Bewegungsspiel nach dem Mittagessen</li>
                  <li>Fortsetzung des Tennistrainings</li>
                </ul>
              </div>

              <div style={{
                background: "white",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: 14
              }}>
                <h4 style={{ fontSize: 13, margin: "0 0 8px 0", color: "#166534" }}>Bitte mitbringen:</h4>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>Sandplatzschuhe</strong> (Pflicht!) · <strong>Ausreichend Wasser</strong> · <strong>Tennisschläger</strong> (Ausleihe möglich)
                </p>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: "#dcfce7", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                  <strong>Stornierung:</strong> Kostenfreie Absage bis zwei Wochen vor Beginn möglich (1. FW: 30.06. / 6. FW: 04.08.)
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
              {/* Termine */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                marginBottom: 24
              }}>
                <div style={{
                  background: "white",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 4 }}>1. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>28. Juli - 01. Aug 2025</div>
                </div>
                <div style={{
                  background: "white",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 11, color: "#2563eb", fontWeight: 600, marginBottom: 4 }}>6. FERIENWOCHE</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1e40af" }}>25. - 29. August 2025</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#1d4ed8" }}>Kurszeiten</h3>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Mo - Fr, 18:00 - 20:00 Uhr</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e40af" }}>
                    Treffpunkt: kurz vor 18:00 Uhr am Montag
                  </p>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, margin: "0 0 6px 0", color: "#1d4ed8" }}>Kursgebühr</h3>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e40af" }}>140 € pro Person</p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 13, color: "#1e40af" }}>max. 12 Teilnehmer, 3 Trainer</p>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, margin: "0 0 8px 0", color: "#1d4ed8" }}>Ablauf</h3>
                <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7, fontSize: 14 }}>
                  <li>Am ersten Camptag: Einteilung in spielstärkengerechte Gruppen</li>
                  <li>Gruppen bleiben für die gesamte Dauer des Camps bestehen</li>
                  <li>Die Trainer rotieren täglich zwischen den Gruppen</li>
                  <li>Gezielte Übungs- und Spielformen für alle Spielstärken</li>
                </ul>
              </div>

              <div style={{
                background: "white",
                border: "1px solid #bfdbfe",
                borderRadius: 8,
                padding: 14
              }}>
                <h4 style={{ fontSize: 13, margin: "0 0 8px 0", color: "#1e40af" }}>Bitte mitbringen:</h4>
                <p style={{ margin: 0, fontSize: 14 }}>
                  <strong>Eigener Schläger</strong> · <strong>Sandplatzschuhe</strong> (Pflicht!) · <strong>Ausreichend Wasser</strong>
                </p>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: "#dbeafe", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#1e40af" }}>
                  <strong>Stornierung:</strong> Kostenfreie Absage bis zwei Wochen vor Beginn möglich (1. FW: 14.07. / 6. FW: 11.08.)
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Allgemeine Stornierungsbedingungen */}
        <div style={{
          background: "#fef3c7",
          border: "2px solid #f59e0b",
          borderRadius: 8,
          padding: 20,
          marginBottom: 32
        }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#92400e" }}>Wichtige Hinweise zur Stornierung</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: "#78350f", lineHeight: 1.8 }}>
            <li>Die Campgebühr wird <strong>zwei Wochen vor Beginn</strong> des Camps per SEPA-Lastschrift abgebucht.</li>
            <li>Eine kostenfreie Abmeldung ist nur <strong>bis zum Abbuchungsdatum</strong> möglich.</li>
            <li>Spätere Abmeldungen können aus organisatorischen Gründen leider nicht erstattet werden.</li>
            <li>Eine Absage ist ausschließlich <strong>schriftlich per E-Mail</strong> an{" "}
              <a href="mailto:tennisabisz@gmail.com" style={{ color: "#92400e", fontWeight: 600 }}>tennisabisz@gmail.com</a>{" "}
              möglich.
            </li>
          </ul>
          <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#78350f" }}>
            Wir bitten um Verständnis, da uns viele Anmeldungen vorliegen, aber nur begrenzte Kapazitäten zur Verfügung stehen.
          </p>
        </div>

        {/* Anmeldung Button */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <a
            href="/tenniscamp"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #1b471b 0%, #2d5a2d 100%)",
              color: "white",
              padding: "16px 32px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 18,
              boxShadow: "0 4px 12px rgba(27, 71, 27, 0.3)"
            }}
          >
            Jetzt zum Tenniscamp anmelden
          </a>
        </div>

        <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
          <p style={{ margin: 0 }}>Mit sportlichen Grüßen</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 600 }}>Trainerteam A bis Z</p>
        </div>
      </div>
    </div>
  );
}
