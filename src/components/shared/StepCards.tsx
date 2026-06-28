import React from "react";
import "./Shared.css";

const steps = [
  { label: "Select source system", icon: "📁" },
  { label: "Select target system", icon: "☁️" },
  { label: "Finalize", icon: "⚙️" },
];

const StepCards: React.FC<{ current: number }> = ({ current }) => (
  <div className="shared-step-cards">
    {steps.map((step, idx) => (
      <div
        key={step.label}
        className={`shared-step-card${current === idx + 1 ? " shared-step-card--active" : ""}`}
      >
        <span className="shared-step-card__number">{step.icon} Step {idx + 1}</span>
        {step.label}
      </div>
    ))}
  </div>
);

export default StepCards;
