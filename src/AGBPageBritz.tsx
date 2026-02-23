import React from "react";
import "./App.css";

export default function AGBPageBritz() {
  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 800 }}>
        <h1>Trainingsbedingungen Britz</h1>

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
                <td style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)" }}><strong>60 EUR pro Monat</strong></td>
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
            Über die Gruppengröße entscheidet das Trainerteam je nach Auslastung und zeitlicher Flexibilität des Schülers. Für einen besonders kleinen Gruppenwunsch zu einer beliebten Trainingszeit (z.B. 2er oder 3er Gruppe an einem Wochentag ab 16 Uhr) kann ein Aufpreis erforderlich sein. Weitere Details sind mit dem Trainerteam zu besprechen.
          </p>
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
            Bei unter-saisonalem Beitritt wird anteilig berechnet. Der Vertrag verlängert sich automatisch für Folgesaisons (schriftliche Bestätigung genügt). Kündigung erfolgt automatisch zum Saisonende ohne neue Anmeldung.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            3. Zahlung und Absageregelungen
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Zahlung erfolgt zum Monatsende per SEPA-Lastschrift. Rechnungen werden auf Wunsch elektronisch versandt.
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Beim Gruppentraining wird die Gebühr auch bei Nichtteilnahme fällig. Beim Einzeltraining muss die Absage spätestens 24 Stunden vorher erfolgen, sonst wird das Honorar fällig.
          </p>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Versäumte Stunden können nicht nachgeholt oder erstattet werden. Bei trainerbedingtem Ausfall gibt es einen Ersatztermin oder Kostenerstattung. Bei erheblichen Regenunterbrechungen gibt es einen Ersatztermin oder 50% Gutschrift.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            4. Ausnahmeregelungen
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Bei mehrmonatiger Krankheit, Schwangerschaft oder Verletzung kann der Vertrag vorzeitig beendet werden. Es besteht kein genereller Anspruch auf Änderung oder Unterbrechung. Bei grobem Fehlverhalten erfolgt Ausschluss ohne Erstattung. Zahlungsverzug oder Rücklastschriften können zum Trainingsausschluss führen.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            5. Haftung und Aufsichtspflicht
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
            6. Vereinsmitgliedschaft (TC Britz)
          </h2>
          <p style={{ marginBottom: 12, color: "#dc2626" }}>
            <strong>Training in Tennisvereinen ist grundsätzlich nur für Mitglieder möglich
            (Ausnahmen: Probetraining, Tenniscamps, Wintertraining).</strong>
          </p>
          <p style={{ marginTop: 12, fontStyle: "italic" }}>
            Gebühren und Konditionen für Vereinsmitgliedschaften können sich ändern.
            Aktuelle Informationen bitte direkt der Vereinswebsite entnehmen (Link siehe unten).
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            7. Datenschutz
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Erhobene Daten werden ausschließlich für Organisation und Training genutzt. Daten werden vertraulich behandelt. Fotos und Videos können zu Dokumentations- und Werbezwecken erstellt werden. Schriftlicher Widerspruch ist jederzeit möglich.
          </p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: "var(--primary)" }}>
            8. Platzpflege
          </h2>
          <p style={{ marginBottom: 12, lineHeight: 1.8 }}>
            Die Plätze dürfen nur mit Sandplatzschuhen betreten werden. Nach jeder Benutzung ist ein sorgfältiges Aufräumen der Plätze erforderlich: Wässern, Abziehen und Linien fegen.
          </p>
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
