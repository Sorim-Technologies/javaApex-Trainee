import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "success" | "warning" | "danger" | "neutral" | "info";
  children: React.ReactNode;
}

export function Badge({ variant = "neutral", children, style, ...props }: BadgeProps) {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case "primary":
        return {
          background: "#2563eb",
          color: "#fff",
        };
      case "success":
        return {
          backgroundColor: "#dcfce7",
          color: "#166534",
          border: "1px solid #bbf7d0",
        };
      case "warning":
        return {
          backgroundColor: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fde68a",
        };
      case "danger":
        return {
          backgroundColor: "#fee2e2",
          color: "#991b1b",
          border: "1px solid #fecaca",
        };
      case "info":
        return {
          backgroundColor: "#ddf4ff",
          color: "#0969da",
          border: "1px solid #bbf3ff",
        };
      case "neutral":
      default:
        return {
          backgroundColor: "#e5e7eb",
          color: "#374151",
          border: "1px solid #d1d5db",
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1.2,
    textTransform: "uppercase",
    ...getVariantStyles(),
    ...style,
  };

  return (
    <span style={baseStyles} {...props}>
      {children}
    </span>
  );
}
export default Badge;
