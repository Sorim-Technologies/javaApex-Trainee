import type {
  RepoAnalysis,
  RepoInfo,
  JavaVersionOption,
  JavaVersionRecommendationResponse,
} from "../../types/migration";

export interface StrategyStepProps {
  selectedRepo: RepoInfo | null;
  repoAnalysis: RepoAnalysis | null;
  riskLevel: string;
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
  migrationApproach: string;
  setMigrationApproach: (val: string) => void;
  targetRepoName: string;
  setTargetRepoName: (val: string) => void;
  setStep: (val: number) => void;
}
