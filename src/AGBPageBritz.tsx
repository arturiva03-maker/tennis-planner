import React, { useState } from "react";
import { BallotStyles, getBallotThemeStyle } from "./ballotStyles";

export default function AGBPageBritz() {
  const [showAufpreise, setShowAufpreise] = useState(false);
  const themeStyle = getBallotThemeStyle("Britz");

  return (
    <div className="ballotForm" style={themeStyle}>
      <BallotStyles />
      <div className="sheet-wide">
        <h1 className="display">Trainings­­<em>bedingungen</em>.</h1>
        <p className="intro">
          Preise, Saison­regeln und Konditionen für den Trainings­betrieb beim TC Britz.
        </p>

        <div className="section-head">
          <span className="num">§ 1</span>
          <span className="title">Trainingspreise</span>
        </div>

        <table className="ballot-table">
          <thead>
            <tr>
              <th>Trainingsart</th>
              <th>Kosten</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Gruppentraining
                <br />
                <span className="mono" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>3–5 Personen</span>
              </td>
              <td className="price">
                60 EUR / Monat
                <em>1× wöchentlich</em>
              </td>
            </tr>
            <tr>
              <td>Einzeltraining</td>
              <td className="price">40 EUR / Stunde</td>
            </tr>
          </tbody>
        </table>

        <div className="prose">
          <p className="muted-note">
            Die Einteilung in alters- und spielstärkengerechte Gruppen erfolgt durch das Trainerteam. Die Standardgruppe besteht aus 4 Personen; eine Gruppe mit 5 Personen bildet die Ausnahme.
          </p>
          <p className="muted-note">
            Über die Gruppengröße entscheidet das Trainerteam je nach Auslastung und zeitlicher Flexibilität des Schülers. Für besonders kleine Gruppen­wünsche zu beliebten Trainings­zeiten erheben wir einen Aufpreis.{" "}
            <button
              type="button"
              className="inline-toggle"
              onClick={() => setShowAufpreise(!showAufpreise)}
            >
              {showAufpreise ? "Ausblenden" : "Aufpreise anzeigen"}
            </button>
          </p>
        </div>

        {showAufpreise && (
          <div className="aufpreis-block">
            <p className="block-title">Aufpreis · Kleine Gruppen</p>
            <div className="prose">
              <p>Betroffene Trainingszeiten:</p>
              <ul>
                <li>Mo – Fr · 17 – 21 Uhr</li>
              </ul>
            </div>
            <table className="ballot-table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Gruppengröße</th>
                  <th>Pro Person / Stunde</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>2er Gruppe</td>
                  <td className="price">25 EUR</td>
                </tr>
                <tr>
                  <td>3er Gruppe</td>
                  <td className="price">20 EUR</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="section-head">
          <span className="num">§ 2</span>
          <span className="title">Saisonbedingungen</span>
        </div>
        <div className="prose">
          <p>
            Der Saisonzeitraum kann je nach Wetter variieren. Der genaue Trainings­beginn und das Ende einer Saison wird den Teilnehmern mitgeteilt. Sommer­saison von Mitte April bis Mitte Oktober, Winter­saison von Mitte Oktober bis Mitte April.
          </p>
          <p>
            <strong>Die Anmeldung ist verbindlich für die gesamte Saison – ein vorzeitiges Aussteigen ist nicht möglich.</strong>
          </p>
          <p>
            In den Berliner offiziellen Sommerferien findet das Training nur nach vorheriger Absprache statt. Dazu wird es eine separate Anmelde­möglichkeit für Einzel­training oder auch vereinbartes Gruppen­training geben.
          </p>
          <p>
            Bei unter-saisonalem Beitritt wird anteilig berechnet. Die Anmeldung (der Trainings­vertrag) gilt jeweils für eine Saison (Winter oder Sommer). Nach einmaliger Anmeldung genügt für eine spätere Saison­anmeldung nur das Ausfüllen des Anmelde­fragebogens – der Vertrag ist dann wieder für eine Saison aktiv. Das SEPA-Mandat muss nicht erneut unterschrieben werden. Kündigung erfolgt automatisch zum Saison­ende ohne neue Anmeldung.
          </p>
        </div>

        <div className="section-head">
          <span className="num">§ 3</span>
          <span className="title">Zahlung · Absage</span>
        </div>
        <div className="prose">
          <p>Zahlung erfolgt zum Monatsende per SEPA-Lastschrift. Rechnungen werden auf Wunsch elektronisch versandt.</p>
          <p>
            Beim Gruppen­training wird die Gebühr auch bei Nicht­teilnahme fällig. Beim Einzel­training muss die Absage spätestens 24 Stunden vorher erfolgen, sonst wird das Honorar fällig.
          </p>
          <p>
            Versäumte Stunden können nicht nachgeholt oder erstattet werden. Bei trainer­bedingtem Ausfall gibt es einen Ersatz­termin oder Kosten­erstattung. Bei erheblichen Regen­unterbrechungen gibt es einen Ersatz­termin oder 50 % Gutschrift.
          </p>
        </div>

        <div className="section-head">
          <span className="num">§ 4</span>
          <span className="title">Ausnahmeregelungen</span>
        </div>
        <div className="prose">
          <p>
            Bei mehrmonatiger Krankheit, Schwangerschaft oder Verletzung kann der Vertrag vorzeitig beendet werden. Es besteht kein genereller Anspruch auf Änderung oder Unterbrechung. Bei grobem Fehl­verhalten erfolgt Ausschluss ohne Erstattung. Zahlungs­verzug oder Rück­lastschriften können zum Trainings­ausschluss führen.
          </p>
        </div>

        <div className="section-head">
          <span className="num">§ 5</span>
          <span className="title">Haftung · Aufsichtspflicht</span>
        </div>
        <div className="prose">
          <p>
            <strong>Die Teilnahme erfolgt auf eigene Gefahr.</strong> Die Haftung der Trainer besteht nur bei Vorsatz und grober Fahrlässigkeit. Eltern haften für ihre Kinder.
          </p>
          <p>
            <strong>Die Aufsichtspflicht der Trainer besteht nur während der Trainings­zeit.</strong> Eltern müssen Kinder pünktlich bringen und abholen. Gesundheitliche Einschränkungen müssen vor dem Training mitgeteilt werden.
          </p>
        </div>

        <div className="section-head">
          <span className="num">§ 6</span>
          <span className="title">Vereinsmitgliedschaft · TC Britz</span>
        </div>
        <div className="prose">
          <p>
            <strong>Training in Tennisvereinen ist grundsätzlich nur für Mitglieder möglich</strong> (Ausnahmen: Probetraining, Tenniscamps, Winter­training).
          </p>
          <p className="muted-note">
            Gebühren und Konditionen für Vereins­mitgliedschaften können sich ändern. Aktuelle Informationen bitte direkt der Vereins­website entnehmen.
          </p>
        </div>

        <div className="section-head">
          <span className="num">§ 7</span>
          <span className="title">Datenschutz</span>
        </div>
        <div className="prose">
          <p>
            Erhobene Daten werden ausschließlich für Organisation und Training genutzt. Daten werden vertraulich behandelt. Fotos und Videos können zu Dokumentations- und Werbe­zwecken erstellt werden. Schriftlicher Widerspruch ist jederzeit möglich.
          </p>
        </div>

        <div className="section-head">
          <span className="num">§ 8</span>
          <span className="title">Platzpflege</span>
        </div>
        <div className="prose">
          <p>
            Die Plätze dürfen nur mit Sandplatz­schuhen betreten werden. Nach jeder Benutzung ist ein sorgfältiges Aufräumen der Plätze erforderlich: Wässern, Abziehen und Linien fegen.
          </p>
        </div>

        <div className="mandate-block" style={{ marginTop: 56 }}>
          <p className="mandate-title">Verein · Weiterführende Informationen</p>
          <p>
            Weitere Informationen zur Vereins­mitgliedschaft unter{" "}
            <a
              href="https://tc-britz.de/"
              target="_blank"
              rel="noopener noreferrer"
              className="link-inline"
            >
              tc-britz.de
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
