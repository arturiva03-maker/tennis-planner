import React from "react";
import "./App.css";

export default function AGBPage() {
  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 800 }}>
        <h1>Trainingsbedingungen</h1>

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
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Privattraining 3er-Gruppe</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}><strong>20 EUR pro Person/Stunde</strong></td>
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
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Sommersaison:</strong> Mitte April bis Mitte Oktober</li>
            <li><strong>Wintersaison:</strong> Mitte Oktober bis Mitte April</li>
            <li style={{ color: "#dc2626" }}>Die Anmeldung ist <strong>verbindlich für die gesamte Saison</strong></li>
            <li>Training findet auch in den Berliner Schulferien statt</li>
            <li>Bei unter-saisonalem Beitritt wird anteilig berechnet</li>
            <li>Der Vertrag verlängert sich automatisch für Folgesaisons (schriftliche Bestätigung genügt)</li>
            <li><strong>Ein vorzeitiges Aussteigen innerhalb einer Saison ist nicht möglich</strong></li>
            <li>Kündigung erfolgt automatisch zum Saisonende ohne neue Anmeldung</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            3. Hallengebühren (Wintersaison)
          </h2>
          <p style={{ marginBottom: 12 }}>Im Sommer fallen keine zusätzlichen Platzgebühren an.</p>

          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Kinder/Jugendliche im Gruppentraining:</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8, marginBottom: 16 }}>
            <li>Mitglied, 1x pro Woche: <strong>Wird vom Verein bezahlt</strong></li>
            <li>Mitglied, 2. Training/Woche: <strong>112 EUR zusätzlich (pauschal)</strong></li>
            <li>Nicht-Mitglied: <strong>140 EUR einmalig (pauschal)</strong></li>
          </ul>

          <h3 style={{ fontSize: 15, marginBottom: 8 }}>Einzel-/Privattraining & Erwachsene:</h3>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Mitglieder: <strong>16 EUR pro Stunde</strong></li>
            <li>Nicht-Mitglieder: <strong>18 EUR pro Stunde</strong></li>
          </ul>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Die Hallengebühr wird im Gruppentraining auf die Anzahl der Schüler aufgeteilt.
          </p>

          <p style={{ marginTop: 16, fontStyle: "italic" }}>
            Die Hallengebühr wird bei unter-saisonalem Beitritt anteilig berechnet.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            4. Zahlung und Absageregelungen
          </h2>
          <ul style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Zahlung erfolgt zum <strong>Monatsende per SEPA-Lastschrift</strong></li>
            <li>Rechnungen werden auf Wunsch elektronisch versandt</li>
            <li><strong>Gruppentraining:</strong> Gebühr wird auch bei Nichtteilnahme fällig</li>
            <li><strong>Einzeltraining:</strong> Absage spätestens 24 Stunden vorher, sonst wird das Honorar fällig</li>
            <li><strong>Einzeltraining Absage:</strong> Die Hallenstunde kann ohne Rückerstattung auf einen anderen Spieler übertragen werden</li>
            <li>Hallengebühr kann in keinem Fall erstattet werden</li>
            <li>Versäumte Stunden können nicht nachgeholt oder erstattet werden</li>
            <li>Bei trainerbedingtem Ausfall: Ersatztermin oder Kostenerstattung</li>
            <li>Bei erheblichen Regenunterbrechungen: Ersatztermin oder 50% Gutschrift</li>
          </ul>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            5. Ausnahmeregelungen
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
            6. Haftung und Aufsichtspflicht
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
            7. Vereinsmitgliedschaft (BSC Rehberge Tennis)
          </h2>
          <p style={{ marginBottom: 12 }}>
            Training in Tennisvereinen ist grundsätzlich nur für Mitglieder möglich
            (Ausnahmen: Probetraining, Tenniscamps, Wintertraining).
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 12 }}>
            <thead>
              <tr style={{ background: "var(--bg-inset)" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Kategorie</th>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Jahresbeitrag</th>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>AUL</th>
                <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}>Aufnahme</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Vollmitglied</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>330 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>100 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>200 EUR</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Student über 18</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>235 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>70 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>50 EUR</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Jugendliche bis 18</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>150 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>70 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>-</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Jugendliche bis 14</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>150 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>-</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>-</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Kind unter 12</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>70 EUR</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>-</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>-</td>
              </tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 13 }}>
            AUL = Arbeitsumlage (wird nach Ableistung von Arbeitsstunden erstattet).
            Bei Eintritt nach dem 30.07. wird nur die Hälfte des Jahresbeitrags fällig.
          </p>
          <p style={{ marginTop: 12, fontStyle: "italic" }}>
            Gebühren und Konditionen für Vereinsmitgliedschaften können sich ändern.
            Aktuelle Informationen bitte direkt der Vereinswebsite entnehmen (Link siehe unten).
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            8. Datenschutz
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
          color: "var(--text-muted)"
        }}>
          <p style={{ margin: 0 }}>
            Weitere Informationen zur Vereinsmitgliedschaft unter:{" "}
            <a
              href="https://bscrehberge-tennis.de/verein/mitgliedschaft/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--primary)" }}
            >
              bscrehberge-tennis.de/verein/mitgliedschaft
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
