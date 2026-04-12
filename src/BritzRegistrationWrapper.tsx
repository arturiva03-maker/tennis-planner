import React, { useState, useEffect } from "react";
import RegistrationForm from "./RegistrationForm";
import { supabase } from "./supabaseClient";
import "./App.css";

const DEFAULT_ACCOUNT_ID = "9168a8e1-d237-4316-90fe-f0e7dfb665b9";

export default function BritzRegistrationWrapper() {
  const [anmeldungAktiv, setAnmeldungAktiv] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from("account_state")
      .select("data")
      .eq("account_id", DEFAULT_ACCOUNT_ID)
      .maybeSingle()
      .then(({ data }) => {
        const aktiv = data?.data?.anmeldungAktiv?.britz ?? false;
        setAnmeldungAktiv(aktiv);
      });
  }, []);

  if (anmeldungAktiv === null) {
    return (
      <div className="registrationPage britzTheme">
        <div className="card registrationCard" style={{ maxWidth: 600, textAlign: "center", padding: "40px 20px" }}>
          <p className="muted">Laden...</p>
        </div>
      </div>
    );
  }

  if (!anmeldungAktiv) {
    return (
      <div className="registrationPage britzTheme">
        <div className="card registrationCard" style={{ maxWidth: 600, textAlign: "center", padding: "40px 20px" }}>
          <h1 style={{ marginBottom: 16 }}>Anmeldung Britz</h1>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            Die Anmeldung ist derzeit nicht möglich. Aktuell können Sie nur ein Probetraining buchen.
          </p>
          <a
            href="/probetraining-britz"
            className="btn"
            style={{ display: "inline-block" }}
          >
            Probetraining buchen
          </a>
        </div>
      </div>
    );
  }

  return <RegistrationForm anlage="Britz" />;
}
