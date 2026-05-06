import React, { useState, useMemo, useRef } from "react";

type SpielerLike = {
  id: string;
  vorname: string;
  nachname?: string;
  iban?: string;
  mandatsreferenz?: string;
};

type SpielerRow = { id: string; name: string; sum: number };

type BankRow = {
  buchungstag: string;
  betrag: number;
  ibanGegenkonto: string;
  verwendungszweck: string;
  beguenstigter: string;
  raw: string;
  zeile: number;
};

type MatchStatus =
  | "match"
  | "ambiguous"
  | "betrag_abweicht"
  | "iban_unbekannt"
  | "schon_abgerechnet"
  | "kein_kunde"
  | "ausgehend";

type Candidate = {
  spielerId: string;
  spielerName: string;
  expected: number;
  alreadyPaid: boolean;
  ibanMatch: boolean;
};

type MatchResult = {
  rowIdx: number;
  bankRow: BankRow;
  status: MatchStatus;
  candidates: Candidate[];
  selectedSpielerId: string | null;
  include: boolean;
  hint?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  abrechnungMonat: string;
  spielerRows: SpielerRow[];
  spielerList: SpielerLike[];
  getAdjustedSum: (id: string, base: number) => number;
  getSumBarForSpieler: (id: string) => number;
  payments: Record<string, boolean>;
  onApply: (spielerIds: string[]) => void;
};

function normIban(s: string) {
  return (s || "").replace(/\s+/g, "").toUpperCase();
}

function parseGermanNumber(s: string): number {
  if (!s) return 0;
  let cleaned = s.trim().replace(/\s/g, "");
  cleaned = cleaned.replace(/^\+/, "");
  const isNeg = /^-/.test(cleaned);
  cleaned = cleaned.replace(/^-/, "");
  cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return 0;
  return isNeg ? -n : n;
}

function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQ = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') inQ = true;
      else if (c === delim) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function findColumn(
  headers: string[],
  patterns: RegExp[],
  excludePatterns: RegExp[] = []
): number {
  for (const pattern of patterns) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (pattern.test(h) && !excludePatterns.some((p) => p.test(h))) return i;
    }
  }
  return -1;
}

const IBAN_LENGTHS: Record<string, number> = {
  AT: 20, BE: 16, CH: 21, DE: 22, DK: 18, ES: 24, FI: 18, FR: 27, GB: 22,
  IT: 27, LU: 20, NL: 18, NO: 15, PL: 28, PT: 25, SE: 24,
};

function extractIbanFromText(text: string): string {
  if (!text) return "";
  const cleaned = text.replace(/\s/g, "").toUpperCase();
  const re = /[A-Z]{2}\d{2}[A-Z0-9]{10,30}/g;
  let m: RegExpExecArray | null;
  const candidates: string[] = [];
  while ((m = re.exec(cleaned)) !== null) {
    if (m[0].includes("ZZZ")) continue; // Gläubiger-ID
    candidates.push(m[0]);
  }
  for (const c of candidates) {
    const cc = c.slice(0, 2);
    const expected = IBAN_LENGTHS[cc];
    if (expected && c.length >= expected) return c.slice(0, expected);
  }
  return candidates[0] ?? "";
}

