import React from "react";
import { useNavigate } from "react-router-dom";
import RegistrationForm from "./RegistrationForm";
import ProbetrainingForm from "./ProbetrainingForm";
import "./App.css";

type WeddingRegistrationWrapperProps = {
  directToProbetraining?: boolean;
};

export default function WeddingRegistrationWrapper({ directToProbetraining }: WeddingRegistrationWrapperProps) {
  const navigate = useNavigate();

  if (directToProbetraining) {
    return <ProbetrainingForm onBack={() => navigate("/wedding")} />;
  }

  return <RegistrationForm anlage="Wedding" redirectUrl="/wedding" />;
}
