import React from "react";
import "./styles/stepIndicator.css";

interface WizardStep {
  id: number;
  name: string;
  icon: string;
  description: string;
  summary: string;
}

interface StepIndicatorProps {
  steps: WizardStep[];
  step: number;
  currentIndicatorStep: number;
  maxVisitedIndicatorStep: number;
  onStepChange: (step: number) => void;
}

export default function StepIndicator({
  steps,
  step,
  currentIndicatorStep,
  maxVisitedIndicatorStep,
  onStepChange,
}: StepIndicatorProps) {
  return (
    <div className="wizard-step-indicator">
      {steps.map((s, index) => {
        const isCompleted = currentIndicatorStep > s.id;
        const isActive = currentIndicatorStep === s.id;
        const isUnlocked = s.id <= maxVisitedIndicatorStep;
        const itemClassName = [
          "wizard-step-indicator__item",
          isUnlocked && !isActive ? "wizard-step-indicator__item--clickable" : "",
        ].filter(Boolean).join(" ");
        const circleClassName = [
          "wizard-step-indicator__circle",
          isCompleted ? "wizard-step-indicator__circle--completed" : "",
          isActive ? "wizard-step-indicator__circle--active" : "",
          !isCompleted && !isActive ? "wizard-step-indicator__circle--locked" : "",
        ].filter(Boolean).join(" ");
        const nameClassName = [
          "wizard-step-indicator__name",
          isCompleted ? "wizard-step-indicator__name--completed" : "",
          isActive ? "wizard-step-indicator__name--active" : "",
        ].filter(Boolean).join(" ");
        const descriptionClassName = [
          "wizard-step-indicator__description",
          isActive ? "wizard-step-indicator__description--active" : "",
        ].filter(Boolean).join(" ");

        return (
          <React.Fragment key={s.id}>
            <div
              className={itemClassName}
              onClick={() => isUnlocked && !isActive && onStepChange(s.id)}
            >
              <div className={circleClassName}>
                {step > s.id ? "✓" : s.icon}
              </div>
              <div className="wizard-step-indicator__copy">
                <div className={nameClassName}>
                  {s.name}
                </div>
                <div className={descriptionClassName}>
                  {s.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`wizard-step-indicator__connector${currentIndicatorStep > s.id ? " wizard-step-indicator__connector--completed" : ""}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
