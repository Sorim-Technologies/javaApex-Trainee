import React from "react";
import { styles } from "../../pages/styles";

interface ValidationMessageProps {
  repoUrl: string;
  isValid: boolean;
  message: string;
}

export function ValidationMessage({
  repoUrl,
  isValid,
  message,
}: ValidationMessageProps) {
  if (!repoUrl) return null;

  if (!isValid) {
    return (
      <div
        style={{
          ...styles.connectValidation,
          color: "#dc2626",
          background: "#fef2f2",
          borderColor: "#fecaca",
        }}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.connectValidation,
        color: "#15803d",
        background: "#f0fdf4",
        borderColor: "#bbf7d0",
      }}
    >
      Valid repository URL
    </div>
  );
}

export default ValidationMessage;
