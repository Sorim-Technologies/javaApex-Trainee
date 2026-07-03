import React from "react";
import { styles } from "../../pages/styles";

interface BuildToolCardProps {
  detectedJavaVersion: string | null;
  detectedBuildType: string | null;
  primaryDetectedFramework: string | null;
  hasRecommendedBuildConversion: boolean;
  recommendedBuildConversionId: string | null;
  buildConversionLabel: string;
  buildConversionNote: string;
  selectedConversions: string[];
  applyRecommendedBuildConversion: () => void;
}

export function BuildToolCard({
  detectedJavaVersion,
  detectedBuildType,
  primaryDetectedFramework,
  hasRecommendedBuildConversion,
  recommendedBuildConversionId,
  buildConversionLabel,
  buildConversionNote,
  selectedConversions,
  applyRecommendedBuildConversion,
}: BuildToolCardProps) {
  if (!detectedJavaVersion && !detectedBuildType) return null;

  return (
    <div style={styles.detectedConfigCard}>
      <div style={styles.detectedConfigHeader}>
        <div>
          <div style={styles.detectedConfigTitle}>Detected Configuration</div>
          <div style={styles.detectedConfigSubtitle}>
            Restored discovery summary for the detected Java and build setup.
          </div>
        </div>
      </div>

      <div style={styles.detectedConfigActions}>
        <button type="button" style={styles.detectedConfigChip}>
          Java Version Detected: {detectedJavaVersion ? `Java ${detectedJavaVersion}` : "Unknown"}
        </button>
        <button type="button" style={styles.detectedConfigChip}>
          Build Detected:{" "}
          {detectedBuildType
            ? detectedBuildType.charAt(0).toUpperCase() + detectedBuildType.slice(1)
            : "Unknown"}
        </button>
        <button type="button" style={styles.detectedConfigChip}>
          Framework Detected: {primaryDetectedFramework || "None detected"}
        </button>
        {hasRecommendedBuildConversion && recommendedBuildConversionId && (
          <button
            type="button"
            style={{
              ...styles.detectedConfigActionBtn,
              ...(selectedConversions.includes(recommendedBuildConversionId)
                ? styles.detectedConfigActionBtnActive
                : {}),
            }}
            onClick={applyRecommendedBuildConversion}
          >
            {selectedConversions.includes(recommendedBuildConversionId)
              ? `${buildConversionLabel} Selected`
              : buildConversionLabel}
          </button>
        )}
      </div>

      <div style={styles.detectedConfigNote}>{buildConversionNote}</div>
    </div>
  );
}

export default BuildToolCard;
