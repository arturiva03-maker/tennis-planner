import { render, screen, fireEvent } from "@testing-library/react";
import TenniscampForm from "./TenniscampForm";

function selectCamp(value: string) {
  const camp = document.querySelector(`input[name="campId"][value="${value}"]`) as HTMLInputElement;
  expect(camp).not.toBeNull();
  fireEvent.click(camp);
}

function clickMitglied(value: "ja" | "nein") {
  const radio = document.querySelector(`input[name="mitglied"][value="${value}"]`) as HTMLInputElement;
  expect(radio).not.toBeNull();
  fireEvent.click(radio);
}

test("Spielstand-Beschreibung erscheint bei Kindercamp + Nicht-Mitglied", () => {
  render(<TenniscampForm />);

  expect(screen.queryByText("Beschreibung des Spielstands")).toBeNull();

  selectCamp("woche1-kind");
  clickMitglied("nein");

  expect(screen.getByText("Beschreibung des Spielstands")).toBeInTheDocument();
  expect(document.querySelector('textarea[name="spielstandBeschreibung"]')).not.toBeNull();

  // Wieder auf "Ja" -> Feld verschwindet
  clickMitglied("ja");
  expect(screen.queryByText("Beschreibung des Spielstands")).toBeNull();
});

test("Spielstand-Beschreibung erscheint auch bei Erwachsenencamp + Nicht-Mitglied", () => {
  render(<TenniscampForm />);

  selectCamp("woche1-erwachsene");
  expect(screen.queryByText("Beschreibung des Spielstands")).toBeNull();

  clickMitglied("nein");
  expect(screen.getByText("Beschreibung des Spielstands")).toBeInTheDocument();
});
