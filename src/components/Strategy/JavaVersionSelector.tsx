import React from "react";
import { styles } from "../../pages/styles";
import type {
  JavaVersionOption,
  JavaVersionRecommendationResponse,
  RepoAnalysis,
} from "../../types/migration";

interface JavaVersionSelectorProps {
  repoAnalysis: RepoAnalysis | null;
  selectedSourceVersion: string;
  setSelectedSourceVersion: (val: string) => void;
  selectedTargetVersion: string;
  setSelectedTargetVersion: (val: string) => void;
  userSelectedVersion: string | null;
  setUserSelectedVersion: (val: string | null) => void;
  availableTargetVersions: JavaVersionOption[];
  versionRecommendation: JavaVersionRecommendationResponse | null;
  versionRecommendationLoading: boolean;
  versionRecommendationError: string;
}

export function JavaVersionSelector({
  repoAnalysis,
  selectedSourceVersion,
  setSelectedSourceVersion,
  selectedTargetVersion,
  setSelectedTargetVersion,
  userSelectedVersion,
  setUserSelectedVersion,
  availableTargetVersions,
  versionRecommendation,
  versionRecommendationLoading,
  versionRecommendationError,
}: JavaVersionSelectorProps) {
  return (
    <div style={styles.row}>
      <div style={styles.field}>
        <label style={styles.label}>Source Java Version</label>
        <div
          style={{
            padding: "12px 14px",
            fontSize: 14,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            backgroundColor: "#f9fafb",
            color: userSelectedVersion ? "#1e293b" : "#6b7280",
            fontWeight: userSelectedVersion ? 600 : 500,
          }}
        >
          {userSelectedVersion
            ? `Java ${selectedSourceVersion} (manually selected)`
            : repoAnalysis?.java_version && repoAnalysis?.java_version !== "unknown"
            ? `Java ${repoAnalysis.java_version} (detected)`
            : "Source project doesn't specify a java version"}
        </div>
        <p style={styles.helpText}>
          {userSelectedVersion
            ? "Source version manually selected in discovery step"
            : repoAnalysis?.java_version && repoAnalysis?.java_version !== "unknown"
            ? "Java version detected from build configuration"
            : "No Java version found - please select a source version below"}
        </p>

        {/* Show selector when no version is detected and not manually selected yet */}
        {!userSelectedVersion &&
          (!repoAnalysis?.java_version || repoAnalysis.java_version === "unknown") && (
            <div style={{ marginTop: 12 }}>
              <select
                value={selectedSourceVersion}
                onChange={(e) => {
                  setSelectedSourceVersion(e.target.value);
                  setUserSelectedVersion(e.target.value);
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "1px solid #d97706",
                  fontSize: 14,
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                <option value="7">Java 7 (Legacy)</option>
                <option value="8">Java 8 (LTS)</option>
                <option value="11">Java 11 (LTS)</option>
                <option value="17">Java 17 (LTS)</option>
                <option value="21">Java 21 (LTS)</option>
              </select>
              <div style={{ fontSize: 11, color: "#a16207", marginTop: 6 }}>
                Select the correct Java version for your project. This will be used as the source version for
                migration.
              </div>
            </div>
          )}
      </div>

      <div style={styles.field}>
        <label style={styles.label}>Target Java Version</label>
        {versionRecommendationLoading && (
          <div style={{ ...styles.infoBox, marginBottom: 12 }}>
            Fetching recommended target Java version from Hugging Face...
          </div>
        )}
        {!versionRecommendationLoading && versionRecommendationError && (
          <div style={{ ...styles.errorBox, marginBottom: 12 }}>{versionRecommendationError}</div>
        )}
        {!versionRecommendationLoading && !versionRecommendationError && versionRecommendation && (
          <div
            style={{
              marginBottom: 12,
              padding: 16,
              borderRadius: 10,
              border: "1px solid #bfdbfe",
              background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#1d4ed8",
                    textTransform: "uppercase",
                    letterSpacing: "0.4px",
                  }}
                >
                  Hugging Face Recommendation
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", marginTop: 4 }}>
                  Target Java {versionRecommendation.recommended_target_version}
                </div>
              </div>
              <button
                type="button"
                style={{ ...styles.secondaryBtn, padding: "8px 14px" }}
                onClick={() => setSelectedTargetVersion(versionRecommendation.recommended_target_version)}
              >
                Use recommendation
              </button>
            </div>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>
              Confidence:{" "}
              <span style={{ fontWeight: 700, color: "#334155" }}>{versionRecommendation.confidence}</span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 13,
                color: "#334155",
                lineHeight: 1.45,
              }}
            >
              {versionRecommendation.rationale.map((reason, index) => (
                <div key={index}>
                  {index + 1}. {reason}
                </div>
              ))}
            </div>
            {versionRecommendation.alternatives.length > 0 && (
              <div style={{ fontSize: 12, color: "#475569", marginTop: 10 }}>
                Alternatives:{" "}
                {versionRecommendation.alternatives.map((value) => `Java ${value}`).join(", ")}
              </div>
            )}
          </div>
        )}
        <select
          style={styles.select}
          value={selectedTargetVersion}
          onChange={(e) => setSelectedTargetVersion(e.target.value)}
        >
          <option value="" disabled>
            Select Java Version
          </option>
          {availableTargetVersions.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
        <p style={styles.helpText}>Only versions newer than the source Java version are available</p>
      </div>
    </div>
  );
}

export default JavaVersionSelector;
