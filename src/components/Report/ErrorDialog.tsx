import React from "react";
import { styles } from "../../pages/styles";

interface ErrorDialogProps {
  error: string;
  onClear: () => void;
}

export function ErrorDialog({ error, onClear }: ErrorDialogProps) {
  if (!error) return null;

  return (
    <div style={styles.errorBanner}>
      <span>{error}</span>
      <button style={styles.errorClose} onClick={onClear}>
        ×
      </button>
    </div>
  );
}

export default ErrorDialog;
