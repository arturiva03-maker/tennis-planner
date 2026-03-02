import React, { useState } from "react";
import RegistrationForm from "./RegistrationForm";
import ProbetrainingForm from "./ProbetrainingForm";
import "./App.css";

type UserType = "existing" | "new" | null;

export default function WeddingRegistrationWrapper() {
  const [userType, setUserType] = useState<UserType>(null);

  // If user selected existing, show normal registration form
  if (userType === "existing") {
    return <RegistrationForm anlage="Wedding" />;
  }

  // If user selected new, show probetraining form
  if (userType === "new") {
    return <ProbetrainingForm onBack={() => setUserType(null)} />;
  }

  // Show selection screen
  return (
    <div className="registrationPage weddingTheme">
      <div className="card registrationCard" style={{ maxWidth: 600 }}>
        <h1 style={{ marginBottom: 8 }}>Trainingsanmeldung Wedding</h1>
        <p className="muted" style={{ marginBottom: 32 }}>
          Bitte wählen Sie eine Option aus:
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button
            onClick={() => setUserType("existing")}
            style={{
              padding: "20px 24px",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(37, 99, 235, 0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Ich nehme bereits am Training teil
            </div>
            <div style={{ opacity: 0.9, fontSize: 14 }}>
              Saisonanmeldung für bestehende Teilnehmer
            </div>
          </button>

          <button
            onClick={() => setUserType("new")}
            style={{
              padding: "20px 24px",
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(245, 158, 11, 0.3)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Ich bin neu und möchte ein Probetraining buchen
            </div>
            <div style={{ opacity: 0.9, fontSize: 14 }}>
              Für alle, die zum ersten Mal bei uns trainieren möchten
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
