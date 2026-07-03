import type {
  RepoAnalysis,
  RepoInfo,
  MigrationPreview,
  CodeChangeEntry,
  ConversionType,
  MigrationResult,
} from "../../types/migration";

export interface MigrationStepProps {
  // Common states
  step: number;
  setStep: (val: number) => void;
  selectedRepo: RepoInfo | null;
  repoUrl: string;
  repoAnalysis: RepoAnalysis | null;
  selectedSourceVersion: string;
  selectedTargetVersion: string;

  // Review step config
  runTests: boolean;
  setRunTests: (val: boolean) => void;
  runSonar: boolean;
  setRunSonar: (val: boolean) => void;
  runFossa: boolean;
  setRunFossa: (val: boolean) => void;
  fixBusinessLogic: boolean;
  setFixBusinessLogic: (val: boolean) => void;
  migrationPreview: MigrationPreview | null;
  migrationPreviewLoading: boolean;
  migrationPreviewError: string;
  codeChanges: CodeChangeEntry[];
  selectedDiffFile: string | null;
  setSelectedDiffFile: (val: string | null) => void;
  handleStartMigration: (targetRepoName: string) => void;
  loading: boolean;
  conversionTypes: ConversionType[];
  selectedConversions: string[];
  setSelectedConversions: (val: string[]) => void;
  setShowApiEndpoints: (val: boolean) => void;
  targetRepoName: string;
  setTargetRepoName: (val: string) => void;

  // Running migration states
  migrationJob: MigrationResult | null;
  setMigrationJob: (val: MigrationResult | null) => void;
  migrationLogs: string[];
  animationProgress: number;
  fossaResult: any | null;
  fossaLoading: boolean;
  showCodeChanges: boolean;
  setShowCodeChanges: (val: boolean) => void;
  resetWizard: () => void;
  isHighRiskProject: boolean;
  detectedFrameworks: { name: string; path: string; type: string }[];
  setError: (val: string) => void;
}
