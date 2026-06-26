import React from "react";

interface WizardStep {
  id: number;
  name: string;
  icon: string;
  description: string;
  summary: string;
}

interface StepIndicatorProps {
  styles: Record<string, React.CSSProperties>;
  steps: WizardStep[];
  step: number;
  currentIndicatorStep: number;
  maxVisitedIndicatorStep: number;
  onStepChange: (step: number) => void;
}

export default function StepIndicator({
  styles,
  steps,
  step,
  currentIndicatorStep,
  maxVisitedIndicatorStep,
  onStepChange,
}: StepIndicatorProps) {
  return (
    <div style={styles.stepIndicator}>
      {steps.map((s, index) => {
        const isCompleted = currentIndicatorStep > s.id;
        const isActive = currentIndicatorStep === s.id;
        const isUnlocked = s.id <= maxVisitedIndicatorStep;

        return (
          <React.Fragment key={s.id}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                opacity: 1,
                cursor: isUnlocked && !isActive ? "pointer" : "default",
                transition: "all 0.3s ease",
              }}
              onClick={() => isUnlocked && !isActive && onStepChange(s.id)}
            >
              <div
                style={{
                  ...styles.stepCircle,
                  backgroundColor: isCompleted ? "#22c55e" : isActive ? "#3b82f6" : "#e5e7eb",
                  color: currentIndicatorStep >= s.id ? "#fff" : "#6b7280",
                  width: 44,
                  height: 44,
                  fontSize: 18,
                  boxShadow: isActive ? "0 0 0 4px rgba(59, 130, 246, 0.2)" : "none",
                }}
              >
                {step > s.id ? "✓" : s.icon}
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    color: isActive ? "#3b82f6" : isCompleted ? "#22c55e" : "#64748b",
                    marginBottom: 2,
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isActive ? "#64748b" : "#94a3b8",
                    maxWidth: 100,
                    lineHeight: 1.3,
                  }}
                >
                  {s.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  backgroundColor: currentIndicatorStep > s.id ? "#22c55e" : "#e5e7eb",
                  marginTop: -50,
                  marginLeft: -10,
                  marginRight: -10,
                  borderRadius: 2,
                  transition: "background-color 0.3s ease",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
