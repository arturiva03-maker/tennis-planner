import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RegistrationForm from "./RegistrationForm";
import ProbetrainingForm from "./ProbetrainingForm";
import "./App.css";

type UserType = "existing" | "new" | null;

type WeddingRegistrationWrapperProps = {
  directToProbetraining?: boolean;
};

export default function WeddingRegistrationWrapper({ directToProbetraining }: WeddingRegistrationWrapperProps) {
  const navigate = useNavigate();
  // Auswahlseite wieder aktiv
  const [userType, setUserType] = useState<UserType>(directToProbetraining ? "new" : null);

  useEffect(() => {
    if (directToProbetraining) {
      setUserType("new");
    }
  }, [directToProbetraining]);

  // If user selected existing, show normal registration form
  if (userType === "existing") {
    return <RegistrationForm anlage="Wedding" redirectUrl="/wedding" />;
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
              background: "#fff",
              color: "#1f2937",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.borderColor = "#2563eb";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Ich nehme bereits am Training teil oder möchte ein regelmäßiges Training buchen
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>
              Saisonanmeldung bzw. Anmeldung für bestehende Teilnehmer
            </div>
          </button>

          {/* Probetraining-Option vorübergehend deaktiviert */}
          {false && (
          <button
            onClick={() => navigate("/anmeldung-wedding-probetraining")}
            style={{
              padding: "20px 24px",
              background: "#fff",
              color: "#1f2937",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              cursor: "pointer",
              textAlign: "left",
              transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.1)";
              e.currentTarget.style.borderColor = "#2563eb";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
              Ich bin neu und möchte ein Probetraining buchen
            </div>
            <div style={{ color: "#6b7280", fontSize: 14 }}>
              Für alle, die zum ersten Mal bei uns trainieren möchten
            </div>
          </button>
          )}
        </div>
      </div>
    </div>
  );
}