function extractNameFromBuchungstext(text: string): string {
  if (!text) return "";
  const positional = text.match(
    /^\s*([A-Za-zÀ-ÿäöüÄÖÜß][A-Za-zÀ-ÿäöüÄÖÜß\s.\-']{1,80}?)\s+[A-Z]{4}[A-Z0-9]{4,7}\s+[A-Z]{2}\d{2}/
  );
  if (positional && positional[1]) {
    return positional[1].trim().replace(/\s+/g, " ");
  }
  const patterns = [
    /(?:auftraggeber|zahlungspflichtige?r?|begünstigte?r?|empf[äa]nger|name)[:\s]+([A-ZÄÖÜ][^\n;|]{1,60})/i,
    /SVWZ\+([^\n;|+]{2,60})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      return m[1].trim().replace(/\s+/g, " ");
    }
  }
  return "";
}

function normalizeForName(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function spielerNameMatch(sp: SpielerLike, haystack: string): boolean {
  const v = normalizeForName(sp.vorname || "");
  const n = normalizeForName(sp.nachname || "");
  const vTokens = v.split(" ").filter((t) => t.length >= 3);
  const nTokens = n.split(" ").filter((t) => t.length >= 3);
  if (vTokens.length === 0 && nTokens.length === 0) return false;
  const vMatch = vTokens.length === 0 || vTokens.some((t) => haystack.includes(t));
  const nMatch = nTokens.length === 0 || nTokens.some((t) => haystack.includes(t));
  return vMatch && nMatch;
}

type ParseDiagnostics = {
  totalLines: number;
  headerLine: number;
  delimiter: string;
  headers: string[];
  detected: { date: number; betrag: number; iban: number; vz: number; name: number };
  parsedRows: number;
  positive: number;
  negative: number;
  firstLines: string[];
};

function parseCommerzbankCsv(text: string): {
  rows: BankRow[];
  warning?: string;
  diag: ParseDiagnostics;
} {
  const stripped = text.replace(/^\uFEFF/, "");
  const allLines = stripped.split(/\r?\n/);
  const lines = allLines.filter((l) => l.trim().length > 0);
  const firstLines = lines.slice(0, 5);

  const emptyDiag: ParseDiagnostics = {
    totalLines: lines.length,
    headerLine: -1,
    delimiter: "",
    headers: [],
    detected: { date: -1, betrag: -1, iban: -1, vz: -1, name: -1 },
    parsedRows: 0,
    positive: 0,
    negative: 0,
    firstLines,
  };

  if (lines.length === 0) {
    return { rows: [], warning: "Datei ist leer.", diag: emptyDiag };
  }

  let headerIdx = lines.findIndex((l) => /buchungstag/i.test(l));
  if (headerIdx < 0) headerIdx = lines.findIndex((l) => /betrag/i.test(l));
  if (headerIdx < 0) headerIdx = 0;

  const sample = lines[headerIdx];
  const counts = {
    ";": (sample.match(/;/g) || []).length,
    ",": (sample.match(/,/g) || []).length,
    "\t": (sample.match(/\t/g) || []).length,
  };
  const delim =
    counts[";"] >= counts[","] && counts[";"] >= counts["\t"]
      ? ";"
      : counts["\t"] >= counts[","]
      ? "\t"
      : ",";

  const headers = parseCsvLine(lines[headerIdx], delim).map((h) =>
    h.trim().toLowerCase().replace(/^"|"$/g, "")
  );

  const colDate = findColumn(headers, [/^buchungstag$/, /buchungs.?tag/, /^datum$/]);
  const colBetrag = findColumn(headers, [
    /^betrag$/,
    /betrag/,
    /^umsatz$/,
    /^wert$/,
  ]);
  const colIban = findColumn(
    headers,
    [
      /iban.*(beg|partner|gegen|zahl|kontrahent|empf)/,
      /(beg|partner|gegen|zahl|kontrahent|empf).*iban/,
      /^iban$/,
      /iban/,
    ],
    [/auftrag/, /eigen/, /kontoinhaber/, /^iban kontoinhaber$/]
  );
  const colBuchungstext = findColumn(headers, [
    /buchungstext/,
    /verwendungs/,
    /vwz/,
    /^text$/,
  ]);
  const colVZ = colBuchungstext;
  const colNm = findColumn(
    headers,
    [
      /(beg|partner|empf|zahl|kontrahent).*name/,
      /name.*(beg|partner|empf|zahl|kontrahent)/,
      /(beg|partner|empf|zahl|kontrahent)/,
      /auftraggeber.*name/,
      /^name$/,
    ],
    [/^auftraggeberkonto$/, /iban/, /bank/, /bic/, /blz/, /^konto$/]
  );

  const diag: ParseDiagnostics = {
    ...emptyDiag,
    headerLine: headerIdx + 1,
    delimiter: delim === "\t" ? "TAB" : delim,
    headers,
    detected: { date: colDate, betrag: colBetrag, iban: colIban, vz: colVZ, name: colNm },
  };

  if (colBetrag < 0) {
    return {
      rows: [],
      warning: `Spalte 'Betrag' nicht gefunden. Gefundene Spalten: ${headers.join(", ") || "(keine)"}`,
      diag,
    };
  }

  const rows: BankRow[] = [];
  let pos = 0;
  let neg = 0;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delim).map((c) => c.replace(/^"|"$/g, ""));
    if (cells.length < 2) continue;
    const betrag = parseGermanNumber(cells[colBetrag] ?? "0");
    if (betrag === 0) continue;
    if (betrag > 0) pos++;
    else neg++;
    const buchungstextRaw = colBuchungstext >= 0 ? (cells[colBuchungstext] ?? "") : "";
    let iban = colIban >= 0 ? normIban(cells[colIban] ?? "") : "";
    if (!iban) iban = extractIbanFromText(buchungstextRaw);
    let name = colNm >= 0 ? (cells[colNm] ?? "").trim() : "";
    if (!name) name = extractNameFromBuchungstext(buchungstextRaw);
    rows.push({
      buchungstag: colDate >= 0 ? (cells[colDate] ?? "").trim() : "",
      betrag,
      ibanGegenkonto: iban,
      verwendungszweck: buchungstextRaw.trim(),
      beguenstigter: name,
      raw: lines[i],
      zeile: i + 1,
    });
  }
  diag.parsedRows = rows.length;
  diag.positive = pos;
  diag.negative = neg;
  return { rows, diag };
}

