import React from "react";
import "./App.css";

export default function AGBPageBritz() {
  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 800 }}>
        <h1>Trainingsbedingungen Britz</h1>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            1. Trainingspreise (Honorar)
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--bg-inset)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Trainingsart</th>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Kosten</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Gruppentraining (3-5 Personen)</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}><strong>60 EUR pro Monat</strong></td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Privattraining 2er-Gruppe</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}><strong>25 EUR pro Person/Stunde</strong></td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Einzeltraining</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}><strong>40 EUR pro Stunde</strong></td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Die Einteilung in alters- und spielstärkengerechte Gruppen erfolgt durch das Trainerteam.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            2. Saisonbedingungen
          </h2>
          <p style={{ marginBottom: 16, lineHeight: 1.8 }}>
            Der Saisonzeitraum kann je nach Wetter variieren. Der genaue Trainingsbeginn und das Ende einer Saison wird den Teilnehmern mitgeteilt.
          </p>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Sommersaison:</strong> Mitte April bis Mitte Oktober</li>
            <li><strong>Wintersaison:</strong> Mitte Oktober bis Mitte April</li>
            <li style={{ color: "#dc2626" }}>Die Anmeldung ist <strong>verbindlich für die gesamte Saison</strong> – ein vorzeitiges Aussteigen ist nicht möglich</li>
            <li>Training findet in den Berliner Schulferien nur nach Absprache statt</li>
            <li>Bei unter-saisonalem Beitritt wird anteilig berechnet</li>
            <li>Der Vertrag verlängert sich automatisch für Folgesaisons (schriftliche Bestätigung genügt)</li>
            <li>Kündigung erfolgt automatisch zum Saisonende ohne neue Anmeldung</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            3. Zahlung und Absageregelungen
          </h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Zahlung erfolgt zum <strong>Monatsende per SEPA-Lastschrift</strong></li>
            <li>Rechnungen werden auf Wunsch elektronisch versandt</li>
            <li><strong>Gruppentraining:</strong> Gebühr wird auch bei Nichtteilnahme fällig</li>
            <li><strong>Einzeltraining:</strong> Absage spätestens 24 Stunden vorher, sonst wird das Honorar fällig</li>
            <li>Versäumte Stunden können nicht nachgeholt oder erstattet werden</li>
            <li>Bei trainerbedingtem Ausfall: Ersatztermin oder Kostenerstattung</li>
            <li>Bei erheblichen Regenunterbrechungen: Ersatztermin oder 50% Gutschrift</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            4. Ausnahmeregelungen
          </h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Bei mehrmonatiger Krankheit, Schwangerschaft oder Verletzung kann der Vertrag vorzeitig beendet werden</li>
            <li>Kein genereller Anspruch auf Änderung oder Unterbrechung</li>
            <li>Bei grobem Fehlverhalten: Ausschluss ohne Erstattung</li>
            <li>Zahlungsverzug oder Rücklastschriften können zum Trainingsausschluss führen</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            5. Haftung und Aufsichtspflicht
          </h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Teilnahme erfolgt auf eigene Gefahr</strong></li>
            <li>Haftung der Trainer nur bei Vorsatz und grober Fahrlässigkeit</li>
            <li>Eltern haften für ihre Kinder</li>
            <li><strong>Aufsichtspflicht der Trainer besteht nur während der Trainingszeit</strong></li>
            <li>Eltern müssen Kinder pünktlich bringen und abholen</li>
            <li>Gesundheitliche Einschränkungen müssen vor dem Training mitgeteilt werden</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            6. Datenschutz
          </h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Erhobene Daten werden ausschließlich für Organisation und Training genutzt</li>
            <li>Daten werden vertraulich behandelt</li>
            <li>Fotos und Videos können zu Dokumentations- und Werbezwecken erstellt werden</li>
            <li>Schriftlicher Widerspruch ist jederzeit möglich</li>
          </ul>
        </section>

        <div style={{
          background: "var(--bg-inset)",
          padding: 16,
          borderRadius: 8,
          fontSize: 13,
        }}>
          <p style={{ margin: 0, color: "#dc2626" }}>
            Training in Tennisvereinen ist grundsätzlich nur für Mitglieder möglich
            (Ausnahmen: Probetraining, Tenniscamps, Wintertraining).
          </p>
          <p style={{ margin: "8px 0 0 0", color: "var(--text-muted)" }}>
            Weitere Infos direkt auf der Vereinshomepage:{" "}
            <a
              href="https://tc-britz.de/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--primary)" }}
            >
              tc-britz.de
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
