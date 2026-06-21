import React from "react";
import { BallotStyles, getBallotThemeStyle } from "./ballotStyles";
import { LegalFooter } from "./LegalText";

export default function AGBPageBritz() {
  const themeStyle = getBallotThemeStyle("Britz");

  return (
    <div className="ballotForm" style={themeStyle}>
      <BallotStyles />
      <div className="sheet-wide">
        <h1 className="display">Allgemeine <em>Geschäftsbedingungen</em>.</h1>
        <p className="intro">
          Trainingsbedingungen für den Trainingsbetrieb am Standort Britz (TC Blau-Weiß Britz).
          <br />
          <span className="mono" style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Stand: Juni 2026</span>
        </p>

        {/* § 1 */}
        <div className="section-head">
          <span className="num">§ 1</span>
          <span className="title">Geltungsbereich, Vertragsparteien, Anbieter</span>
        </div>
        <div className="prose">
          <p>
            (1) Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Trainings-, Probetrainings- und Campverträge,
            die über die Webformulare des Anbieters – im Wege des Fernabsatzes – zwischen dem Anbieter und dem Kunden geschlossen werden.
          </p>
          <p>
            (2) Anbieter und Vertragspartner ist die <strong>Tennisschule Zlatan Palazov und Artur Ivanenko GbR</strong>,
            vertretungsberechtigte Gesellschafter Zlatan Palazov und Artur Ivanenko, Ricarda-Huch-Straße 40, 14480 Potsdam,
            E-Mail tennisabisz@gmail.com, USt-IdNr. DE450839939 (nachfolgend „wir", „uns" oder „Tennisschule").
          </p>
          <p>
            (3) Der Anbieter ist Unternehmer (§ 14 BGB); der Kunde ist regelmäßig Verbraucher (§ 13 BGB). Dieser Standort betrifft das Training auf der
            Anlage des TC Blau-Weiß Britz.
          </p>
          <p>
            (4) Es gelten ausschließlich diese AGB. Abweichende Bedingungen des Kunden werden nicht Vertragsbestandteil, es sei denn, wir hätten ihrer Geltung
            ausdrücklich zugestimmt.
          </p>
          <p>
            (5) <strong>Minderjährige Teilnehmer:</strong> Ist der Teilnehmer minderjährig, schließen die Erziehungsberechtigten den Vertrag in eigenem Namen ab
            und erteilen alle erforderlichen Einwilligungen. Vertragspartner und Zahlungspflichtiger sind in diesem Fall die Erziehungsberechtigten.
          </p>
        </div>

        {/* § 2 */}
        <div className="section-head">
          <span className="num">§ 2</span>
          <span className="title">Vertragsschluss über das Webformular</span>
        </div>
        <div className="prose">
          <p>(1) Die Darstellung des Angebots auf unserer Website ist kein bindendes Angebot, sondern eine Aufforderung zur Abgabe eines Angebots.</p>
          <p>
            (2) Mit dem vollständigen Ausfüllen und Absenden des Anmeldeformulars gibt der Kunde ein verbindliches Angebot ab. Unmittelbar vor dem Absenden
            werden die wesentlichen Vertragsinformationen (Leistung, Preis bzw. monatlicher Beitrag, Laufzeit) angezeigt (§ 312j Abs. 2 BGB).
          </p>
          <p>
            (3) Der Vertrag kommt erst mit unserer Annahme zustande – durch Bestätigung in Textform (z. B. E-Mail) oder durch Aufnahme der Trainingsleistung.
            Eine automatische Eingangsbestätigung ist noch keine Annahme.
          </p>
          <p>
            (4) Eingabefehler können vor dem Absenden über die üblichen Browserfunktionen korrigiert werden (§ 312i BGB). Der Vertragstext wird nach
            Vertragsschluss zusammen mit diesen AGB in Textform zur Verfügung gestellt. Vertragssprache ist Deutsch.
          </p>
        </div>

        {/* § 3 */}
        <div className="section-head">
          <span className="num">§ 3</span>
          <span className="title">Leistungsbeschreibung</span>
        </div>
        <div className="prose">
          <p>
            (1) Gegenstand ist die fachgerechte Trainingsanleitung im Tennis als Dienstleistung (§ 611 BGB). Wir schulden eine sorgfältige Anleitung,
            <strong> jedoch keinen bestimmten Lern- oder Spielerfolg</strong>.
          </p>
          <p>
            (2) Angeboten werden Gruppentraining (in der Regel 3–5 Personen), Einzeltraining, Probetraining sowie Tenniscamps mit festen Terminen. Die Einteilung
            in alters- und spielstärkengerechte Gruppen erfolgt durch das Trainerteam; die Standardgruppe besteht aus 4 Personen, eine 5er-Gruppe bildet die Ausnahme.
          </p>
          <p>
            (3) <strong>Saison:</strong> Sommersaison von Mitte April bis Mitte Oktober, Wintersaison von Mitte Oktober bis Mitte April. Der genaue Trainingsbeginn
            und das Saisonende können witterungsbedingt variieren und werden in Textform mitgeteilt. In den Berliner Sommerferien findet Training nur nach
            vorheriger Absprache statt (gesonderte Anmeldung).
          </p>
        </div>

        {/* § 4 */}
        <div className="section-head">
          <span className="num">§ 4</span>
          <span className="title">Preise und Fälligkeit</span>
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
                <span className="mono" style={{ fontSize: "0.8rem", color: "var(--muted)" }}>3–5 Personen, 1× wöchentlich</span>
              </td>
              <td className="price">60 EUR / Monat</td>
            </tr>
            <tr>
              <td>Einzeltraining</td>
              <td className="price">40 EUR / Stunde</td>
            </tr>
          </tbody>
        </table>
        <div className="prose">
          <p className="muted-note">Alle Preise sind Endpreise inkl. etwaiger gesetzlicher Umsatzsteuer.</p>
          <p>
            <strong>Aufpreis für kleine Gruppen:</strong> Für besonders kleine Gruppen zu beliebten Trainingszeiten (Mo–Fr 16–21 Uhr) gelten die folgenden Beträge
            pro Person und Stunde – <strong>anstelle</strong> (nicht zusätzlich zu) des regulären Gruppenbeitrags:
          </p>
        </div>
        <table className="ballot-table">
          <thead>
            <tr>
              <th>Gruppengröße</th>
              <th>Pro Person / Stunde</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2er-Gruppe</td>
              <td className="price">25 EUR</td>
            </tr>
            <tr>
              <td>3er-Gruppe</td>
              <td className="price">20 EUR</td>
            </tr>
          </tbody>
        </table>
        <div className="prose">
          <p>
            Bei unter-saisonalem Beitritt wird die Gebühr anteilig berechnet. Der monatliche Trainingsbeitrag ist zum Monatsende fällig, Campbeiträge zwei Wochen
            vor Campbeginn.
          </p>
          <p>
            <strong>Preisänderungen</strong> für künftige Saisons teilen wir in Textform mit angemessener Frist (mindestens sechs Wochen vorab) mit; der Kunde kann
            den Vertrag zum Zeitpunkt des Wirksamwerdens kündigen.
          </p>
        </div>

        {/* § 5 */}
        <div className="section-head">
          <span className="num">§ 5</span>
          <span className="title">Zahlung per SEPA-Lastschrift</span>
        </div>
        <div className="prose">
          <p>
            (1) Die Zahlung erfolgt per SEPA-Basislastschrift. Gläubiger-Identifikationsnummer: <strong>DE58ZZZ00002765947</strong>,
            Gläubiger: Tennisschule Zlatan Palazov und Artur Ivanenko GbR, Ricarda-Huch-Straße 40, 14480 Potsdam. Bei minderjährigen Teilnehmern erteilen die
            Erziehungsberechtigten als Kontoinhaber das Mandat.
          </p>
          <p>
            (2) <strong>Vorabankündigung (Pre-Notification):</strong> Die Frist für die Vorabankündigung über Betrag und Fälligkeit wird auf fünf (5) Kalendertage
            vor dem Belastungsdatum verkürzt. Bei gleichbleibendem Betrag und Termin genügt eine einmalige Vorabankündigung vor dem ersten Einzug.
          </p>
          <p>
            (3) Der Kunde sorgt für ausreichende Kontodeckung. Bei einer vom Kunden zu vertretenden Rücklastschrift trägt der Kunde die anfallenden Bankkosten;
            <strong> der Nachweis eines geringeren oder keines Schadens bleibt vorbehalten</strong>. Der Kunde kann binnen acht Wochen ab Belastung die Erstattung
            verlangen. Bei Zahlungsverzug gelten §§ 286, 288 BGB.
          </p>
        </div>

        {/* § 6 */}
        <div className="section-head">
          <span className="num">§ 6</span>
          <span className="title">Vertragsgrundlage (SEPA-Mandat), Laufzeit und Kündigung</span>
        </div>
        <div className="prose">
          <p>
            (1) <strong>Das SEPA-Lastschriftmandat ist zugleich die verbindliche Grundlage des Trainingsvertrags.</strong> Mit der Unterzeichnung des
            SEPA-Lastschriftmandats meldet sich der Kunde verbindlich zum Tennistraining an. Das Mandat gilt fort und muss für Folgesaisons nicht erneut
            unterzeichnet werden.
          </p>
          <p>
            (2) Der Trainingsvertrag ist auf jeweils eine Saison (Sommer- oder Wintersaison) befristet und endet mit Ablauf der Saison, <strong>ohne dass es einer
            Kündigung bedarf</strong>. Ohne erneute Anmeldung verlängert sich der Vertrag nicht von selbst.
          </p>
          <p>
            (3) Die Anmeldung erfolgt verbindlich für die gesamte Saison. Eine ordentliche Kündigung während der laufenden Saison sowie ein vorzeitiger Ausstieg
            sind ausgeschlossen; die Beitragspflicht besteht bis zum Saisonende fort.
          </p>
          <p>
            (4) <strong>Folgesaison:</strong> Meldet sich der Kunde für eine Folgesaison erneut zum Tennistraining an, gilt der Vertrag als verlängert. Hierfür
            genügt das Ausfüllen des Anmeldefragebogens; das bereits erteilte SEPA-Lastschriftmandat bleibt gültig und muss nicht erneut unterschrieben werden.
            Mit der erneuten Anmeldung stimmt der Kunde zugleich den zu diesem Zeitpunkt geltenden Allgemeinen Geschäftsbedingungen und Preisen (in der jeweils
            aktuellen Fassung) zu.
          </p>
          <p>
            (5) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund (§ 314 BGB) und nach § 627 BGB bleibt unberührt. Ein wichtiger Grund liegt
            insbesondere bei länger andauernder Krankheit, Schwangerschaft oder Verletzung vor (nicht abschließend). Bei grobem Fehlverhalten oder
            wiederholtem, vom Kunden zu vertretendem Zahlungsverzug bzw. wiederholten Rücklastschriften sind wir nach vorheriger Abmahnung zur außerordentlichen
            Kündigung berechtigt. Bereits gezahlte, aber nicht erbrachte Beiträge werden in diesem Fall anteilig erstattet.
          </p>
        </div>

        {/* § 7 */}
        <div className="section-head">
          <span className="num">§ 7</span>
          <span className="title">Absage, Ausfall und Ersatztermine</span>
        </div>
        <div className="prose">
          <p>
            (1) Beim <strong>Gruppentraining</strong> wird die Gebühr auch bei Nichtteilnahme fällig, da Platz und Trainer vorgehalten werden.
            <strong> Dem Kunden bleibt der Nachweis vorbehalten, dass kein oder ein geringerer Schaden entstanden ist; ersparte Aufwendungen werden angerechnet</strong> (§ 615 S. 2 BGB).
          </p>
          <p>
            (2) Beim <strong>Einzeltraining</strong> muss eine Absage spätestens 24 Stunden vor dem Termin erfolgen; andernfalls wird das Honorar fällig. Der
            Nachweis eines geringeren Schadens sowie die Anrechnung ersparter Aufwendungen und anderweitiger Vergabe bleiben vorbehalten.
          </p>
          <p>
            (3) <strong>Ausfall des Trainers:</strong> Bei Ausfall des regulären Trainers wird nach Möglichkeit ein qualifizierter Ersatztrainer gestellt; das
            Training findet dann regulär statt. Eine Absage allein wegen des Trainerwechsels entbindet nicht von der Zahlungspflicht. Kann kein Ersatztrainer
            gestellt werden, erhält der Kunde nach seiner Wahl einen Ersatztermin oder eine Kostenerstattung.
          </p>
          <p>
            (4) Bei erheblichen wetterbedingten Unterbrechungen des Außentrainings erhält der Kunde nach unserer Wahl einen Ersatztermin oder eine Gutschrift in Höhe
            von 50 % der ausgefallenen Einheit. Bei höherer Gewalt entfallen die wechselseitigen Leistungspflichten für die betroffene Zeit; bereits gezahlte Beträge
            für ausgefallene Leistungen werden anteilig erstattet.
          </p>
        </div>

        {/* § 8 */}
        <div className="section-head">
          <span className="num">§ 8</span>
          <span className="title">Haftung</span>
        </div>
        <div className="prose">
          <p>
            (1) Wir haften <strong>unbeschränkt</strong> für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer fahrlässigen oder
            vorsätzlichen Pflichtverletzung durch uns, unsere gesetzlichen Vertreter oder Erfüllungsgehilfen (insbesondere die Trainer) beruhen, sowie für sonstige
            Schäden aus vorsätzlicher oder grob fahrlässiger Pflichtverletzung.
          </p>
          <p>
            (2) Bei <strong>einfacher Fahrlässigkeit</strong> haften wir – außer in den Fällen des Absatzes 1 – nur bei Verletzung einer wesentlichen Vertragspflicht
            (Kardinalpflicht) und begrenzt auf den vertragstypischen, vorhersehbaren Schaden.
          </p>
          <p>(3) Im Übrigen ist die Haftung ausgeschlossen. Eine zwingende gesetzliche Haftung (z. B. nach dem Produkthaftungsgesetz) bleibt unberührt.</p>
          <p>
            (4) <strong>Aufsichtspflicht:</strong> Die Aufsichtspflicht der Trainer besteht nur während der Trainingszeit. Eltern müssen ihre Kinder pünktlich
            bringen und abholen. Gesundheitliche Einschränkungen sind vor Trainingsbeginn mitzuteilen.
          </p>
        </div>

        {/* § 9 */}
        <div className="section-head">
          <span className="num">§ 9</span>
          <span className="title">Platzpflege</span>
        </div>
        <div className="prose">
          <p>
            Die Plätze dürfen nur mit Sandplatzschuhen betreten werden. Nach jeder Benutzung ist ein sorgfältiges Aufräumen der Plätze erforderlich: Wässern,
            Abziehen und Linien fegen.
          </p>
        </div>

        {/* § 10 */}
        <div className="section-head">
          <span className="num">§ 10</span>
          <span className="title">Vereinsmitgliedschaft (TC Blau-Weiß Britz)</span>
        </div>
        <div className="prose">
          <p>
            Training in Tennisvereinen ist grundsätzlich nur für Mitglieder möglich (Ausnahmen: Probetraining, Tenniscamps, Wintertraining). Die
            Vereinsmitgliedschaft ist ein eigenständiges Vertragsverhältnis zwischen dem Kunden und dem Verein und nicht Gegenstand des Trainingsvertrags mit uns.
            Gebühren und Konditionen können sich ändern; maßgeblich sind allein die aktuellen Angaben des Vereins unter{" "}
            <a href="https://tc-britz.de/" target="_blank" rel="noopener noreferrer" className="link-inline">tc-britz.de</a>.
          </p>
        </div>

        {/* § 11 */}
        <div className="section-head">
          <span className="num">§ 11</span>
          <span className="title">Foto- und Videoaufnahmen</span>
        </div>
        <div className="prose">
          <p>
            Eine Veröffentlichung oder werbliche Nutzung von Foto-/Videoaufnahmen erfolgt ausschließlich auf Grundlage einer gesonderten, freiwilligen und jederzeit
            widerruflichen Einwilligung (bei Minderjährigen der Erziehungsberechtigten). Diese Einwilligung wird getrennt von diesen AGB eingeholt; die Teilnahme am
            Training hängt nicht von ihr ab. Einzelheiten regelt die Datenschutzerklärung.
          </p>
        </div>

        {/* § 12 */}
        <div className="section-head">
          <span className="num">§ 12</span>
          <span className="title">Datenschutz</span>
        </div>
        <div className="prose">
          <p>
            Die Verarbeitung personenbezogener Daten (insbesondere Anmelde-, SEPA-/Bankdaten und – bei Camps – ggf. Gesundheitsdaten nach Art. 9 DSGVO) richtet sich
            nach unserer Datenschutzerklärung, die Sie auf unseren Standortseiten abrufen können. Verantwortlicher ist die Tennisschule Zlatan Palazov und Artur
            Ivanenko GbR.
          </p>
        </div>

        {/* § 13 */}
        <div className="section-head">
          <span className="num">§ 13</span>
          <span className="title">Schlussbestimmungen</span>
        </div>
        <div className="prose">
          <p>
            (1) Es gilt das Recht der Bundesrepublik Deutschland. Bei Verbrauchern gilt dies nur, soweit dadurch nicht der Schutz zwingender Bestimmungen des
            Aufenthaltsstaats entzogen wird (Art. 6 Rom-I-VO). Eine Gerichtsstandsvereinbarung zulasten von Verbrauchern wird nicht getroffen.
          </p>
          <p>
            (2) <strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen unberührt; an die Stelle
            der unwirksamen Bestimmung treten die gesetzlichen Regelungen (§ 306 BGB).
          </p>
          <p>
            (3) <strong>Verbraucherstreitbeilegung:</strong> Wir sind nicht bereit und nicht verpflichtet, an einem Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen (§ 36 VSBG).
          </p>
        </div>

        <div className="prose" style={{ marginTop: 32 }}>
          <p className="muted-note">
            Stand: Juni 2026. Diese Bedingungen sollten vor der Veröffentlichung anwaltlich geprüft werden, insbesondere zur Haftung.
          </p>
        </div>
      </div>
      <LegalFooter anlage="Britz" />
    </div>
  );
}