async function readFileAsText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("windows-1252").decode(buf);
  }
  return utf8;
}

function fmtEUR(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

function statusLabel(s: MatchStatus): { text: string; color: string } {
  switch (s) {
    case "match":
      return { text: "Eindeutig zuordenbar", color: "#10b981" };
    case "ambiguous":
      return { text: "Mehrdeutig — bitte Spieler wählen", color: "#f59e0b" };
    case "betrag_abweicht":
      return { text: "Betrag stimmt nicht", color: "#ef4444" };
    case "iban_unbekannt":
      return { text: "IBAN unbekannt", color: "#ef4444" };
    case "schon_abgerechnet":
      return { text: "Bereits als abgerechnet markiert", color: "#6b7280" };
    case "kein_kunde":
      return { text: "Kein passender Spieler", color: "#ef4444" };
    case "ausgehend":
      return { text: "Ausgehende Buchung — ignoriert", color: "#6b7280" };
  }
}

export default function BankImportModal({
  open,
  onClose,
  abrechnungMonat,
  spielerRows,
  spielerList,
  getAdjustedSum,
  getSumBarForSpieler,
  payments,
  onApply,
}: Props) {
  const [bankRows, setBankRows] = useState<BankRow[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [diag, setDiag] = useState<ParseDiagnostics | null>(null);
  const [hasUploaded, setHasUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ibanToSpieler = useMemo(() => {
    const m = new Map<string, SpielerLike[]>();
    for (const sp of spielerList) {
      const iban = normIban(sp.iban || "");
      if (!iban) continue;
      const arr = m.get(iban) ?? [];
      arr.push(sp);
      m.set(iban, arr);
    }
    return m;
  }, [spielerList]);

  const expectedBySpieler = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of spielerRows) {
      const adjusted = getAdjustedSum(r.id, r.sum);
      const bar = getSumBarForSpieler(r.id);
      const rest = Math.round((adjusted - bar) * 100) / 100;
      if (rest > 0) m.set(r.id, rest);
    }
    return m;
  }, [spielerRows, getAdjustedSum, getSumBarForSpieler]);

  const spielerNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const sp of spielerList) {
      m.set(sp.id, `${sp.vorname}${sp.nachname ? " " + sp.nachname : ""}`);
    }
    return m;
  }, [spielerList]);

  function buildMatch(bankRow: BankRow, idx: number): MatchResult {
    if (bankRow.betrag <= 0) {
      return {
        rowIdx: idx,
        bankRow,
        status: "ausgehend",
        candidates: [],
        selectedSpielerId: null,
        include: false,
      };
    }

    const tol = 0.01;
    const targetIban = bankRow.ibanGegenkonto;

    const ibanCands = targetIban ? ibanToSpieler.get(targetIban) ?? [] : [];
    const ibanIds = new Set(ibanCands.map((s) => s.id));

    const haystack = normalizeForName(
      `${bankRow.beguenstigter} ${bankRow.verwendungszweck}`
    );
    const nameCandIds = new Set<string>();
    for (const sp of spielerList) {
      if (spielerNameMatch(sp, haystack)) nameCandIds.add(sp.id);
    }

    const unionIds = new Set<string>();
    ibanIds.forEach((id) => unionIds.add(id));
    nameCandIds.forEach((id) => unionIds.add(id));

    const buildCand = (id: string): Candidate | null => {
      const sp = spielerList.find((s) => s.id === id);
      if (!sp) return null;
      const expected = expectedBySpieler.get(id) ?? 0;
      const key = `${abrechnungMonat}__${id}`;
      return {
        spielerId: id,
        spielerName: spielerNameById.get(id) ?? sp.vorname,
        expected,
        alreadyPaid: !!payments[key],
        ibanMatch: ibanIds.has(id),
      };
    };

    if (unionIds.size > 0) {
      const candInfos: Candidate[] = [];
      unionIds.forEach((id) => {
        const c = buildCand(id);
        if (c) candInfos.push(c);
      });

      const openCands = candInfos.filter((c) => !c.alreadyPaid);
      const amountMatches = openCands.filter(
        (c) => Math.abs(c.expected - bankRow.betrag) <= tol
      );

      if (amountMatches.length === 1) {
        return {
          rowIdx: idx,
          bankRow,
          status: "match",
          candidates: candInfos,
          selectedSpielerId: amountMatches[0].spielerId,
          include: true,
        };
      }
      if (amountMatches.length > 1) {
        return {
          rowIdx: idx,
          bankRow,
          status: "ambiguous",
          candidates: candInfos,
          selectedSpielerId: null,
          include: false,
          hint: `${amountMatches.length} Treffer (Name/IBAN+Betrag) — bitte manuell wählen`,
        };
      }
      if (openCands.length === 1) {
        return {
          rowIdx: idx,
          bankRow,
          status: "betrag_abweicht",
          candidates: candInfos,
          selectedSpielerId: null,
          include: false,
          hint: `${openCands[0].spielerName}: erwartet ${fmtEUR(
            openCands[0].expected
          )}, gezahlt ${fmtEUR(bankRow.betrag)}`,
        };
      }
      if (openCands.length === 0 && candInfos.length > 0) {
        return {
          rowIdx: idx,
          bankRow,
          status: "schon_abgerechnet",
          candidates: candInfos,
          selectedSpielerId: null,
          include: false,
          hint: "Erkannter Spieler ist bereits als abgerechnet markiert",
        };
      }
      const erwarteteListe = openCands
        .map((c) => `${c.spielerName}: ${fmtEUR(c.expected)}`)
        .join(", ");
      return {
        rowIdx: idx,
        bankRow,
        status: "betrag_abweicht",
        candidates: candInfos,
        selectedSpielerId: null,
        include: false,
        hint: `Erwartet: ${erwarteteListe}`,
      };
    }

    const fallback: Candidate[] = [];
    expectedBySpieler.forEach((expected, id) => {
      const key = `${abrechnungMonat}__${id}`;
      if (payments[key]) return;
      if (Math.abs(expected - bankRow.betrag) <= tol) {
        fallback.push({
          spielerId: id,
          spielerName: spielerNameById.get(id) ?? id,
          expected,
          alreadyPaid: false,
          ibanMatch: false,
        });
      }
    });
    if (fallback.length === 1) {
      return {
        rowIdx: idx,
        bankRow,
        status: "iban_unbekannt",
        candidates: fallback,
        selectedSpielerId: null,
        include: false,
        hint: `Kein Name/IBAN-Treffer — Betrag passt zu „${fallback[0].spielerName}". Manuell prüfen.`,
      };
    }
    if (fallback.length > 1) {
      return {
        rowIdx: idx,
        bankRow,
        status: "iban_unbekannt",
        candidates: fallback,
        selectedSpielerId: null,
        include: false,
        hint: `Kein Name/IBAN-Treffer — Betrag passt zu ${fallback.length} offenen Spielern.`,
      };
    }
    return {
      rowIdx: idx,
      bankRow,
      status: "kein_kunde",
      candidates: [],
      selectedSpielerId: null,
      include: false,
    };
  }

  async function handleFile(file: File) {
    setError(null);
    setWarning(null);
    setFileName(file.name);
    setHasUploaded(true);
    try {
      const text = await readFileAsText(file);
      const { rows, warning: warn, diag: parseDiag } = parseCommerzbankCsv(text);
      setDiag(parseDiag);
      if (rows.length === 0) {
        setWarning(
          warn ||
            "Datei enthält keine erkennbaren Buchungszeilen. Siehe Diagnose unten — passt die Spaltenerkennung?"
        );
      } else if (parseDiag.positive === 0) {
        setWarning(
          (warn ? warn + " " : "") +
            "Keine eingehenden Buchungen (positive Beträge) — bitte den richtigen CSV-Export wählen (Umsatzliste mit Gutschriften)."
        );
      } else if (warn) {
        setWarning(warn);
      }
      setBankRows(rows);
      const m = rows.map((r, i) => buildMatch(r, i));
      setMatches(m);
    } catch (e: any) {
      setError(`Datei konnte nicht gelesen werden: ${e?.message ?? e}`);
    }
  }

  function setSelectedFor(rowIdx: number, spielerId: string | null) {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.rowIdx !== rowIdx) return m;
        const include = !!spielerId;
        return { ...m, selectedSpielerId: spielerId, include };
      })
    );
  }

  function setIncludeFor(rowIdx: number, include: boolean) {
    setMatches((prev) =>
      prev.map((m) => (m.rowIdx === rowIdx ? { ...m, include } : m))
    );
  }

  const dupTargets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      if (m.include && m.selectedSpielerId) {
        counts.set(m.selectedSpielerId, (counts.get(m.selectedSpielerId) ?? 0) + 1);
      }
    }
    const dups = new Set<string>();
    counts.forEach((c, id) => {
      if (c > 1) dups.add(id);
    });
    return dups;
  }, [matches]);

  const counts = useMemo(() => {
    const c = { match: 0, ambiguous: 0, no_match: 0, schon: 0, included: 0 };
    for (const m of matches) {
      if (m.status === "match") c.match++;
      else if (m.status === "ambiguous") c.ambiguous++;
      else if (m.status === "schon_abgerechnet") c.schon++;
      else c.no_match++;
      if (m.include && m.selectedSpielerId) c.included++;
    }
    return c;
  }, [matches]);

  function handleApply() {
    const ids = matches
      .filter((m) => m.include && m.selectedSpielerId)
      .map((m) => m.selectedSpielerId as string);
    const unique = Array.from(new Set(ids));
    onApply(unique);
    reset();
    onClose();
  }

  function reset() {
    setBankRows([]);
    setMatches([]);
    setWarning(null);
    setError(null);
    setFileName("");
    setDiag(null);
    setHasUploaded(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  if (!open) return null;

  return (
    <div
      className="modalOverlay"
      onClick={() => {
        reset();
        onClose();
      }}
    >
      <div
        className="modalCard"
        style={{ maxWidth: 1100, maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Bank-Umsätze importieren</h2>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Abgleich für Abrechnungsmonat <strong>{abrechnungMonat}</strong> · CSV-Export aus
              Commerzbank-Online-Banking
            </p>
          </div>
          <button
            className="btn btnGhost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Abbrechen
          </button>
        </div>

        {!hasUploaded && (
          <div className="card cardInset" style={{ marginBottom: 16 }}>
            <p style={{ marginTop: 0 }}>
              <strong>Wie geht's?</strong>
            </p>
            <ol style={{ marginTop: 0, paddingLeft: 20 }}>
              <li>In Commerzbank-Online-Banking Umsätze des Monats als CSV exportieren.</li>
              <li>Datei unten auswählen — Vorschau erscheint.</li>
              <li>
                Konflikte (mehrdeutig / Betrag weicht ab) prüfen und ggf. Spieler manuell zuordnen.
              </li>
              <li>Mit „Übernehmen" werden die ausgewählten Spieler als <em>abgerechnet</em> markiert.</li>
            </ol>
            <div style={{ marginTop: 12 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>
        )}

        {hasUploaded && (
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
              alignItems: "center",
            }}
          >
            <span className="pill">
              Datei: <strong>{fileName}</strong>
            </span>
            {bankRows.length > 0 && (
              <>
                <span className="pill" style={{ background: "#d1fae5", color: "#065f46" }}>
                  ✓ {counts.match} eindeutig
                </span>
                {counts.ambiguous > 0 && (
                  <span className="pill" style={{ background: "#fef3c7", color: "#92400e" }}>
                    ⚠ {counts.ambiguous} mehrdeutig
                  </span>
                )}
                {counts.no_match > 0 && (
                  <span className="pill" style={{ background: "#fee2e2", color: "#991b1b" }}>
                    ✗ {counts.no_match} keine Zuordnung
                  </span>
                )}
                {counts.schon > 0 && (
                  <span className="pill" style={{ background: "#e5e7eb", color: "#374151" }}>
                    ↻ {counts.schon} schon abgerechnet
                  </span>
                )}
                <span className="pill" style={{ marginLeft: "auto" }}>
                  Übernehmen: <strong>{counts.included}</strong> Spieler
                </span>
              </>
            )}
            <button
              className="btn btnGhost"
              style={bankRows.length === 0 ? { marginLeft: "auto" } : undefined}
              onClick={reset}
            >
              Andere Datei
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              background: "#fef2f2",
              color: "#991b1b",
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {warning && (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              background: "#fffbeb",
              color: "#92400e",
              borderRadius: 6,
              fontSize: 13,
              whiteSpace: "pre-wrap",
            }}
          >
            {warning}
          </div>
        )}

        {hasUploaded && diag && (
          <details
            style={{
              marginBottom: 12,
              padding: 10,
              background: "#f3f4f6",
              borderRadius: 6,
              fontSize: 12,
            }}
            open={bankRows.length === 0 || counts.match === 0}
          >
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              Diagnose · {diag.parsedRows} Zeilen erkannt ({diag.positive} eingehend, {diag.negative} ausgehend)
            </summary>
            <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 11 }}>
              <div>
                <strong>Trennzeichen:</strong> „{diag.delimiter}"
              </div>
              <div>
                <strong>Header-Zeile:</strong> #{diag.headerLine} ({diag.totalLines} Zeilen gesamt)
              </div>
              <div>
                <strong>Erkannte Spalten:</strong>
                <ul style={{ margin: "4px 0 0 16px" }}>
                  <li>Buchungstag: {diag.detected.date >= 0 ? `Spalte ${diag.detected.date} (${diag.headers[diag.detected.date]})` : "❌ nicht erkannt"}</li>
                  <li>Betrag: {diag.detected.betrag >= 0 ? `Spalte ${diag.detected.betrag} (${diag.headers[diag.detected.betrag]})` : "❌ nicht erkannt"}</li>
                  <li>IBAN-Gegenkonto: {diag.detected.iban >= 0 ? `Spalte ${diag.detected.iban} (${diag.headers[diag.detected.iban]})` : "❌ nicht erkannt"}</li>
                  <li>Verwendungszweck: {diag.detected.vz >= 0 ? `Spalte ${diag.detected.vz} (${diag.headers[diag.detected.vz]})` : "❌ nicht erkannt"}</li>
                  <li>Auftraggeber/Name: {diag.detected.name >= 0 ? `Spalte ${diag.detected.name} (${diag.headers[diag.detected.name]})` : "❌ nicht erkannt"}</li>
                </ul>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Alle Header ({diag.headers.length}):</strong>
                <div style={{ marginLeft: 8, wordBreak: "break-all" }}>
                  {diag.headers.map((h, i) => (
                    <span key={i} style={{ marginRight: 8 }}>
                      [{i}] {h}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Erste Zeilen der Datei:</strong>
                <pre style={{ background: "#fff", padding: 6, borderRadius: 4, overflow: "auto", marginTop: 4, maxHeight: 200 }}>
                  {diag.firstLines.join("\n")}
                </pre>
              </div>
            </div>
          </details>
        )}

        {bankRows.length > 0 && (
          <>
            {dupTargets.size > 0 && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: "#fee2e2",
                  color: "#991b1b",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                ⚠ Mindestens ein Spieler ist mehrfach ausgewählt. Bitte Auswahl korrigieren.
              </div>
            )}

            <div style={{ overflow: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>✓</th>
                    <th>Buchungstag</th>
                    <th>Betrag</th>
                    <th>Auftraggeber</th>
                    <th>IBAN</th>
                    <th>Status</th>
                    <th>Spieler-Zuordnung</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m) => {
                    const status = statusLabel(m.status);
                    const isDup =
                      m.selectedSpielerId && dupTargets.has(m.selectedSpielerId);
                    return (
                      <tr key={m.rowIdx}>
                        <td>
                          <input
                            type="checkbox"
                            checked={m.include}
                            disabled={!m.selectedSpielerId}
                            onChange={(e) =>
                              setIncludeFor(m.rowIdx, e.target.checked)
                            }
                          />
                        </td>
                        <td style={{ fontSize: 13 }}>{m.bankRow.buchungstag}</td>
                        <td style={{ fontWeight: 600 }}>{fmtEUR(m.bankRow.betrag)}</td>
                        <td style={{ fontSize: 13, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.bankRow.beguenstigter}>
                          {m.bankRow.beguenstigter || "—"}
                        </td>
                        <td style={{ fontSize: 12, fontFamily: "monospace" }}>
                          {m.bankRow.ibanGegenkonto
                            ? `…${m.bankRow.ibanGegenkonto.slice(-6)}`
                            : "—"}
                        </td>
                        <td>
                          <span
                            style={{
                              color: status.color,
                              fontWeight: 600,
                              fontSize: 12,
                              display: "block",
                            }}
                          >
                            {status.text}
                          </span>
                          {m.hint && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                display: "block",
                                marginTop: 2,
                              }}
                            >
                              {m.hint}
                            </span>
                          )}
                          {m.bankRow.verwendungszweck && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                                display: "block",
                                marginTop: 2,
                                maxWidth: 240,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={m.bankRow.verwendungszweck}
                            >
                              VZ: {m.bankRow.verwendungszweck}
                            </span>
                          )}
                        </td>
                        <td>
                          <select
                            value={m.selectedSpielerId ?? ""}
                            onChange={(e) =>
                              setSelectedFor(m.rowIdx, e.target.value || null)
                            }
                            style={{
                              minWidth: 200,
                              borderColor: isDup ? "#ef4444" : undefined,
                            }}
                          >
                            <option value="">— nicht zuordnen —</option>
                            {m.candidates.length > 0 && (
                              <optgroup label="Mit dieser IBAN registriert">
                                {m.candidates.map((c) => (
                                  <option key={c.spielerId} value={c.spielerId}>
                                    {c.spielerName}
                                    {c.alreadyPaid ? " (bereits abgerechnet)" : ""}
                                    {c.expected > 0 && !c.alreadyPaid
                                      ? ` — offen ${fmtEUR(c.expected)}`
                                      : ""}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Alle offenen Spieler im Monat">
                              {Array.from(expectedBySpieler.entries())
                                .filter(([id]) => {
                                  const key = `${abrechnungMonat}__${id}`;
                                  return !payments[key];
                                })
                                .filter(
                                  ([id]) =>
                                    !m.candidates.find((c) => c.spielerId === id)
                                )
                                .map(([id, exp]) => (
                                  <option key={id} value={id}>
                                    {spielerNameById.get(id) ?? id} — offen {fmtEUR(exp)}
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn btnGhost"
                onClick={() => {
                  reset();
                  onClose();
                }}
              >
                Abbrechen
              </button>
              <button
                className="btn"
                disabled={counts.included === 0 || dupTargets.size > 0}
                onClick={handleApply}
              >
                {counts.included > 0
                  ? `${counts.included} Spieler als abgerechnet markieren`
                  : "Übernehmen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
