import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RegistrationForm from "./RegistrationForm";
import ProbetrainingForm from "./ProbetrainingForm";
import { supabase } from "./supabaseClient";
import "./App.css";

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

type WeddingRegistrationWrapperProps = {
  directToProbetraining?: boolean;
};

export default function WeddingRegistrationWrapper({ directToProbetraining }: WeddingRegistrationWrapperProps) {
  const navigate = useNavigate();
  const [anmeldungAktiv, setAnmeldungAktiv] = useState<boolean | null>(null);

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

  // Direct to probetraining via /anmeldung-wedding-probetraining
  if (directToProbetraining) {
    return <ProbetrainingForm onBack={() => navigate("/wedding")} />;
  }

  // Loading
  if (anmeldungAktiv === null) {
    return (
      <div className="registrationPage weddingTheme">
        <div className="card registrationCard" style={{ maxWidth: 600, textAlign: "center", padding: "40px 20px" }}>
          <p className="muted">Laden...</p>
        </div>
      </div>
    );
  }

  // Deactivated
  if (!anmeldungAktiv) {
    return (
      <div className="registrationPage weddingTheme">
        <div className="card registrationCard" style={{ maxWidth: 600, textAlign: "center", padding: "40px 20px" }}>
          <h1 style={{ marginBottom: 16 }}>Anmeldung Wedding</h1>
          <p style={{ color: "#6b7280", marginBottom: 8 }}>
            Die Anmeldung ist aktuell nicht möglich.
          </p>
          <p style={{ color: "#6b7280" }}>
            Bitte wenden Sie sich direkt an das Trainerteam:{" "}
            <a href="mailto:tennisabisz@gmail.com">tennisabisz@gmail.com</a>
          </p>
        </div>
      </div>
    );
  }

  // Active – show normal registration form directly
  return <RegistrationForm anlage="Wedding" redirectUrl="/wedding" />;
}
