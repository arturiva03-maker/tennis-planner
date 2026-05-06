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
  | "kein_kunde";

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

function findColumn(headers: string[], patterns: RegExp[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (patterns.some((p) => p.test(headers[i]))) return i;
  }
  return -1;
}

function parseCommerzbankCsv(text: string): { rows: BankRow[]; warning?: string } {
  const stripped = text.replace(/^\uFEFF/, "");
  const allLines = stripped.split(/\r?\n/);
  const lines = allLines.filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], warning: "Datei ist leer." };

  let headerIdx = lines.findIndex((l) => /buchungstag/i.test(l));
  if (headerIdx < 0) headerIdx = 0;

  const sample = lines[headerIdx];
  const delim = sample.includes(";") ? ";" : sample.includes("\t") ? "\t" : ",";
  const headers = parseCsvLine(lines[headerIdx], delim).map((h) =>
    h.trim().toLowerCase().replace(/^"|"$/g, "")
  );

  const colDate = findColumn(headers, [/^buchungstag$/, /buchungs.?tag/, /^datum$/]);
  const colBetrag = findColumn(headers, [/^betrag$/, /betrag.*eur|betrag.*€|umsatz|^wert$/]);
  const colIban = findColumn(headers, [
    /iban.*(beg|auftr|partner|gegen)/,
    /(beg|auftr|partner|gegen).*iban/,
    /^iban$/,
  ]);
  const colVZ = findColumn(headers, [/verwendungs/, /buchungstext/, /umsatzart/]);
  const colNm = findColumn(headers, [
    /(beg|auftr|partner).*name/,
    /(beg|auftr|partner)/,
    /empf/,
    /name/,
  ]);

  if (colBetrag < 0) {
    return { rows: [], warning: "Spalte 'Betrag' nicht gefunden." };
  }

  const rows: BankRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delim).map((c) => c.replace(/^"|"$/g, ""));
    if (cells.length < headers.length / 2) continue;
    const betrag = parseGermanNumber(cells[colBetrag] ?? "0");
    if (betrag === 0) continue;
    rows.push({
      buchungstag: colDate >= 0 ? (cells[colDate] ?? "").trim() : "",
      betrag,
      ibanGegenkonto: colIban >= 0 ? normIban(cells[colIban] ?? "") : "",
      verwendungszweck: colVZ >= 0 ? (cells[colVZ] ?? "").trim() : "",
      beguenstigter: colNm >= 0 ? (cells[colNm] ?? "").trim() : "",
      raw: lines[i],
      zeile: i + 1,
    });
  }
  return { rows };
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
    const targetIban = bankRow.ibanGegenkonto;
    const cands = ibanToSpieler.get(targetIban) ?? [];

    const candInfos: Candidate[] = cands.map((sp) => {
      const expected = expectedBySpieler.get(sp.id) ?? 0;
      const key = `${abrechnungMonat}__${sp.id}`;
      const alreadyPaid = !!payments[key];
      return {
        spielerId: sp.id,
        spielerName: spielerNameById.get(sp.id) ?? sp.vorname,
        expected,
        alreadyPaid,
        ibanMatch: true,
      };
    });

    const tol = 0.01;
    const betragMatches = candInfos.filter(
      (c) => Math.abs(c.expected - bankRow.betrag) <= tol && !c.alreadyPaid
    );

    let status: MatchStatus;
    let selected: string | null = null;
    let hint: string | undefined;

    if (cands.length === 0) {
      status = "iban_unbekannt";
    } else if (betragMatches.length === 1) {
      status = "match";
      selected = betragMatches[0].spielerId;
    } else if (betragMatches.length > 1) {
      status = "ambiguous";
      hint = `${betragMatches.length} Spieler mit gleicher IBAN und gleichem Betrag`;
    } else {
      const allPaid = candInfos.every((c) => c.alreadyPaid);
      const anyOpen = candInfos.some((c) => !c.alreadyPaid && c.expected > 0);
      if (allPaid && candInfos.length > 0) {
        status = "schon_abgerechnet";
        hint = "Spieler unter dieser IBAN ist bereits als abgerechnet markiert";
      } else if (anyOpen) {
        status = "betrag_abweicht";
        const erwarteteListe = candInfos
          .filter((c) => !c.alreadyPaid)
          .map((c) => `${c.spielerName}: ${fmtEUR(c.expected)}`)
          .join(", ");
        hint = `Erwartet hätten wir: ${erwarteteListe}`;
      } else {
        status = "kein_kunde";
      }
    }

    return {
      rowIdx: idx,
      bankRow,
      status,
      candidates: candInfos,
      selectedSpielerId: selected,
      include: status === "match",
      hint,
    };
  }

  async function handleFile(file: File) {
    setError(null);
    setWarning(null);
    setFileName(file.name);
    try {
      const text = await readFileAsText(file);
      const { rows, warning: warn } = parseCommerzbankCsv(text);
      const incoming = rows.filter((r) => r.betrag > 0);
      if (incoming.length === 0) {
        setWarning(
          warn ||
            "Keine eingehenden Buchungen (positive Beträge) in der Datei gefunden."
        );
      } else if (warn) {
        setWarning(warn);
      }
      setBankRows(incoming);
      const m = incoming.map((r, i) => buildMatch(r, i));
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

        {bankRows.length === 0 && (
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
            {error && (
              <div
                style={{
                  marginTop: 12,
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
          </div>
        )}

        {bankRows.length > 0 && (
          <>
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
              <button className="btn btnGhost" onClick={reset}>
                Andere Datei
              </button>
            </div>

            {warning && (
              <div
                style={{
                  marginBottom: 12,
                  padding: 10,
                  background: "#fffbeb",
                  color: "#92400e",
                  borderRadius: 6,
                  fontSize: 13,
                }}
              >
                {warning}
              </div>
            )}

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
