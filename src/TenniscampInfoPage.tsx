import React, { useState } from "react";
import "./App.css";
import "./tenniscamp.css";
import { LegalFooter } from "./LegalText";

const GREEN = "#16a34a";
const GREEN_TINT = "#f0fdf4";
const GREEN_TINT_BORDER = "#bbf7d0";
const INK = "#0a0a0a";
const INK_SOFT = "#52525b";
const MUTED = "#71717a";
const BORDER = "#e4e4e7";
const SURFACE = "#f6f7f6";

type Week = { label: string; dates: string };

type Camp = {
  key: "kinder" | "erwachsene";
  name: string;
  tag: string;
  summary: string;
  time: string;
  timeNote: string;
  price: string;
  priceNote: string;
  bring: string;
  weeks: Week[];
};

const WEEK_1: Week = { label: "1. Ferienwoche", dates: "13. – 17. Juli" };
const WEEK_LAST: Week = { label: "Letzte Ferienwoche", dates: "17. – 21. August" };

const CAMPS: Camp[] = [
  {
    key: "kinder",
    name: "Kindercamp",
    tag: "Kinder & Jugendliche",
    summary: "10:00 – 15:00 Uhr · 270 €",
    time: "Mo – Fr, 10:00 – 15:00 Uhr",
    timeNote: "Mittagspause 12:00 – 13:00 Uhr",
    price: "270 €",
    priceNote: "inkl. Mittagessen",
    bring: "Sandplatzschuhe (Pflicht) · Wasserflasche · Tennisschläger (Ausleihe möglich)",
    weeks: [WEEK_LAST],
  },
  {
    key: "erwachsene",
    name: "Erwachsenencamp",
    tag: "Erwachsene",
    summary: "18:00 – 20:00 Uhr · 140 €",
    time: "Mo – Fr, 18:00 – 20:00 Uhr",
    timeNote: "max. 12 Teilnehmer",
    price: "140 €",
    priceNote: "pro Woche",
    bring: "Eigener Schläger · Sandplatzschuhe (Pflicht) · Wasserflasche",
    weeks: [WEEK_1, WEEK_LAST],
  },
];

