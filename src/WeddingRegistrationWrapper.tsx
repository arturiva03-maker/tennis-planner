import React from "react";
import { useNavigate } from "react-router-dom";
import ProbetrainingForm from "./ProbetrainingForm";
import "./App.css";

type WeddingRegistrationWrapperProps = {
  directToProbetraining?: boolean;
};

export default function WeddingRegistrationWrapper({ directToProbetraining }: WeddingRegistrationWrapperProps) {
  const navigate = useNavigate();
  // Aktuell nur Probetraining möglich – normale Anmeldung deaktiviert
  return <ProbetrainingForm onBack={() => navigate("/wedding")} />;
}
