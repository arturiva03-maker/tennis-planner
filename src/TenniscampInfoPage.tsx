import React, { useState } from "react";
import "./App.css";

const INK = "#171717";
const INK_SOFT = "#525252";
const MUTED = "#737373";
const BORDER = "#e5e5e5";
const SURFACE = "#fafafa";

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
};

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
  },
];

const WEEKS = [
  { label: "1. Ferienwoche", dates: "13. – 17. Juli" },
  { label: "Letzte Ferienwoche", dates: "17. – 21. August" },
];

export default function TenniscampInfoPage() {
  const [open, setOpen] = useState<Camp["key"] | null>("kinder");

  const eyebrow: React.CSSProperties = {
    fontSize: 12,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: MUTED,
    fontWeight: 600,
  };

  const weekBox = (label: string, dates: string) => (
    <div
      key={label}
      style={{
        background: "#fff",
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: "16px 18px",
      }}
    >
      <div style={{ ...eyebrow, fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: INK }}>{dates}</div>
    </div>
  );

  const metaItem = (label: string, value: string, note: string) => (
    <div>
      <div style={{ ...eyebrow, fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: INK }}>{value}</div>
      {note && <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{note}</div>}
    </div>
  );

  return (
    <div className="registrationPage">
      <div className="card registrationCard" style={{ maxWidth: 760 }}>
        {/* Header */}
        <div style={{ textAlign: "center", paddingBottom: 28, marginBottom: 28, borderBottom: `1px solid ${BORDER}` }}>
          <div style={eyebrow}>Tennisschule A bis Z · BSC Rehberge</div>
          <h1 style={{ margin: "12px 0 0 0", fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", color: INK }}>
            Tenniscamps 2026
          </h1>
          <p style={{ margin: "12px auto 0", maxWidth: 520, fontSize: 15, lineHeight: 1.7, color: INK_SOFT }}>
            In den Sommerferien finden am BSC Rehberge Tenniscamps für Kinder und Erwachsene statt.
            Die Teilnehmer werden nach Spielstärke in Gruppen eingeteilt – passend für jedes Niveau.
          </p>
        </div>

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
              <a href="mailto:tennisabisz@gmail.com" style={{ color: INK_SOFT, textDecoration: "none", fontSize: 14 }}>
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
                  border: `1px solid ${BORDER}`,
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#fff",
                  transition: "border-color 0.15s",
                  ...(isOpen ? { borderColor: "#d4d4d4" } : {}),
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
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: INK_SOFT,
                          background: SURFACE,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 999,
                          padding: "3px 10px",
                        }}
                      >
                        {camp.tag}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0 0 0", fontSize: 14, color: MUTED }}>
                      13. – 17. Juli &amp; 17. – 21. August · {camp.summary}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      color: MUTED,
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
                      {WEEKS.map((w) => weekBox(w.label, w.dates))}
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
                      {metaItem("Kosten", camp.price, camp.priceNote)}
                    </div>

                    <div style={{ ...eyebrow, fontSize: 11, marginBottom: 6 }}>Mitzubringen</div>
                    <p style={{ margin: 0, fontSize: 14, color: INK_SOFT, lineHeight: 1.6 }}>{camp.bring}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stornierung */}
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 28,
          }}
        >
          <div style={{ ...eyebrow, fontSize: 11, marginBottom: 8 }}>Stornierung</div>
          <p style={{ margin: 0, fontSize: 14, color: INK_SOFT, lineHeight: 1.65 }}>
            Die Gebühr wird zwei Wochen vor Campbeginn abgebucht. Bis dahin ist eine kostenfreie Stornierung per
            E-Mail an{" "}
            <a href="mailto:tennisabisz@gmail.com" style={{ color: INK, fontWeight: 600 }}>
              tennisabisz@gmail.com
            </a>{" "}
            möglich.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <a
            href="/tenniscamp"
            style={{
              display: "inline-block",
              background: INK,
              color: "#fff",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
              padding: "14px 32px",
              borderRadius: 999,
            }}
          >
            Jetzt zum Camp anmelden
          </a>
        </div>
      </div>
    </div>
  );
}
