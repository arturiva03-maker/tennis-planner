import React from "react";
import "./App.css";

export default function TenniscampInfoPage() {
  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 800 }}>
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

        {/* Camp-Termine */}
        <h2 style={{ marginBottom: 16 }}>Camp-Termine 2025</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32
        }}>
          <div style={{
            background: "#f0fdf4",
            border: "2px solid #22c55e",
            borderRadius: 8,
            padding: 20
          }}>
            <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>1. FERIENWOCHE</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#166534" }}>14. - 18. Juli 2025</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#15803d" }}>Montag bis Freitag</div>
          </div>
          <div style={{
            background: "#fef3c7",
            border: "2px solid #f59e0b",
            borderRadius: 8,
            padding: 20
          }}>
            <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600, marginBottom: 4 }}>6. FERIENWOCHE</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#92400e" }}>18. - 22. August 2025</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#b45309" }}>Montag bis Freitag</div>
          </div>
        </div>

        {/* Kindercamp Info */}
        <div style={{
          background: "#f8fafc",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24
        }}>
          <h2 style={{ margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🎾</span> Kindercamp
          </h2>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, margin: "0 0 8px 0" }}>Kurszeiten</h3>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Montag bis Freitag, 10:00 - 15:00 Uhr</p>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)" }}>
              inkl. Mittagspause von 12:00 - 13:00 Uhr mit warmer Mahlzeit
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, margin: "0 0 8px 0" }}>Kursgebühr</h3>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "var(--primary)" }}>270 € pro Kind</p>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)" }}>
              Wird eine Woche vor Beginn des Camps per SEPA-Lastschrift abgebucht.
              Eine Rechnung wird bei Bedarf gerne ausgestellt.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, margin: "0 0 8px 0" }}>Ablauf eines Trainingstages</h3>
            <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Gemeinsame Aufwärmung im nahegelegenen Park</li>
              <li>Einteilung in spielstärkengerechte Gruppen (am ersten Tag)</li>
              <li>Gezielte Übungsformen und Spielformen rund um das Tennisspiel</li>
              <li><strong>12:00 - 13:00 Uhr:</strong> Mittagspause mit warmer Mahlzeit</li>
              <li>Gemeinsames Bewegungsspiel nach dem Mittagessen</li>
              <li>Fortsetzung des Tennistrainings</li>
            </ul>
          </div>

          <div style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: 16,
            marginBottom: 20
          }}>
            <h3 style={{ fontSize: 16, margin: "0 0 8px 0", color: "#991b1b" }}>Bitte mitbringen</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#991b1b" }}>
              <li><strong>Sandplatzschuhe</strong> (wichtig für die Qualität der Plätze!)</li>
              <li><strong>Ausreichend Wasser</strong></li>
              <li><strong>Tennisschläger</strong> (bei Bedarf kann ein Schläger ausgeliehen werden)</li>
            </ul>
          </div>

          <div style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 8,
            padding: 16
          }}>
            <h3 style={{ fontSize: 16, margin: "0 0 8px 0", color: "#9a3412" }}>Wichtige Hinweise</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#9a3412", lineHeight: 1.6 }}>
              <li>Bitte bringen Sie Ihr Kind <strong>pünktlich</strong> zum Training.</li>
              <li>Bei erheblicher Verspätung bitten wir um rechtzeitige Mitteilung an das Trainerteam.</li>
              <li>Die Teilnehmer werden je nach Anzahl in Gruppen eingeteilt und von mehreren Trainern betreut.</li>
            </ul>
          </div>
        </div>

        {/* Stornierung */}
        <div style={{
          background: "#fef3c7",
          border: "2px solid #f59e0b",
          borderRadius: 8,
          padding: 20,
          marginBottom: 32
        }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#92400e" }}>Stornierungsbedingungen</h3>
          <p style={{ margin: 0, color: "#78350f", lineHeight: 1.6 }}>
            Eine kostenfreie Absage des Camps ist nur bis <strong>eine Woche vor Beginn</strong> des jeweiligen Camps möglich:
          </p>
          <ul style={{ margin: "12px 0 0 0", paddingLeft: 20, color: "#78350f" }}>
            <li>1. Ferienwoche: Absage bis <strong>07.07.2025</strong></li>
            <li>6. Ferienwoche: Absage bis <strong>11.08.2025</strong></li>
          </ul>
          <p style={{ margin: "12px 0 0 0", color: "#78350f" }}>
            Eine Absage ist ausschließlich schriftlich per E-Mail an{" "}
            <a href="mailto:tennisabisz@gmail.com" style={{ color: "#92400e", fontWeight: 600 }}>tennisabisz@gmail.com</a>{" "}
            möglich.
          </p>
        </div>

        {/* Anmeldung Button */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <a
            href="/tenniscamp"
            style={{
              display: "inline-block",
              background: "var(--primary)",
              color: "white",
              padding: "16px 32px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: 18
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
