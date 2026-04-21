import React, { useEffect } from "react";

export type BallotAnlage = "Wedding" | "Britz";

export const BALLOT_THEME = {
  Wedding: { h: 45, a: "oklch(0.58 0.14 45)" },
  Britz: { h: 260, a: "oklch(0.55 0.2 260)" },
} as const;

export function getBallotThemeStyle(anlage: BallotAnlage): React.CSSProperties {
  return {
    ["--h" as any]: BALLOT_THEME[anlage].h,
    ["--a" as any]: BALLOT_THEME[anlage].a,
  } as React.CSSProperties;
}

export const BALLOT_CSS = `
.ballotForm {
  --paper: oklch(0.987 0.004 var(--h));
  --paper-sunk: oklch(0.965 0.006 var(--h));
  --ink: oklch(0.19 0.015 var(--h));
  --muted: oklch(0.4 0.014 var(--h));
  --muted-soft: oklch(0.55 0.012 var(--h));
  --hairline: oklch(0.87 0.008 var(--h));
  --hairline-strong: oklch(0.74 0.014 var(--h));
  --accent: var(--a);
  --accent-soft: color-mix(in oklab, var(--a) 12%, var(--paper));
  --danger: oklch(0.5 0.18 25);
  background: var(--paper);
  color: var(--ink);
  font-family: 'Spectral', 'Source Serif 4', Georgia, serif;
  min-height: 100vh;
  padding: clamp(32px, 6vw, 88px) clamp(20px, 5vw, 56px);
  font-feature-settings: "lnum" 1, "liga" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.ballotForm *, .ballotForm *::before, .ballotForm *::after { box-sizing: border-box; }
.ballotForm .sheet { max-width: 680px; margin: 0 auto; }
.ballotForm .sheet-wide { max-width: 820px; margin: 0 auto; }
.ballotForm .mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  font-feature-settings: "tnum" 1;
}
.ballotForm .meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 40px;
}
.ballotForm .meta span { display: inline-flex; align-items: center; gap: 10px; }
.ballotForm .meta span + span::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 4px;
  background: var(--accent);
  margin-right: 10px;
}
.ballotForm h1.display {
  font-family: 'Spectral', Georgia, serif;
  font-weight: 300;
  font-size: clamp(2.5rem, 5.8vw, 4rem);
  line-height: 1.04;
  letter-spacing: -0.02em;
  margin: 0 0 24px;
  color: var(--ink);
  font-feature-settings: "onum" 1, "liga" 1;
}
.ballotForm .display em { font-style: italic; font-weight: 400; }
.ballotForm .intro {
  font-size: 1.1875rem;
  line-height: 1.7;
  color: var(--ink);
  opacity: 0.78;
  max-width: 58ch;
  margin: 0 0 32px;
}
.ballotForm .notice {
  margin: 32px 0 48px;
  padding: 24px 0;
  border-top: 1px solid var(--hairline-strong);
  border-bottom: 1px solid var(--hairline-strong);
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 20px;
}
.ballotForm .notice .label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  padding-top: 3px;
  font-weight: 500;
}
.ballotForm .notice .body { font-size: 1.0625rem; line-height: 1.7; color: var(--ink); }
.ballotForm .notice .body p { margin: 0 0 10px; max-width: 62ch; }
.ballotForm .notice .body p:last-child { margin-bottom: 0; }
.ballotForm .notice a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
  text-decoration-color: var(--accent);
}
.ballotForm .section-head {
  display: flex;
  align-items: baseline;
  gap: 20px;
  margin: 56px 0 8px;
}
.ballotForm .section-head::before {
  content: "";
  display: block;
  flex: 0 0 32px;
  height: 1px;
  background: var(--accent);
  align-self: center;
}
.ballotForm .section-head .num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
}
.ballotForm .section-head .title {
  font-family: 'Spectral', serif;
  font-weight: 500;
  font-size: 1.4375rem;
  letter-spacing: -0.01em;
  color: var(--ink);
}
.ballotForm .section-note {
  font-size: 1rem;
  line-height: 1.65;
  color: var(--muted);
  margin: 0 0 12px;
  max-width: 60ch;
}
.ballotForm .field-row {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 20px;
  padding: 24px 0 16px;
  border-bottom: 1px solid var(--hairline);
  align-items: start;
}
.ballotForm .field-row:last-of-type { border-bottom: 1px solid var(--hairline-strong); }
.ballotForm .field-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  color: var(--muted-soft);
  letter-spacing: 0.06em;
  padding-top: 26px;
  font-variant-numeric: tabular-nums;
}
.ballotForm .field-body { min-width: 0; }
.ballotForm .field-body > label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  display: block;
  margin-bottom: 12px;
  font-weight: 500;
}
.ballotForm .field-body .req { color: var(--accent); margin-left: 4px; }
.ballotForm .field-body input[type="text"],
.ballotForm .field-body input[type="email"],
.ballotForm .field-body input[type="tel"],
.ballotForm .field-body input[type="number"],
.ballotForm .field-body textarea {
  font-family: 'Spectral', Georgia, serif;
  font-size: 1.1875rem;
  font-weight: 400;
  line-height: 1.55;
  color: var(--ink);
  width: 100%;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--hairline-strong);
  padding: 6px 0 12px;
  outline: none;
  transition: border-color 220ms cubic-bezier(0.22, 1, 0.36, 1);
  font-feature-settings: "lnum" 1, "liga" 1;
}
.ballotForm .field-body input.iban {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.08em;
  font-size: 1.0625rem;
  font-variant-numeric: tabular-nums;
}
.ballotForm .field-body input:focus,
.ballotForm .field-body textarea:focus {
  border-bottom-color: var(--accent);
}
.ballotForm .field-body input::placeholder,
.ballotForm .field-body textarea::placeholder {
  color: var(--muted-soft);
  font-style: italic;
}
.ballotForm .field-body textarea { resize: vertical; min-height: 96px; }
.ballotForm .segmented {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), 1fr);
  border-top: 1px solid var(--hairline-strong);
  border-bottom: 1px solid var(--hairline-strong);
  background: var(--paper);
}
.ballotForm .segmented button {
  position: relative;
  padding: 14px 16px;
  font-family: 'Spectral', serif;
  font-size: 1.0625rem;
  font-weight: 400;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-right: 1px solid var(--hairline);
  cursor: pointer;
  text-align: left;
  transition: color 180ms ease, background 180ms ease;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
}
.ballotForm .segmented button:last-child { border-right: 0; }
.ballotForm .segmented button:hover:not(.active) { background: color-mix(in oklab, var(--accent) 5%, var(--paper)); }
.ballotForm .segmented button.active {
  color: var(--ink);
  background: var(--accent-soft);
  font-weight: 500;
}
.ballotForm .segmented button .dot {
  width: 8px; height: 8px; border-radius: 1px;
  border: 1px solid var(--hairline-strong);
  background: transparent;
  flex: 0 0 auto;
}
.ballotForm .segmented button.active .dot {
  background: var(--accent);
  border-color: var(--accent);
}
.ballotForm .verf-row {
  display: grid;
  grid-template-columns: 48px 60px 1fr;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--hairline);
  align-items: center;
}
.ballotForm .verf-row:first-of-type { border-top: 1px solid var(--hairline-strong); }
.ballotForm .verf-row:last-of-type { border-bottom: 1px solid var(--hairline-strong); }
.ballotForm .verf-num {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  color: var(--muted-soft);
  font-variant-numeric: tabular-nums;
}
.ballotForm .verf-day {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
  color: var(--ink);
  font-weight: 600;
}
.ballotForm .verf-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
}
.ballotForm select.verf-select {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--hairline-strong);
  padding: 6px 22px 8px 4px;
  min-width: 76px;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: border-color 220ms ease, color 220ms ease;
  background-image: linear-gradient(45deg, transparent 50%, var(--ink) 50%), linear-gradient(135deg, var(--ink) 50%, transparent 50%);
  background-position: calc(100% - 10px) 15px, calc(100% - 6px) 15px;
  background-size: 5px 5px;
  background-repeat: no-repeat;
}
.ballotForm select.verf-select:focus { border-bottom-color: var(--accent); }
.ballotForm select.verf-select:disabled { color: var(--muted-soft); opacity: 0.5; cursor: not-allowed; }
.ballotForm .dash {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  color: var(--muted);
  font-size: 1rem;
}
.ballotForm .checkbox {
  display: inline-flex;
  align-items: flex-start;
  gap: 12px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}
.ballotForm .checkbox.block { display: flex; }
.ballotForm .checkbox.prose {
  text-transform: none;
  letter-spacing: 0;
  font-family: 'Spectral', Georgia, serif;
  font-size: 1rem;
  line-height: 1.55;
  font-weight: 400;
  color: var(--ink);
}
.ballotForm .checkbox input {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid var(--hairline-strong);
  background: var(--paper);
  cursor: pointer;
  margin: 0;
  flex: 0 0 auto;
  padding: 0;
  transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
  margin-top: 2px;
}
.ballotForm .checkbox input:checked {
  border-color: var(--accent);
  background: var(--paper);
  box-shadow: inset 0 0 0 5px var(--accent);
}
.ballotForm .submit-area {
  margin-top: 56px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: flex-start;
  border-top: 1px solid var(--hairline-strong);
  padding-top: 32px;
}
.ballotForm .agb {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--muted);
  margin: 0;
  max-width: 58ch;
}
.ballotForm .agb a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: var(--accent);
}
.ballotForm button.primary {
  font-family: 'Spectral', serif;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--paper);
  background: var(--ink);
  border: 1px solid var(--ink);
  padding: 18px 36px;
  cursor: pointer;
  letter-spacing: 0.01em;
  display: inline-flex;
  align-items: center;
  gap: 16px;
  transition: background 220ms ease, color 220ms ease, border-color 220ms ease;
}
.ballotForm button.primary::after {
  content: "→";
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 1rem;
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}
.ballotForm button.primary:hover:not(:disabled) { background: var(--accent); border-color: var(--accent); }
.ballotForm button.primary:hover:not(:disabled)::after { transform: translateX(4px); }
.ballotForm button.primary:disabled { opacity: 0.55; cursor: not-allowed; }
.ballotForm button.ghost {
  font-family: 'Spectral', serif;
  font-size: 1rem;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--hairline-strong);
  padding: 12px 24px;
  cursor: pointer;
  transition: border-color 220ms ease, color 220ms ease;
}
.ballotForm button.ghost:hover:not(:disabled) { border-color: var(--ink); }
.ballotForm button.ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.ballotForm a.link-inline {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: var(--accent);
}
.ballotForm .error-line {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 20px;
  padding: 14px 0;
  margin: 24px 0 0;
  border-top: 1px solid var(--danger);
  border-bottom: 1px solid var(--danger);
  font-size: 1.0625rem;
  line-height: 1.55;
  color: var(--ink);
}
.ballotForm .error-line .label {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--danger);
  font-weight: 500;
  padding-top: 2px;
}
.ballotForm .success-stamp {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  color: var(--accent);
  padding: 8px 12px;
  border: 1px solid var(--accent);
  display: inline-block;
  margin-bottom: 24px;
  font-weight: 500;
}

/* SEPA-specific mandate block */
.ballotForm .mandate-block {
  margin: 40px 0 32px;
  padding: 32px 32px;
  background: var(--paper-sunk);
  border-top: 1px solid var(--hairline-strong);
  border-bottom: 1px solid var(--hairline-strong);
}
.ballotForm .mandate-block .mandate-title {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 16px;
  font-weight: 500;
}
.ballotForm .mandate-block p {
  margin: 0 0 12px;
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--ink);
  max-width: 68ch;
}
.ballotForm .mandate-block p:last-child { margin-bottom: 0; }

/* Ballot table (for AGB/pricing pages) */
.ballotForm table.ballot-table {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0 24px;
  font-size: 1rem;
}
.ballotForm table.ballot-table thead tr {
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--hairline-strong);
}
.ballotForm table.ballot-table th {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
  text-align: left;
  padding: 14px 16px 14px 0;
}
.ballotForm table.ballot-table th:last-child { text-align: right; padding-right: 0; }
.ballotForm table.ballot-table td {
  padding: 16px 16px 16px 0;
  border-bottom: 1px solid var(--hairline);
  vertical-align: top;
  line-height: 1.55;
}
.ballotForm table.ballot-table td:last-child { text-align: right; padding-right: 0; }
.ballotForm table.ballot-table tr:last-child td { border-bottom: 1px solid var(--hairline-strong); }
.ballotForm table.ballot-table td.price {
  font-family: 'Spectral', serif;
  font-weight: 500;
  font-size: 1.0625rem;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ballotForm table.ballot-table td.price em {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-style: normal;
  font-weight: 400;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  color: var(--muted);
  text-transform: uppercase;
  display: block;
  margin-top: 4px;
}

.ballotForm .prose p {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--ink);
  margin: 0 0 14px;
  max-width: 64ch;
}
.ballotForm .prose p.muted-note {
  color: var(--muted);
  font-size: 0.9375rem;
}
.ballotForm .prose ul {
  margin: 0 0 16px;
  padding: 0 0 0 20px;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--ink);
  max-width: 62ch;
}
.ballotForm .prose ul li::marker {
  color: var(--accent);
}
.ballotForm .prose strong { font-weight: 600; }
.ballotForm .prose a.link-inline,
.ballotForm .prose a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  text-decoration-color: var(--accent);
}

.ballotForm .inline-toggle {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: transparent;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  padding: 0;
  border-bottom: 1px solid var(--accent);
  transition: color 180ms ease, border-color 180ms ease;
}
.ballotForm .inline-toggle:hover { color: var(--ink); border-bottom-color: var(--ink); }

.ballotForm .aufpreis-block {
  margin: 16px 0 24px;
  padding: 24px 28px;
  background: var(--paper-sunk);
}
.ballotForm .aufpreis-block .block-title {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 12px;
  font-weight: 500;
}

/* Overlay (modals in ballot style) */
.ballotForm .overlay {
  position: fixed; inset: 0;
  background: color-mix(in oklab, var(--ink) 60%, transparent);
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  backdrop-filter: blur(2px);
}
.ballotForm .overlay-sheet {
  background: var(--paper);
  max-width: 440px;
  width: 100%;
  padding: 40px 40px 32px;
  position: relative;
  box-shadow: 0 24px 80px -20px color-mix(in oklab, var(--ink) 50%, transparent);
}
.ballotForm .overlay-sheet::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 4px;
  background: var(--accent);
}
.ballotForm .overlay-sheet .stamp {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 500;
}
.ballotForm .overlay-sheet .stamp::before {
  content: "";
  display: inline-block;
  width: 24px; height: 1px;
  background: var(--accent);
}
.ballotForm .overlay-sheet h2 {
  font-family: 'Spectral', serif;
  font-weight: 500;
  font-size: 1.75rem;
  line-height: 1.25;
  margin: 0 0 16px;
  color: var(--ink);
  letter-spacing: -0.01em;
}
.ballotForm .overlay-sheet p {
  font-size: 1.0625rem;
  line-height: 1.65;
  color: var(--ink);
  opacity: 0.82;
  margin: 0 0 12px;
}
.ballotForm .overlay-sheet .countdown {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.82rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 24px 0 16px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
.ballotForm .overlay-sheet .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

@media (prefers-reduced-motion: reduce) {
  .ballotForm *, .ballotForm *::after { transition: none !important; }
}

@media (max-width: 540px) {
  .ballotForm { padding: 32px 20px 56px; }
  .ballotForm .field-row { grid-template-columns: 36px 1fr; gap: 12px; }
  .ballotForm .field-num { padding-top: 22px; }
  .ballotForm .verf-row { grid-template-columns: 28px 52px 1fr; gap: 10px; padding: 12px 0; }
  .ballotForm .notice { grid-template-columns: 1fr; gap: 8px; }
  .ballotForm .segmented { grid-template-columns: 1fr; }
  .ballotForm .segmented button { border-right: 0; border-bottom: 1px solid var(--hairline); }
  .ballotForm .segmented button:last-child { border-bottom: 0; }
  .ballotForm table.ballot-table { font-size: 0.9375rem; }
  .ballotForm table.ballot-table th, .ballotForm table.ballot-table td { padding-right: 8px; }
  .ballotForm .mandate-block { padding: 24px 20px; }
  .ballotForm .aufpreis-block { padding: 20px; }
}
`;

function useBallotFonts() {
  useEffect(() => {
    if (document.getElementById("ballot-form-fonts")) return;
    const preconnect1 = document.createElement("link");
    preconnect1.rel = "preconnect";
    preconnect1.href = "https://fonts.googleapis.com";
    const preconnect2 = document.createElement("link");
    preconnect2.rel = "preconnect";
    preconnect2.href = "https://fonts.gstatic.com";
    preconnect2.crossOrigin = "";
    const link = document.createElement("link");
    link.id = "ballot-form-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(preconnect1);
    document.head.appendChild(preconnect2);
    document.head.appendChild(link);
  }, []);
}

export function BallotStyles() {
  useBallotFonts();
  return <style>{BALLOT_CSS}</style>;
}
