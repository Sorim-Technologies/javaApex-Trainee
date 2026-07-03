import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const baseStyles: React.CSSProperties = {
    width: "100%",
    padding: "13px 16px",
    fontSize: 14,
    borderRadius: 10,
    border: error ? "1px solid #ef4444" : "1px solid var(--border)",
    boxSizing: "border-box",
    transition: "all 0.3s ease",
    backgroundColor: "var(--card)",
    color: "var(--foreground)",
    boxShadow: "var(--shadow-sm)",
    outline: "none",
    ...style,
  };

  return (
    <div style={{ marginBottom: 16, width: "100%" }}>
      {label && (
        <label
          style={{
            fontWeight: 600,
            fontSize: 14,
            marginBottom: 8,
            display: "block",
            color: "var(--foreground)",
          }}
        >
          {label}
        </label>
      )}
      <input style={baseStyles} {...props} />
      {error && (
        <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
export default Input;
