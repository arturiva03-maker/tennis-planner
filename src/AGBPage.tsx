import React, { useState } from "react";
import "./App.css";

export default function AGBPage() {
  const [showAufpreise, setShowAufpreise] = useState(false);

  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 800 }}>
        <h1>Trainingsbedingungen</h1>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            1. Trainingspreise
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
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}><strong>60 EUR pro Monat</strong> (für 1x wöchentliches Training)</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>Einzeltraining</td>
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}><strong>40 EUR pro Stunde</strong></td>
              </tr>
            </tbody>
          </table>

          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Die Einteilung in alters- und spielstärkengerechte Gruppen erfolgt durch das Trainerteam. Die Standardgruppe besteht aus 4 Personen. Eine Gruppe mit 5 Personen bildet die Ausnahme.
          </p>
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            Über die Gruppengröße entscheidet das Trainerteam je nach Auslastung und zeitlicher Flexibilität des Schülers. Für besonders kleine Gruppenwünsche zu beliebten Trainingszeiten erheben wir einen Aufpreis.{" "}
            <button
              onClick={() => setShowAufpreise(!showAufpreise)}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                cursor: "pointer",
                padding: 0,
                fontSize: 13,
                textDecoration: "underline",
              }}
            >
              {showAufpreise ? "Aufpreise ausblenden" : "Aufpreise anzeigen"}
            </button>
          </p>

          {showAufpreise && (
            <div style={{
              background: "var(--bg-inset)",
              borderRadius: 8,
              padding: 16,
              marginTop: 12,
              fontSize: 14
            }}>
              <p style={{ margin: "0 0 12px 0", fontWeight: 600 }}>
                Für folgende Trainingszeiten wird ein Aufpreis erhoben:
              </p>
              <ul style={{ margin: "0 0 16px 0", paddingLeft: 20, lineHeight: 1.6 }}>
                <li>Mo-Fr: 16-21 Uhr</li>
                <li>Sa: 10-18 Uhr</li>
              </ul>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid var(--border)", background: "var(--bg)" }}>Gruppengröße</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", borderBottom: "2px solid var(--border)", background: "var(--bg)" }}>Preis pro Person/Stunde</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>2er Gruppe</td>
                    <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", textAlign: "right" }}><strong>25 EUR</strong></td>
                  </tr>
                  <tr>
                    <td style={{ padding: "8px 12px" }}>3er Gruppe</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}><strong>20 EUR</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            2. Saisonbedingungen
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Der Saisonzeitraum kann je nach Wetter variieren. Der genaue Trainingsbeginn und das Ende einer Saison wird den Teilnehmern mitgeteilt. Die Sommersaison läuft von Mitte April bis Mitte Oktober, die Wintersaison von Mitte Oktober bis Mitte April.
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8, color: "#dc2626" }}>
            <strong>Die Anmeldung ist verbindlich für die gesamte Saison – ein vorzeitiges Aussteigen ist nicht möglich.</strong>
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            In den Berliner offiziellen Sommerferien findet das Training nur nach vorheriger Absprache statt. Dazu wird es eine separate Anmeldemöglichkeit für Einzeltraining oder auch vereinbartes Gruppentraining geben.
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Bei unter-saisonalem Beitritt wird anteilig berechnet. In diesem Fall wird die genaue Hallengebühr mitgeteilt. Der Vertrag verlängert sich automatisch für Folgesaisons (schriftliche Bestätigung genügt). Kündigung erfolgt automatisch zum Saisonende ohne neue Anmeldung.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            3. Hallengebühren (nur in der Wintersaison)
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Im Sommer fallen keine zusätzlichen Platzgebühren an. Die genauen Hallengebühren werden vor der Wintersaison bekannt gegeben.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            4. Zahlung und Absageregelungen
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Zahlung erfolgt zum Monatsende per SEPA-Lastschrift. Rechnungen werden auf Wunsch elektronisch versandt.
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Beim Gruppentraining wird die Gebühr auch bei Nichtteilnahme fällig. Beim Einzeltraining muss die Absage spätestens 24 Stunden vorher erfolgen, sonst wird das Honorar fällig. Bei Einzeltraining-Absage (nur in der Hallensaison) kann die Hallenstunde ohne Rückerstattung auf einen anderen Spieler übertragen werden.
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Die Hallengebühr kann in keinem Fall erstattet werden. Versäumte Stunden können nicht nachgeholt oder erstattet werden. Bei trainerbedingtem Ausfall gibt es einen Ersatztermin oder Kostenerstattung. Bei erheblichen Regenunterbrechungen gibt es einen Ersatztermin oder 50% Gutschrift.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            5. Ausnahmeregelungen
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Bei mehrmonatiger Krankheit, Schwangerschaft oder Verletzung kann der Vertrag vorzeitig beendet werden. Es besteht kein genereller Anspruch auf Änderung oder Unterbrechung. Bei grobem Fehlverhalten erfolgt Ausschluss ohne Erstattung. Zahlungsverzug oder Rücklastschriften können zum Trainingsausschluss führen.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            6. Haftung und Aufsichtspflicht
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            <strong>Die Teilnahme erfolgt auf eigene Gefahr.</strong> Die Haftung der Trainer besteht nur bei Vorsatz und grober Fahrlässigkeit. Eltern haften für ihre Kinder.
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            <strong>Die Aufsichtspflicht der Trainer besteht nur während der Trainingszeit.</strong> Eltern müssen Kinder pünktlich bringen und abholen. Gesundheitliche Einschränkungen müssen vor dem Training mitgeteilt werden.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            7. Vereinsmitgliedschaft (BSC Rehberge Tennis)
          </h2>
          <p style={{ marginBottom: 12, color: "#dc2626" }}>
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
