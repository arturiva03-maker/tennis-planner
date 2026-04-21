import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RegistrationForm from "./RegistrationForm";
import ProbetrainingForm from "./ProbetrainingForm";
import SepaForm from "./SepaForm";
import StepHeader from "./components/StepHeader";
import "./App.css";

type WeddingRegistrationWrapperProps = {
  directToProbetraining?: boolean;
};

export default function WeddingRegistrationWrapper({ directToProbetraining }: WeddingRegistrationWrapperProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"registration" | "sepa">("registration");
  const [registrationData, setRegistrationData] = useState<{ name: string; email: string } | null>(null);

  if (directToProbetraining) {
    return <ProbetrainingForm onBack={() => navigate("/wedding")} />;
  }

  if (step === "sepa" && registrationData) {
    return (
      <SepaForm
        anlage="Wedding"
        initialData={registrationData}
        headerNote={<StepHeader current={2} total={2} />}
      />
    );
  }

  return (
    <RegistrationForm
      anlage="Wedding"
      redirectUrl="/wedding"
      onNext={(data) => {
        setRegistrationData(data);
        setStep("sepa");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}
