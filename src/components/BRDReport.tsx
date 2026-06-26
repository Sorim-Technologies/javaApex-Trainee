import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { RepoInfo, RepoAnalysis } from "../services/api";

const WIZARD_SELECTED_REPO_KEY = "migration_wizard_selected_repo";
const WIZARD_REPO_ANALYSIS_KEY = "migration_wizard_repo_analysis";

const readPersistedJson = <T,>(key: string): T | null => {
  if (globalThis.window === undefined) return null;
  try {
    const raw = globalThis.window.localStorage.getItem(key) || globalThis.window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const safeText = (text?: string | null) => (text || "").trim();

const inferProjectDescription = (repoInfo: RepoInfo | null, repoAnalysis: RepoAnalysis | null): string => {
  const description = safeText(repoInfo?.description);
  if (description) return description;

  if (repoAnalysis) {
    const buildTool = repoAnalysis.build_tool ? `${repoAnalysis.build_tool} build` : "Java";
    const apiEndpoints = (repoAnalysis.api_endpoints?.length ?? 0) > 0 ? "It exposes API endpoints" : "It appears to be a standalone application";
    const testCoverage = repoAnalysis.has_tests ? "It includes automated tests" : "It does not include an identifiable automated test suite";
    return `This repository appears to be a ${buildTool} application. ${apiEndpoints} and ${testCoverage}.`;
  }

  return "This document summarizes the application based on the available repository metadata and code structure.";
};

const inferTargetUsers = (repoAnalysis: RepoAnalysis | null): string[] => {
  if (!repoAnalysis) return ["Business stakeholders", "Product managers", "IT support teams"];
  const users = new Set<string>(["Business stakeholders", "Product managers"]);
  if (repoAnalysis.api_endpoints?.length) {
    users.add("Technical integration teams");
    users.add("Internal operations users");
  }
  if (repoAnalysis.has_tests) {
    users.add("Development teams");
  }
  return Array.from(users);
};

const inferBusinessGoals = (repoAnalysis: RepoAnalysis | null): string[] => {
  const goals = [
    "Provide a clear, reliable view of the application and its purpose.",
    "Support future modernization and maintenance planning.",
    "Describe the key business outcomes the application supports.",
  ];

  if (repoAnalysis) {
    if (repoAnalysis.build_tool) {
      goals.push(`Use the detected ${repoAnalysis.build_tool} project structure to simplify engineering reviews.`);
    }
    if (repoAnalysis.api_endpoints?.length) {
      goals.push("Highlight the application’s API capabilities and integration points.");
    }
    if (repoAnalysis.dependencies?.length) {
      goals.push("Identify dependency complexity and opportunities for upgrade planning.");
    }
  }

  return goals;
};

const inferPrimaryObjective = (repoInfo: RepoInfo | null, repoAnalysis: RepoAnalysis | null): string => {
  if (repoInfo?.name) {
    return `Provide a business-level overview of the ${repoInfo.name} application and explain how it supports users and stakeholders.`;
  }
  return "Provide a clear summary of the application so business leaders can understand the purpose and scope of the project.";
};

const inferBusinessProblem = (repoAnalysis: RepoAnalysis | null): string => {
  if (!repoAnalysis) {
    return "The key business need is to understand the purpose of the application and how it should be maintained or modernized.";
  }

  if (repoAnalysis.api_endpoints?.length) {
    return "The application solves the need for a structured service interface that supports internal or external users through API endpoints.";
  }

  if (repoAnalysis.build_tool) {
    return "The application helps the business by providing a stable Java-based solution that can be managed, upgraded, and supported over time.";
  }

  return "The application streamlines an existing business workflow by providing a software solution instead of manual work.";
};

const generateExecutiveSummary = (repoInfo: RepoInfo | null, repoAnalysis: RepoAnalysis | null) => {
  const appName = repoInfo?.name || repoAnalysis?.name || "Unnamed Application";
  const purpose = `The purpose of ${appName} is to deliver a business application based on the repository’s Java code and project structure.`;
  const problem = inferBusinessProblem(repoAnalysis);
  const reason = `This application was built to give the business a consistent and manageable software foundation. It appears designed to support ongoing operations, improve developer productivity, and enable future modernization work.`;

  return {
    purpose,
    problem,
    reason,
  };
};

const BRDReport: React.FC = () => {
  const navigate = useNavigate();
  const selectedRepo = useMemo(() => readPersistedJson<RepoInfo>(WIZARD_SELECTED_REPO_KEY), []);
  const repoAnalysis = useMemo(() => readPersistedJson<RepoAnalysis>(WIZARD_REPO_ANALYSIS_KEY), []);

  const appName = selectedRepo?.name || repoAnalysis?.name || "Application";
  const projectDescription = inferProjectDescription(selectedRepo, repoAnalysis);
  const primaryObjective = inferPrimaryObjective(selectedRepo, repoAnalysis);
  const targetUsers = inferTargetUsers(repoAnalysis);
  const businessGoals = inferBusinessGoals(repoAnalysis);
  const executiveSummary = generateExecutiveSummary(selectedRepo, repoAnalysis);

  const hasRepository = Boolean(selectedRepo || repoAnalysis);

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1180, margin: "0 auto" }}>
      <button
        onClick={() => navigate(-1)}
        style={{ marginBottom: 24, padding: "10px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer" }}
      >
        ← Back to Migration
      </button>

      <div style={{ marginBottom: 32 }}>
        <div style={{ color: "var(--muted)", fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>
          Business Requirements Document
        </div>
        <h1 style={{ fontSize: "clamp(32px, 4vw, 44px)", margin: 0, color: "var(--text)" }}>Repository Analysis Report</h1>
        <p style={{ marginTop: 14, maxWidth: 760, lineHeight: 1.8, color: "var(--muted)" }}>
          This report summarizes the application using available repository metadata and code analysis. It is written in business-friendly language for stakeholders, managers, and non-technical reviewers.
        </p>
      </div>

      {hasRepository ? (
        <>
          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, marginBottom: 14 }}>Executive Summary</h2>
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>What is the purpose of this application?</h3>
                <p style={{ margin: 0, lineHeight: 1.75 }}>{executiveSummary.purpose}</p>
              </div>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>What business problem does it solve?</h3>
                <p style={{ margin: 0, lineHeight: 1.75 }}>{executiveSummary.problem}</p>
              </div>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 8 }}>Why was this application built?</h3>
                <p style={{ margin: 0, lineHeight: 1.75 }}>{executiveSummary.reason}</p>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, marginBottom: 14 }}>Project Overview</h2>
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ padding: 20, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <strong>Application Name</strong>
                <p style={{ margin: "8px 0 0 0", lineHeight: 1.7 }}>{appName}</p>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <strong>Project Description</strong>
                <p style={{ margin: "8px 0 0 0", lineHeight: 1.7 }}>{projectDescription}</p>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <strong>Primary Objective</strong>
                <p style={{ margin: "8px 0 0 0", lineHeight: 1.7 }}>{primaryObjective}</p>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <strong>Target Users</strong>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, lineHeight: 1.7 }}>
                  {targetUsers.map((user) => (
                    <li key={user}>{user}</li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: 20, borderRadius: 12, background: "var(--surface)", border: "1px solid var(--border)" }}>
                <strong>Business Goals</strong>
                <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, lineHeight: 1.7 }}>
                  {businessGoals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 24, marginBottom: 14 }}>Data Summary</h2>
            <div style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>Repository:</strong> {selectedRepo?.full_name || repoAnalysis?.full_name || "Unknown repository"}</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>Primary language:</strong> {selectedRepo?.language || repoAnalysis?.language || "Java"}</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>Detected build tool:</strong> {repoAnalysis?.build_tool || "Not identified"}</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>Detected Java version:</strong> {repoAnalysis?.java_version || repoAnalysis?.java_version_from_build || "Not specified"}</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>API endpoints found:</strong> {repoAnalysis?.api_endpoints?.length ?? 0}</p>
              <p style={{ margin: 0, lineHeight: 1.7 }}><strong>Tests detected:</strong> {repoAnalysis?.has_tests ? "Yes" : "No"}</p>
            </div>
          </section>
        </>
      ) : (
        <div style={{ padding: 24, background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: 12 }}>
          <h2 style={{ marginTop: 0 }}>No repository analysis available yet</h2>
          <p style={{ margin: 0 }}>Please connect and analyze a repository first, then return to view a generated Business Requirements Document based on the uploaded application.</p>
        </div>
      )}
    </div>
  );
};

export default BRDReport;
