import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, style, ...props }: CardProps) {
  const baseStyles: React.CSSProperties = {
    background: "var(--card)",
    borderRadius: 16,
    padding: "32px 36px",
    boxShadow: "var(--shadow-lg)",
    marginBottom: 24,
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--border)",
    backdropFilter: "var(--glass-blur)",
    transition: "all 0.3s ease",
    ...style,
  };

  return (
    <div style={baseStyles} {...props}>
      {children}
    </div>
  );
}
export default Card;
