import React from "react";
import Loader from "../common/Loader";

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingOverlay({ isLoading, message = "Processing..." }: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          padding: "16px 32px",
          borderRadius: 16,
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <Loader message={message} />
      </div>
    </div>
  );
}

export default LoadingOverlay;
