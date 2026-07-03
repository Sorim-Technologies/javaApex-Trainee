import React from "react";
import { FiInfo } from "react-icons/fi";

interface NoFrameworkAlertProps {
  isJavaProject: boolean | null;
  detectedFrameworks: any[];
}

export function NoFrameworkAlert({
  isJavaProject,
  detectedFrameworks,
}: NoFrameworkAlertProps) {
  if (!isJavaProject || detectedFrameworks.length > 0) return null;

  return (
    <div
      style={{
        background: "#fef9c3",
        border: "2px solid #facc15",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: "#dbeafe",
          color: "#2563eb",
        }}
      >
        <FiInfo size={22} />
      </span>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
          Java Project Detected (No Framework)
        </div>
        <div style={{ fontSize: 14, color: "#a16207", lineHeight: 1.6 }}>
          This repository contains Java source files but no recognized framework (e.g., Spring, Spring
          Boot, Jakarta EE) was detected. You can still proceed with migration, but some automation
          features may be limited.
        </div>
      </div>
    </div>
  );
}

export default NoFrameworkAlert;
