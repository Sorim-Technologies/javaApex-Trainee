import React from "react";
import { styles } from "../../pages/styles";

interface SuccessDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  confirmText?: string;
}

export function SuccessDialog({
  isOpen,
  title = "Success!",
  message = "Operation completed successfully.",
  onClose,
  confirmText = "OK",
}: SuccessDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 450,
          padding: 32,
          textAlign: "center",
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h3 style={{ ...styles.title, fontSize: 20, marginBottom: 12 }}>{title}</h3>
        <p style={{ ...styles.subtitle, marginBottom: 24 }}>{message}</p>
        <button style={styles.primaryBtn} onClick={onClose}>
          {confirmText}
        </button>
      </div>
    </div>
  );
}

export default SuccessDialog;
