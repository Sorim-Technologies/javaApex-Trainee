import React from "react";

const levels = [
  {
    label: "Low",
    range: "1 - 5",
    color: "#22c55e",
    description: "Easy to understand and maintain",
  },
  {
    label: "Medium",
    range: "6 - 10",
    color: "#eab308",
    description: "Moderate complexity",
  },
  {
    label: "High",
    range: "11 - 20",
    color: "#f97316",
    description: "Needs careful review",
  },
  {
    label: "Critical",
    range: "> 20",
    color: "#ef4444",
    description: "High migration risk",
  },
];

export default function ComplexityLegend() {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #9e9ea0",
        borderRadius: 12,
        padding: 20,
        marginTop: 24,
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 18,
          color: "#111112",
        }}
      >
        Complexity Legend
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
          gap: 16,
        }}
      >
        {levels.map((level) => (
          <div
            key={level.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: 14,
              background: "#f2f3f5",
              borderRadius: 10,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                background: level.color,
                boxShadow: `0 0 10px ${level.color}`,
                flexShrink: 0,
              }}
            />

            <div>
              <div
                style={{
                  color: "#09090a",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {level.label}
              </div>

              <div
                style={{
                  color: "#38393b",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Score: {level.range}
              </div>

              <div
                style={{
                  color: "#24272b",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {level.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}