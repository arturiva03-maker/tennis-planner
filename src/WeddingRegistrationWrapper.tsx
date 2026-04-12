import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RegistrationForm from "./RegistrationForm";
import ProbetrainingForm from "./ProbetrainingForm";
import { supabase } from "./supabaseClient";
import "./App.css";

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

type UserType = "existing" | "new" | null;

type WeddingRegistrationWrapperProps = {
  directToProbetraining?: boolean;
};

export default function WeddingRegistrationWrapper({ directToProbetraining }: WeddingRegistrationWrapperProps) {
  const navigate = useNavigate();
  const [userType, setUserType] = useState<UserType>(directToProbetraining ? "new" : null);
  const [anmeldungAktiv, setAnmeldungAktiv] = useState<boolean | null>(null);

  useEffect(() => {
    if (directToProbetraining) {
      setUserType("new");
    }
  }, [directToProbetraining]);

  useEffect(() => {
    supabase
      .from("account_state")
      .select("data")
      .eq("account_id", DEFAULT_ACCOUNT_ID)
      .maybeSingle()
      .then(({ data }) => {
        const aktiv = data?.data?.anmeldungAktiv?.wedding ?? false;
        setAnmeldungAktiv(aktiv);
      });
  }, []);

  // If user selected existing and registration is active, show normal registration form
  if (userType === "existing" && anmeldungAktiv) {
    return <RegistrationForm anlage="Wedding" redirectUrl="/wedding" />;
  }

  // If user selected new, show probetraining form
  if (userType === "new") {
    return <ProbetrainingForm onBack={() => {
      if (directToProbetraining) {
        navigate("/wedding");
      } else {
        setUserType(null);
      }
    }} />;
  }

  // Loading state
  if (anmeldungAktiv === null) {
    return (
      <div className="registrationPage weddingTheme">
        <div className="card registrationCard" style={{ maxWidth: 600, textAlign: "center", padding: "40px 20px" }}>
          <p className="muted">Laden...</p>
        </div>
      </div>
    );
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
          {anmeldungAktiv ? (
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
          ) : (
            <div
              style={{
                padding: "20px 24px",
                background: "#f9fafb",
                color: "#9ca3af",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                textAlign: "left",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
                Saisonanmeldung / regelmäßiges Training
              </div>
              <div style={{ fontSize: 14 }}>
                Die Anmeldung ist derzeit nicht möglich. Aktuell können Sie nur ein Probetraining buchen.
              </div>
            </div>
          )}

          <button
            onClick={() => setUserType("new")}
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
        </div>
      </div>
    </div>
  );
}
