import React, { useState } from "react";
import RegistrationForm from "./RegistrationForm";
import SepaForm from "./SepaForm";
import StepHeader from "./components/StepHeader";
import "./App.css";

export default function BritzRegistrationWrapper() {
  const [step, setStep] = useState<"registration" | "sepa">("registration");
  const [registrationData, setRegistrationData] = useState<{ name: string; email: string } | null>(null);

  if (step === "sepa" && registrationData) {
    return (
      <SepaForm
        anlage="Britz"
        initialData={registrationData}
        headerNote={<StepHeader current={2} total={2} />}
      />
    );
  }

  return (
    <RegistrationForm
      anlage="Britz"
      onNext={(data) => {
        setRegistrationData(data);
        setStep("sepa");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}
