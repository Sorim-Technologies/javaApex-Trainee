interface JavaVersionDetectedCardProps {
  detectedJavaVersion: string | null;
  detectedBuildType: string | null;
  primaryDetectedFramework: string | null;
  hasRecommendedBuildConversion: boolean;
  recommendedBuildConversionId: string | null;
  selectedConversions: string[];
  buildConversionLabel: string;
  buildConversionNote: string;
  onApplyRecommendedBuildConversion: () => void;
}

export default function JavaVersionDetectedCard({
  detectedJavaVersion,
  detectedBuildType,
  primaryDetectedFramework,
  hasRecommendedBuildConversion,
  recommendedBuildConversionId,
  selectedConversions,
  buildConversionLabel,
  buildConversionNote,
  onApplyRecommendedBuildConversion,
}: JavaVersionDetectedCardProps) {
  if (!detectedJavaVersion && !detectedBuildType) return null;

  const buildLabel = detectedBuildType
    ? detectedBuildType.charAt(0).toUpperCase() + detectedBuildType.slice(1)
    : "Unknown";
  const recommendedSelected = Boolean(
    recommendedBuildConversionId && selectedConversions.includes(recommendedBuildConversionId)
  );

  return (
    <div className="inner-card-hover discovery-inner-card discovery-config-card">
      <div className="discovery-config-header">
        <div>
          <div className="discovery-config-title">Detected Configuration</div>
          <div className="discovery-config-subtitle">
            Restored discovery summary for the detected Java and build setup.
          </div>
        </div>
      </div>

      <div className="discovery-config-actions">
        <button type="button" className="discovery-config-chip">
          Java Version Detected: {detectedJavaVersion ? `Java ${detectedJavaVersion}` : "Unknown"}
        </button>
        <button type="button" className="discovery-config-chip">
          Build Detected: {buildLabel}
        </button>
        <button type="button" className="discovery-config-chip">
          Framework Detected: {primaryDetectedFramework || "None detected"}
        </button>
        {hasRecommendedBuildConversion && recommendedBuildConversionId && (
          <button
            type="button"
            className={`discovery-config-action ${recommendedSelected ? "discovery-config-action--active" : ""}`}
            onClick={onApplyRecommendedBuildConversion}
          >
            {recommendedSelected ? `${buildConversionLabel} Selected` : buildConversionLabel}
          </button>
        )}
      </div>

      <div className="discovery-config-note">{buildConversionNote}</div>
    </div>
  );
}
