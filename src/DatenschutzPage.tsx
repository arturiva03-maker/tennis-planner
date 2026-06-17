import React from "react";
import { DatenschutzContent } from "./LegalText";

export default function DatenschutzPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f5", padding: "40px 16px", fontFamily: "'Segoe UI', system-ui, Arial, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", background: "#fff", borderRadius: 16, padding: "32px 28px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#171717", marginBottom: 20 }}>Datenschutzerklärung</h1>
        <div style={{ fontSize: 14, color: "#52525b", lineHeight: 1.8 }}>
          <DatenschutzContent />
        </div>
        <p style={{ marginTop: 28, fontSize: 13 }}>
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{ background: "none", border: "none", color: "#1668c7", cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}
          >
            ← Zurück
          </button>
        </p>
      </div>
    </div>
  );
}