export default function TenniscampInfoPage() {
  const [open, setOpen] = useState<Camp["key"] | null>("kinder");

  const eyebrow: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: MUTED,
    fontWeight: 700,
  };

  const weekBox = (label: string, dates: string) => (
    <div key={label} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ ...eyebrow, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: INK }}>{dates}</div>
    </div>
  );

  const metaItem = (label: string, value: string, note: string, accent?: boolean) => (
    <div>
      <div style={{ ...eyebrow, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ? GREEN : INK }}>{value}</div>
      {note && <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{note}</div>}
    </div>
  );

  return (
    <div className="tc-page">
      <div
        style={{
          width: "100%",
          maxWidth: 760,
          background: "#fff",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 24px 60px -22px rgba(8, 30, 20, 0.30)",
          animation: "tc-rise 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        }}
      >
        {/* Hero */}
        <div className="tc-hero">
          <div className="tc-wordmark">Tennisschule A bis Z · BSC Rehberge</div>
          <h1>Tenniscamps 2026</h1>
          <p>
            In den Sommerferien finden am BSC Rehberge Tenniscamps für Kinder und Erwachsene statt –
            eingeteilt nach Spielstärke, passend für jedes Niveau.
          </p>
        </div>

        <div className="tc-infobody">
          {/* Eckdaten: Wo & Fragen */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginBottom: 28,
            }}
          >
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
              <div style={{ ...eyebrow, marginBottom: 10 }}>Wo</div>
              <p style={{ margin: 0, fontWeight: 600, color: INK }}>BSC Rehberge</p>
              <p style={{ margin: "2px 0 0 0", color: INK_SOFT, fontSize: 14 }}>Sambesistraße 11</p>
              <p style={{ margin: "2px 0 0 0", color: INK_SOFT, fontSize: 14 }}>13351 Berlin-Wedding</p>
            </div>
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
              <div style={{ ...eyebrow, marginBottom: 10 }}>Fragen</div>
              <p style={{ margin: 0 }}>
                <a href="tel:+4915560062745" style={{ color: INK, textDecoration: "none", fontWeight: 600 }}>
                  0155 60062745
                </a>
              </p>
              <p style={{ margin: "2px 0 0 0" }}>
                <a href="mailto:tennisabisz@gmail.com" style={{ color: GREEN, textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
                  tennisabisz@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Camps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
            {CAMPS.map((camp) => {
              const isOpen = open === camp.key;
              return (
                <div
                  key={camp.key}
                  style={{
                    border: `1px solid ${isOpen ? GREEN_TINT_BORDER : BORDER}`,
                    borderRadius: 16,
                    overflow: "hidden",
                    background: "#fff",
                    boxShadow: isOpen ? "0 0 0 3px rgba(34,197,94,0.10)" : "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : camp.key)}
                    style={{
                      width: "100%",
                      padding: "22px 24px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: INK }}>{camp.name}</h2>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            color: GREEN,
                            background: GREEN_TINT,
                            border: `1px solid ${GREEN_TINT_BORDER}`,
                            borderRadius: 999,
                            padding: "3px 10px",
                          }}
                        >
                          {camp.tag}
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 0 0", fontSize: 14, color: MUTED }}>
                        {camp.weeks.map((w) => w.dates).join(" & ")} · {camp.summary}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        color: isOpen ? GREEN : MUTED,
                        transition: "transform 0.2s",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        flexShrink: 0,
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: "0 24px 24px 24px" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: 12,
                          marginBottom: 20,
                        }}
                      >
                        {camp.weeks.map((w) => weekBox(w.label, w.dates))}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 20,
                          paddingBottom: 20,
                          marginBottom: 20,
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        {metaItem("Uhrzeit", camp.time, camp.timeNote)}
                        {metaItem("Kosten", camp.price, camp.priceNote, true)}
                      </div>

                      {camp.key === "erwachsene" && (
                        <div
                          style={{
                            background: GREEN_TINT,
                            border: `1px solid ${GREEN_TINT_BORDER}`,
                            borderRadius: 12,
                            padding: "14px 16px",
                            marginBottom: 20,
                          }}
                        >
                          <p style={{ margin: 0, fontSize: 14, color: "#15803d", lineHeight: 1.6 }}>
                            <strong>Ausgebucht – nur noch Warteliste:</strong> Die Plätze im Erwachsenencamp (max. 12 Teilnehmer)
                            sind bereits vergeben. Über das Anmeldeformular kannst du dich auf die Warteliste setzen – wird ein
                            Platz frei, melden wir uns in der Reihenfolge der Anmeldungen. Mitglieder des BSC Rehberge haben Vorrang.
                          </p>
                        </div>
                      )}

                      <div style={{ ...eyebrow, marginBottom: 6 }}>Mitzubringen</div>
                      <p style={{ margin: 0, fontSize: 14, color: INK_SOFT, lineHeight: 1.6 }}>{camp.bring}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stornierung */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px", marginBottom: 28 }}>
            <div style={{ ...eyebrow, marginBottom: 8 }}>Stornierung</div>
            <p style={{ margin: 0, fontSize: 14, color: INK_SOFT, lineHeight: 1.65 }}>
              Die Gebühr wird zwei Wochen vor Campbeginn abgebucht. Bis dahin ist eine kostenfreie Stornierung per
              E-Mail an{" "}
              <a href="mailto:tennisabisz@gmail.com" style={{ color: GREEN, fontWeight: 600 }}>
                tennisabisz@gmail.com
              </a>{" "}
              möglich.
            </p>
          </div>

          {/* CTA */}
          <div style={{ textAlign: "center" }}>
            <a className="tc-btn" href="/tenniscamp" style={{ padding: "14px 34px" }}>
              Jetzt zum Camp anmelden
            </a>
          </div>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
