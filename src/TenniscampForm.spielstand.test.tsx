import { render, screen } from "@testing-library/react";
import TenniscampForm from "./TenniscampForm";

// Hinweis: Aktuell sind alle angebotenen Camps (letzte Ferienwoche) gesperrt.
// Das Erwachsenencamp der 1. Ferienwoche wurde komplett aus dem Formular entfernt.
// Der Spielstand-Beschreibungs-Flow ist daher über die UI nicht mehr erreichbar,
// solange kein Camp buchbar ist – die Tests prüfen deshalb den gesperrten Zustand.

test("Entferntes Camp (1. Ferienwoche) wird nicht mehr angeboten", () => {
  render(<TenniscampForm />);
  expect(document.querySelector('input[name="campId"][value="woche1-erwachsene"]')).toBeNull();
});

test("Camps der letzten Ferienwoche sind gesperrt (Radio deaktiviert + Hinweis)", () => {
  render(<TenniscampForm />);

  const kind = document.querySelector('input[name="campId"][value="woche6-kind"]') as HTMLInputElement;
  const erwachsene = document.querySelector('input[name="campId"][value="woche6-erwachsene"]') as HTMLInputElement;

  expect(kind).not.toBeNull();
  expect(erwachsene).not.toBeNull();
  expect(kind.disabled).toBe(true);
  expect(erwachsene.disabled).toBe(true);

  expect(screen.getAllByText("Anmeldung geschlossen").length).toBeGreaterThanOrEqual(2);
});
