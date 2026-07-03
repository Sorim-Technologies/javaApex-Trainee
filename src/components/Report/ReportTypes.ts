import type {
  MigrationResult,
  CodeChangeEntry,
  RepoInfo,
} from "../../types/migration";

export interface ReportProps {
  migrationJob: MigrationResult;
  migrationLogs: string[];
  runSonar: boolean;
  runFossa: boolean;
  fossaResult: any | null;
  fossaLoading: boolean;
  codeChanges: CodeChangeEntry[];
  selectedDiffFile: string | null;
  setSelectedDiffFile: (val: string | null) => void;
  showCodeChanges: boolean;
  setShowCodeChanges: (val: boolean) => void;
  selectedRepo: RepoInfo | null;
  isHighRiskProject: boolean;
  detectedFrameworks: { name: string; path: string; type: string }[];
  resetWizard: () => void;
  setStep: (val: number) => void;
}
