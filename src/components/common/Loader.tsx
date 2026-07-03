import React from "react";

interface LoaderProps {
  message?: string;
  size?: number;
  containerStyle?: React.CSSProperties;
}

export function Loader({
  message = "Loading...",
  size = 28,
  containerStyle,
}: LoaderProps) {
  const spinnerStyle: React.CSSProperties = {
    width: size,
    height: size,
    border: "3px solid rgba(148, 163, 184, 0.15)",
    borderTop: "3px solid var(--primary)",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 48,
        color: "var(--primary)",
        fontWeight: 500,
        fontSize: 15,
        ...containerStyle,
      }}
    >
      <div style={spinnerStyle} className="spinner-loader" />
      <span>{message}</span>
    </div>
  );
}
export default Loader;
