export interface JavaVersionOption {
  value: string;
  label: string;
}

export type RecommendationLevel = "Highly Recommended" | "Recommended" | "Alternative";
export type ConfidenceLevel = "High" | "Medium" | "Low";
export type MigrationEffort = "Low" | "Medium" | "High";
export type SourceInputType = "github" | "zip";

export interface RankedJavaVersionRecommendation {
  javaVersion: string;
  recommendationLevel: RecommendationLevel;
  confidenceScore: ConfidenceLevel;
  description: string;
  keyBenefits: string[];
  potentialRisks: string[];
  migrationEffort: MigrationEffort;
  isLts: boolean;
  score: number;
}

export interface PersistedWizardFormState {
  maxVisitedIndicatorStep: number;
  sourceInputType: SourceInputType;
  isPrivateRepo: boolean;
  patToken: string;
  currentPath: string;
  targetRepoName: string;
  targetRepoTimestamp: string;
  selectedSourceVersion: string;
  selectedTargetVersion: string;
  selectedConversions: string[];
  runTests: boolean;
  runSonar: boolean;
  runFossa: boolean;
  fixBusinessLogic: boolean;
  migrationApproach: string;
  riskLevel: string;
  selectedFrameworks: string[];
  isJavaProject: boolean | null;
  pathHistory: string[];
  isHighRiskProject: boolean;
  highRiskConfirmed: boolean;
  suggestedJavaVersion: string;
  detectedFrameworks: { name: string; path: string; type: string }[];
  userSelectedVersion: string | null;
  sourceVersionStatus: "detected" | "not_selected" | "unknown";
  updateSourceVersion: boolean;
}

export interface CodeChangeEntry {
  fileName: string;
  filePath: string;
  changeType: "modified" | "added" | "deleted";
  additions: number;
  deletions: number;
  oldContent: string;
  newContent: string;
  diffLines: { type: "add" | "remove" | "context"; lineNumber: number; content: string }[];
}