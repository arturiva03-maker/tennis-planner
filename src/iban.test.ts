import { checkIBAN, isValidIBAN } from "./iban";

describe("isValidIBAN", () => {
  it("akzeptiert gültige IBANs (mit und ohne Leerzeichen, klein geschrieben)", () => {
    expect(isValidIBAN("DE89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIBAN("DE89370400440532013000")).toBe(true);
    expect(isValidIBAN("de89 3704 0044 0532 0130 00")).toBe(true);
    expect(isValidIBAN("AT61 1904 3002 3457 3201")).toBe(true);
    expect(isValidIBAN("NL91 ABNA 0417 1643 00")).toBe(true);
  });

  it("lehnt Freitext ab", () => {
    expect(isValidIBAN("BITTE ÜBERWEISEN")).toBe(false);
    expect(checkIBAN("BITTE ÜBERWEISEN").reason).toBe("format");
    expect(isValidIBAN("BITTE UEBERWEISEN AUF MEIN KONTO")).toBe(false);
  });

  it("lehnt falsche Prüfziffern ab", () => {
    expect(isValidIBAN("DE00 0000 0000 0000 0000 00")).toBe(false);
    expect(checkIBAN("DE00 0000 0000 0000 0000 00").reason).toBe("checksum");
    expect(isValidIBAN("DE89 3704 0044 0532 0130 01")).toBe(false);
  });

  it("lehnt zu kurze oder zu lange IBANs ab", () => {
    expect(isValidIBAN("DE89 3704")).toBe(false);
    expect(checkIBAN("DE89 3704").reason).toBe("incomplete");
    expect(checkIBAN("DE89 3704 0044 0532 0130 0012").reason).toBe("length");
  });

  it("lehnt unbekannte Ländercodes ab", () => {
    expect(isValidIBAN("XX89 3704 0044 0532 0130 00")).toBe(false);
    expect(checkIBAN("XX89 3704 0044 0532 0130 00").reason).toBe("country");
  });

  it("meldet leere Eingaben als empty", () => {
    expect(checkIBAN("").reason).toBe("empty");
    expect(checkIBAN("   ").reason).toBe("empty");
  });
});
