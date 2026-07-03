import type {
  RepoInfo,
  RepoFile,
  RepoAnalysis,
  MigrationResult,
  ConversionType,
  MigrationPreview,
  PreviewFileDiff,
  JavaVersionRecommendationResponse,
} from "../services/migrationService";

export interface JavaVersionOption {
  value: string;
  label: string;
}

export interface PersistedWizardFormState {
  maxVisitedIndicatorStep: number;
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
  changeType: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  oldContent: string;
  newContent: string;
  diffLines: { type: 'add' | 'remove' | 'context'; lineNumber: number; content: string }[];
}

export type {
  RepoInfo,
  RepoAnalysis,
  RepoFile,
  MigrationResult,
  ConversionType,
  MigrationPreview,
  PreviewFileDiff,
  JavaVersionRecommendationResponse,
};
