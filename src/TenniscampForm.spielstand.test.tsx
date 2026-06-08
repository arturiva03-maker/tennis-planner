import { render, screen, fireEvent } from "@testing-library/react";
import TenniscampForm from "./TenniscampForm";

test("Spielstand-Beschreibung erscheint bei Kindercamp + Nicht-Mitglied", () => {
  render(<TenniscampForm />);

  // Anfangs darf das Feld nicht da sein
  expect(screen.queryByText("Beschreibung des Spielstands")).toBeNull();

  // Kindercamp auswählen (radio value = camp.id)
  const kinderCamp = document.querySelector('input[name="campId"][value="woche1-kind"]') as HTMLInputElement;
  expect(kinderCamp).not.toBeNull();
  fireEvent.click(kinderCamp);

  // Mitglied "Nein" klicken
  const mitgliedNein = document.querySelector('input[name="mitglied"][value="nein"]') as HTMLInputElement;
  expect(mitgliedNein).not.toBeNull();
  fireEvent.click(mitgliedNein);

  // Jetzt muss das Beschreibungsfeld erscheinen
  expect(screen.getByText("Beschreibung des Spielstands")).toBeInTheDocument();
  expect(document.querySelector('textarea[name="spielstandBeschreibung"]')).not.toBeNull();

  // Wieder auf "Ja" -> Feld verschwindet
  const mitgliedJa = document.querySelector('input[name="mitglied"][value="ja"]') as HTMLInputElement;
  fireEvent.click(mitgliedJa);
  expect(screen.queryByText("Beschreibung des Spielstands")).toBeNull();
});
