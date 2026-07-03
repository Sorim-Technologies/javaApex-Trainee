import React from "react";
import { MdErrorOutline } from "react-icons/md";
import { FiAlertCircle, FiInfo } from "react-icons/fi";
import { HiOutlineExclamationTriangle, HiOutlineXCircle } from "react-icons/hi2";
import { styles } from "../../pages/styles";
import type { RepoAnalysis } from "../../types/migration";

interface RiskAnalysisCardProps {
  isHighRiskProject: boolean;
  highRiskConfirmed: boolean;
  setHighRiskConfirmed: (val: boolean) => void;
  repoAnalysis: RepoAnalysis | null;
  detectedJavaVersion: string | null;
  suggestedJavaVersion: string;
  setSuggestedJavaVersion: (val: string) => void;
  setSelectedSourceVersion: (val: string) => void;
  setUserSelectedVersion: (val: string | null) => void;
  setSourceVersionStatus: (val: "detected" | "not_selected" | "unknown") => void;
  sourceVersionStatus: "detected" | "not_selected" | "unknown";
  buildConversionLabel: string;
  buildConversionNote: string;
  setStep: (val: number) => void;
  setSelectedRepo: (val: any) => void;
  setRepoAnalysis: (val: any) => void;
  setIsJavaProject: (val: boolean | null) => void;
  setIsHighRiskProject: (val: boolean) => void;
  setRepoUrl: (val: string) => void;
}

export function RiskAnalysisCard({
  isHighRiskProject,
  highRiskConfirmed,
  setHighRiskConfirmed,
  repoAnalysis,
  detectedJavaVersion,
  suggestedJavaVersion,
  setSuggestedJavaVersion,
  setSelectedSourceVersion,
  setUserSelectedVersion,
  setSourceVersionStatus,
  sourceVersionStatus,
  buildConversionLabel,
  buildConversionNote,
  setStep,
  setSelectedRepo,
  setRepoAnalysis,
  setIsJavaProject,
  setIsHighRiskProject,
  setRepoUrl,
}: RiskAnalysisCardProps) {
  if (!isHighRiskProject || highRiskConfirmed) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        border: "2px solid #f59e0b",
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        boxShadow: "0 4px 12px rgba(245, 158, 11, 0.15)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fee2e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#dc2626",
            flexShrink: 0,
          }}
        >
          <MdErrorOutline size={32} />
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
            High Risk Migration Detected
          </div>
          <div style={{ fontSize: 14, color: "#a16207", lineHeight: 1.7 }}>
            This project may be missing Java version configuration and may require additional setup:
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.7)",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 12 }}>
          🔍 Missing Components:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {!repoAnalysis?.structure?.has_pom_xml && !repoAnalysis?.structure?.has_build_gradle && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                color: "#991b1b",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <HiOutlineXCircle size={16} style={{ color: "#dc2626", flexShrink: 0 }} />
              <span>No pom.xml or build.gradle</span>
            </div>
          )}
          {(!detectedJavaVersion || detectedJavaVersion === "unknown") && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                color: "#991b1b",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FiAlertCircle size={16} style={{ color: "#dc2626", flexShrink: 0 }} />
              <span>Java version not detected</span>
            </div>
          )}
          {!repoAnalysis?.structure?.has_src_main && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 13,
                color: "#991b1b",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <HiOutlineExclamationTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <span>Non-standard project structure</span>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.7)",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 12 }}>
          💡 Suggested Configuration:
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "#78350f",
              marginBottom: 6,
            }}
          >
            {sourceVersionStatus === "detected"
              ? "Java version automatically detected"
              : "Select Source Java Version:"}
          </label>
          {sourceVersionStatus === "detected" && suggestedJavaVersion !== "auto" ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                border: "1px solid rgba(226, 232, 240, 0.2)",
                backgroundColor: "#ffffff",
                minWidth: 200,
                color: "#334155",
              }}
            >
              Java {suggestedJavaVersion} detected from source code
            </div>
          ) : (
            <>
              <select
                value={suggestedJavaVersion}
                onChange={(e) => {
                  setSuggestedJavaVersion(e.target.value);
                  setSelectedSourceVersion(e.target.value === "auto" ? "8" : e.target.value);
                  setUserSelectedVersion(e.target.value);
                  setSourceVersionStatus("detected");
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: "1px solid #d97706",
                  fontSize: 14,
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  minWidth: 200,
                }}
              >
                <option value="auto"> Auto-detect from code (Recommended)</option>
                <option value="7">Java 7 (Legacy)</option>
                <option value="8">Java 8 (LTS)</option>
                <option value="11">Java 11 (LTS)</option>
                <option value="17">Java 17 (LTS)</option>
                <option value="21">Java 21 (LTS)</option>
              </select>
              <div style={{ fontSize: 11, color: "#a16207", marginTop: 6 }}>
                Auto-detect analyzes your code to determine the correct Java version
              </div>
            </>
          )}
        </div>

        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 8,
            backgroundColor: "#eef2ff",
            border: "1px solid #c7d2fe",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e3a8a" }}>
            {buildConversionLabel}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 8 }}>
            {buildConversionNote}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={() => {
            setHighRiskConfirmed(true);
            setSelectedSourceVersion(suggestedJavaVersion);
          }}
          style={{
            backgroundColor: "#f59e0b",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "12px 24px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {buildConversionLabel}
        </button>
        <button
          onClick={() => {
            setStep(1);
            setSelectedRepo(null);
            setRepoAnalysis(null);
            setIsJavaProject(null);
            setIsHighRiskProject(false);
            setRepoUrl("");
          }}
          style={{
            backgroundColor: "#fff",
            color: "#92400e",
            border: "2px solid #f59e0b",
            borderRadius: 8,
            padding: "12px 24px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ← Choose Different Repository
        </button>
      </div>
    </div>
  );
}

export default RiskAnalysisCard;
