import React, { useState } from "react";

interface TooltipProps {
  title: string;
  content: React.ReactNode;
  width?: number;
}

export function Tooltip({ title, content, width = 300 }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          color: "#64748b",
          cursor: "help",
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        i
      </div>

      <div
        style={{
          display: visible ? "block" : "none",
          position: "absolute",
          top: 28,
          right: 0,
          width: width,
          backgroundColor: "#ffffff",
          color: "#334155",
          padding: "14px 18px",
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.5,
          zIndex: 1000,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          whiteSpace: "normal",
          border: "1px solid #e2e8f0",
        }}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        <div style={{ fontWeight: 600, marginBottom: 10, color: "#64748b", fontSize: 13 }}>
          {title} Details
        </div>
        <div style={{ color: "#334155" }}>{content}</div>
        <div
          style={{
            position: "absolute",
            top: -6,
            right: 20,
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderBottom: "6px solid #ffffff",
          }}
        />
      </div>
    </div>
  );
}
export default Tooltip;
