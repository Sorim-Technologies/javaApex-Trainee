import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  children,
  style,
  ...props
}: ButtonProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case "primary":
        return {
          background: "var(--primary-gradient)",
          color: "white",
          border: "none",
          boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
        };
      case "secondary":
        return {
          background: "var(--card)",
          color: "var(--foreground)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        };
      case "danger":
        return {
          backgroundColor: "#ef4444",
          color: "#fff",
          border: "none",
        };
      case "ghost":
        return {
          background: "none",
          border: "none",
          color: "var(--primary)",
        };
      default:
        return {};
    }
  };

  const baseStyles: React.CSSProperties = {
    borderRadius: 10,
    padding: "13px 24px",
    fontWeight: 600,
    cursor: props.disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    transition: "all 0.2s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    opacity: props.disabled ? 0.5 : 1,
    ...getVariantStyles(),
    ...style,
  };

  return (
    <button style={baseStyles} {...props}>
      {children}
    </button>
  );
}
export default Button;
