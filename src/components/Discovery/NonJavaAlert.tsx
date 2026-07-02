import React from "react";
import { MdErrorOutline } from "react-icons/md";
import { styles } from "../../pages/styles";

interface NonJavaAlertProps {
  isJavaProject: boolean | null;
  setStep: (val: number) => void;
  setSelectedRepo: (val: any) => void;
  setRepoAnalysis: (val: any) => void;
  setIsJavaProject: (val: boolean | null) => void;
  setRepoUrl: (val: string) => void;
}

export function NonJavaAlert({
  isJavaProject,
  setStep,
  setSelectedRepo,
  setRepoAnalysis,
  setIsJavaProject,
  setRepoUrl,
}: NonJavaAlertProps) {
  if (isJavaProject !== false) return null;

  return (
    <div
      style={{
        background: "#fef2f2",
        border: "2px solid #ef4444",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
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
        <div style={{ fontSize: 18, fontWeight: 700, color: "#991b1b", marginBottom: 8 }}>
          This is not a Java Project
        </div>
        <div style={{ fontSize: 14, color: "#b91c1c", lineHeight: 1.6 }}>
          The repository you connected does not appear to be a Java project. This tool is designed
          specifically for Java application migration. Please connect a repository that contains Java source
          code, Maven (pom.xml), or Gradle (build.gradle) configuration files.
        </div>
        <button
          style={{
            marginTop: 16,
            backgroundColor: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14,
          }}
          onClick={() => {
            setStep(1);
            setSelectedRepo(null);
            setRepoAnalysis(null);
            setIsJavaProject(null);
            setRepoUrl("");
          }}
        >
          ← Connect Different Repository
        </button>
      </div>
    </div>
  );
}

export default NonJavaAlert;
