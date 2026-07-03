import React from "react";
import { styles } from "../../pages/styles";

interface StageIndicatorProps {
  progress: number;
}

export function StageIndicator({ progress }: StageIndicatorProps) {
  const steps = [
    { threshold: 10, icon: "📂", text: "Analyzing Source Code" },
    { threshold: 30, icon: "⚙️", text: "Updating Dependencies" },
    { threshold: 50, icon: "🔧", text: "Applying Code Transformations" },
    { threshold: 70, icon: "🧪", text: "Running Tests & Quality Checks" },
    { threshold: 90, icon: "📊", text: "Generating Migration Report" },
  ];

  return (
    <div style={styles.animationSteps}>
      {steps.map((s, idx) => {
        const isPassed = progress >= s.threshold;
        return (
          <div
            key={idx}
            style={{
              ...styles.animationStep,
              opacity: isPassed ? 1 : 0.3,
              transition: "opacity 0.3s ease",
            }}
          >
            <div style={styles.stepIconAnimated}>{s.icon}</div>
            <div style={styles.stepText}>{s.text}</div>
            {isPassed && <div style={styles.checkMarkAnimated}>✓</div>}
          </div>
        );
      })}
    </div>
  );
}

export default StageIndicator;
