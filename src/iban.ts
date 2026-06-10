// Gemeinsame IBAN-Validierung nach ISO 13616 / SEPA.
// Wird vom Tenniscamp-Formular und vom SEPA-Formular verwendet.

// Laenderspezifische IBAN-Laengen aller SEPA-Laender (ISO-13616-Register).
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22,
  DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GI: 23, GR: 27,
  HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20,
  LV: 21, MC: 27, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24,
  SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

export type IBANCheckResult = {
  valid: boolean;
  reason?: "empty" | "incomplete" | "format" | "country" | "length" | "checksum";
  country?: string;
  expectedLength?: number;
  actualLength?: number;
};

export function normalizeIBAN(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase();
}

// Eingaben, die noch ein gueltiger IBAN-Anfang sein koennen ("D", "DE", "DE8", ...),
// sollen im Live-Feedback nicht als Fehler markiert werden.
const IBAN_PREFIX_REGEX = /^([A-Z]?|[A-Z]{2}[0-9]{0,2}|[A-Z]{2}[0-9]{2}[A-Z0-9]*)$/;
const IBAN_FORMAT_REGEX = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;

// Mod-97-Pruefsumme nach ISO 7064: erste 4 Zeichen ans Ende, Buchstaben als
// Zahlen (A=10 ... Z=35) einsetzen, Rest stueckweise berechnen (die Zahl ist
// zu gross fuer Number).
function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const value = ch >= "A" && ch <= "Z" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of value) {
      remainder = (remainder * 10 + (digit.charCodeAt(0) - 48)) % 97;
    }
  }
  return remainder;
}

export function checkIBAN(raw: string): IBANCheckResult {
  const iban = normalizeIBAN(raw);
  if (!iban) return { valid: false, reason: "empty" };

  if (!IBAN_FORMAT_REGEX.test(iban)) {
    if (IBAN_PREFIX_REGEX.test(iban)) {
      const country = iban.length >= 2 ? iban.slice(0, 2) : undefined;
      return {
        valid: false,
        reason: "incomplete",
        country,
        expectedLength: country ? IBAN_LENGTHS[country] : undefined,
        actualLength: iban.length,
      };
    }
    return { valid: false, reason: "format", actualLength: iban.length };
  }

  const country = iban.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[country];
  if (!expectedLength) {
    return { valid: false, reason: "country", country, actualLength: iban.length };
  }

  if (iban.length < expectedLength) {
    return { valid: false, reason: "incomplete", country, expectedLength, actualLength: iban.length };
  }
  if (iban.length > expectedLength) {
    return { valid: false, reason: "length", country, expectedLength, actualLength: iban.length };
  }

  if (mod97(iban) !== 1) {
    return { valid: false, reason: "checksum", country, expectedLength, actualLength: iban.length };
  }

  return { valid: true, country, expectedLength, actualLength: iban.length };
}

export function isValidIBAN(raw: string): boolean {
  return checkIBAN(raw).valid;
}

// Deutsche Begruendung fuer ein ungueltiges Ergebnis (fuer Live-Feedback und Submit).
export function ibanErrorMessage(result: IBANCheckResult): string {
  switch (result.reason) {
    case "empty":
      return "Bitte geben Sie eine IBAN ein.";
    case "incomplete":
      return result.country && result.expectedLength
        ? `IBAN unvollständig – eine ${result.country}-IBAN hat ${result.expectedLength} Zeichen (bisher ${result.actualLength}).`
        : "IBAN unvollständig.";
    case "format":
      return "Das sieht nicht nach einer gültigen IBAN aus.";
    case "country":
      return `Unbekannter Ländercode „${result.country}“ – bitte eine IBAN aus einem SEPA-Land verwenden.`;
    case "length":
      return `Eine ${result.country}-IBAN hat ${result.expectedLength} Zeichen (eingegeben: ${result.actualLength}).`;
    case "checksum":
      return "Die Prüfziffer stimmt nicht – bitte überprüfen Sie die IBAN auf Zahlendreher.";
    default:
      return "Bitte geben Sie eine gültige IBAN ein.";
  }
}
