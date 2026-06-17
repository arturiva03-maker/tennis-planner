import React, { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// Gemeinsame Bausteine für das SEPA-Mandats-Gate im Spontan-/Sommertraining-
// Buchungsfenster. Werden von WeddingPage und BritzPage genutzt.

// IBAN in 4er-Blöcken formatieren (Eingabekomfort im eingebetteten Mandat)
export function formatIbanGroups(value: string): string {
  return value.replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

// Mandatsreferenz für ein direkt im Buchungsfenster erteiltes SEPA-Mandat
export function generateSpontanMandatsreferenz(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rnd = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SEPA-${y}${m}${d}-${rnd}`;
}

// Namensfeld mit Live-Vorschlägen aus der Spieler-/Mandatsdatenbank. Der
// Mandats-Status wird NICHT in der Vorschlagsliste angezeigt, sondern erst
// nach Auswahl eines Spielers (oder exaktem Treffer) per spontan_hat_mandat
// geprüft. hatMandat: null = noch unbekannt.
export function MandatNameField({
  value,
  hatMandat,
  onChange,
  placeholder,
  accountId,
  colors,
  disabled,
}: {
  value: string;
  hatMandat: boolean | null;
  onChange: (name: string, hatMandat: boolean | null) => void;
  placeholder?: string;
  accountId: string;
  colors: Record<string, string>;
  disabled?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const reqRef = useRef(0);
  const pickedRef = useRef(false);

  // Mandat erst bei Auswahl / exaktem Treffer prüfen (nicht für die ganze Liste)
  const resolveMandat = async (name: string) => {
    try {
      const { data } = await supabase.rpc("spontan_hat_mandat", { p_account_id: accountId, p_name: name, p_email: null });
      onChange(name, Boolean(data));
    } catch {
      onChange(name, false);
    }
  };

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (pickedRef.current) {
      pickedRef.current = false;
      return;
    }
    const my = ++reqRef.current;
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc("spontan_spieler_suche", { p_account_id: accountId, q });
        if (my !== reqRef.current) return;
        const list = (Array.isArray(data) ? data : []) as string[];
        setSuggestions(list);
        setOpen(list.length > 0);
        // Mandat nur prüfen, wenn der getippte Name exakt einem Vorschlag entspricht
        const exact = list.find((s) => s.toLowerCase() === q.toLowerCase());
        if (exact) resolveMandat(exact);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, accountId]);

  const pick = (name: string) => {
    pickedRef.current = true;
    setOpen(false);
    setSuggestions([]);
    onChange(name, null);     // Name sofort übernehmen
    resolveMandat(name);      // Mandat im Hintergrund prüfen
  };

  const showStatus = value.trim().length >= 2 && hatMandat !== null && !open;

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, null)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onBlur={() => setTimeout(() => {
          setOpen(false);
          const v = value.trim();
          if (v.length >= 2) resolveMandat(v);
        }, 180)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${hatMandat === false ? "#c2392f" : colors.border}`,
          borderRadius: 2,
          fontSize: 15,
          boxSizing: "border-box",
        }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 30,
          background: colors.white,
          border: `1px solid ${colors.border}`,
          borderTop: "none",
          maxHeight: 220,
          overflowY: "auto",
          boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
        }}>
          {suggestions.map((name, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pick(name); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                background: "none",
                border: "none",
                borderBottom: `1px solid ${colors.bgLight}`,
                cursor: "pointer",
                fontSize: 14,
                color: colors.text,
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      {showStatus && (
        <p style={{ margin: "6px 0 0", fontSize: 12.5, fontWeight: 600, color: hatMandat ? "#1a7a3a" : "#c2392f" }}>
          {hatMandat ? "✓ SEPA-Lastschriftmandat hinterlegt" : "⚠ Kein SEPA-Lastschriftmandat hinterlegt"}
        </p>
      )}
    </div>
  );
}
