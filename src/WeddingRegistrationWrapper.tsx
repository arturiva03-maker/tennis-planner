import React, { useState } from "react";
import RegistrationForm, { type RegistrationPayload } from "./RegistrationForm";
import SepaForm from "./SepaForm";
import StepHeader from "./components/StepHeader";
import "./App.css";

type WeddingRegistrationWrapperProps = {
  directToProbetraining?: boolean;
};

export default function WeddingRegistrationWrapper(_: WeddingRegistrationWrapperProps) {
  const [step, setStep] = useState<"registration" | "sepa">("registration");
  const [registrationPayload, setRegistrationPayload] = useState<RegistrationPayload | null>(null);

  if (step === "sepa" && registrationPayload) {
    return (
      <SepaForm
        anlage="Wedding"
        initialData={{ name: registrationPayload.name, email: registrationPayload.email }}
        registrationPayload={registrationPayload}
        headerNote={<StepHeader current={2} total={2} />}
      />
    );
  }

  return (
    <RegistrationForm
      anlage="Wedding"
      redirectUrl="/wedding"
      onNext={(data) => {
        setRegistrationPayload(data);
        setStep("sepa");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}
