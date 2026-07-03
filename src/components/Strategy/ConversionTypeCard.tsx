import React from "react";
import type { ConversionType as ConversionTypeInfo } from "../../types/migration";
import { styles } from "../../pages/styles";

interface ConversionTypeCardProps {
  conversionTypes: ConversionTypeInfo[];
  selectedConversions: string[];
  setSelectedConversions: (val: string[]) => void;
}

export function ConversionTypeCard({
  conversionTypes,
  selectedConversions,
  setSelectedConversions,
}: ConversionTypeCardProps) {
  return (
    <div style={styles.section}>
      <h2 style={styles.heading}>Setup Conversion Type</h2>

      <div style={styles.divider}></div>

      <p style={styles.subtitle}>Available modernization pathways for your project:</p>

      <div style={styles.grid}>
        {conversionTypes.map((ct, index) => {
          const isActive = index === 0; // Java Version Upgrade

          return (
            <div
              key={ct.id}
              onClick={() => {
                if (isActive) {
                  setSelectedConversions([ct.id]);
                }
              }}
              style={{
                ...styles.conversionCard,
                ...(isActive ? styles.selectedConversionCard : {}),
                opacity: isActive ? 1 : 0.7,
                cursor: isActive ? "pointer" : "not-allowed",
              }}
            >
              <div style={styles.iconBox}>{ct.icon}</div>

              <div style={styles.content}>
                <h3 style={styles.cardTitle}>{ct.name}</h3>
                <p style={styles.cardDesc}>{ct.description}</p>
              </div>

              <span
                style={{
                  ...styles.badge,
                  background: isActive ? "#2563eb" : "#e2e8f0",
                  color: isActive ? "#fff" : "#475569",
                }}
              >
                {isActive ? "Active" : "Coming Soon"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConversionTypeCard;
