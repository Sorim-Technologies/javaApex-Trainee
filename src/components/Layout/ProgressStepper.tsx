import React from "react";
import { MdCheckCircle, MdLockOutline, MdOutlineLink, MdTravelExplore, MdOutlineAssessment, MdOutlineBuild, MdOutlineAnalytics } from "react-icons/md";
import { MIGRATION_STEPS, getStepFromPath } from "../../utils/constants";
import { getIndicatorStep } from "../../utils/formatters";
import { styles } from "../../pages/styles";

interface ProgressStepperProps {
  step: number;
  setStep: (val: number) => void;
  maxVisitedIndicatorStep: number;
}

const getStepIcon = (id: number) => {
  switch (id) {
    case 1:
      return <MdOutlineLink />;
    case 2:
      return <MdTravelExplore />;
    case 3:
      return <MdOutlineAssessment />;
    case 4:
      return <MdOutlineBuild />;
    case 5:
      return <MdOutlineAnalytics />;
    default:
      return <MdLockOutline />;
  }
};

export function ProgressStepper({
  step,
  setStep,
  maxVisitedIndicatorStep,
}: ProgressStepperProps) {
  const currentIndicatorStep = getIndicatorStep(step);

  return (
    <div style={styles.stepIndicator}>
      {MIGRATION_STEPS.map((s, index) => {
        const isCompleted = currentIndicatorStep > s.id;
        const isActive = currentIndicatorStep === s.id;
        const isUnlocked = s.id === 6 || s.id <= maxVisitedIndicatorStep;
        const statusText = isCompleted ? "Completed" : isActive ? "In progress" : "Next";
        const connectorComplete = currentIndicatorStep > s.id;
        const connectorActive = currentIndicatorStep === s.id;

        return (
          <React.Fragment key={s.id}>
            <div
              style={{
                ...styles.stepFlowItem,
                cursor: isUnlocked && !isActive ? "pointer" : "default",
                opacity: isUnlocked ? 1 : 0.58,
              }}
              onClick={() => isUnlocked && !isActive && setStep(s.id)}
              role="button"
              aria-current={isActive ? "step" : undefined}
              aria-label={`${s.name}: ${statusText}`}
            >
              <div
                style={{
                  ...styles.stepCircle,
                  background: isCompleted
                    ? "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
                    : isActive
                    ? "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)"
                    : "#ffffff",
                  color: isUnlocked ? "#0f172a" : "#64748b",
                  border: isActive
                    ? "1px solid rgba(147, 197, 253, 0.9)"
                    : isCompleted
                    ? "1px solid rgba(74, 222, 128, 0.75)"
                    : "1px solid rgba(148, 163, 184, 0.28)",
                  boxShadow: isActive
                    ? "0 0 0 5px rgba(59, 130, 246, 0.16), 0 12px 28px rgba(37, 99, 235, 0.35)"
                    : isCompleted
                    ? "0 10px 22px rgba(34, 197, 94, 0.22)"
                    : "inset 0 0 0 1px rgba(226, 232, 240, 0.08)",
                }}
              >
                {isCompleted ? (
                  <MdCheckCircle />
                ) : isUnlocked ? (
                  getStepIcon(s.id)
                ) : (
                  <MdLockOutline />
                )}
              </div>
              <div style={styles.stepFlowLabel}>
                <div
                  style={{
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 13,
                    color: isActive ? "#93c5fd" : isCompleted ? "#86efac" : "#94a3b8",
                    marginBottom: 2,
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    ...styles.stepStatusPill,
                    color: isCompleted ? "#86efac" : isActive ? "#bfdbfe" : "#94a3b8",
                    borderColor: isCompleted
                      ? "rgba(134, 239, 172, 0.28)"
                      : isActive
                      ? "rgba(147, 197, 253, 0.3)"
                      : "rgba(148, 163, 184, 0.18)",
                    background: isCompleted
                      ? "rgba(34, 197, 94, 0.1)"
                      : isActive
                      ? "rgba(59, 130, 246, 0.12)"
                      : "rgba(148, 163, 184, 0.06)",
                  }}
                >
                  {statusText}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isActive ? "#cbd5e1" : "#94a3b8",
                    maxWidth: 100,
                    lineHeight: 1.3,
                  }}
                >
                  {s.description}
                </div>
              </div>
            </div>
            {index < MIGRATION_STEPS.length - 1 && (
              <div
                style={{
                  ...styles.stepFlowConnector,
                  background: connectorComplete
                    ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)"
                    : "rgba(71, 85, 105, 0.55)",
                }}
              >
                <span
                  style={{
                    ...styles.stepFlowConnectorFill,
                    height: connectorComplete ? "100%" : connectorActive ? "52%" : "0%",
                    background: connectorComplete
                      ? "linear-gradient(180deg, #86efac 0%, #22c55e 100%)"
                      : "linear-gradient(180deg, #60a5fa 0%, rgba(96, 165, 250, 0.1) 100%)",
                  }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default ProgressStepper;
