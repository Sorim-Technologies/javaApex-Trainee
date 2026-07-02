import React from "react";
import { MdAnalytics } from "react-icons/md";
import { styles } from "../styles";
import {
  StrategySummary,
  ToolSelection,
  JavaVersionSelector,
  MigrationOptions,
  StrategyActions,
} from "../../components/Strategy";
import type { StrategyStepProps } from "../../components/Strategy/StrategyTypes";

export default function Strategy({
  selectedRepo,
  repoAnalysis,
  riskLevel,
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
  migrationApproach,
  setMigrationApproach,
  targetRepoName,
  setTargetRepoName,
  setStep,
}: StrategyStepProps) {
  return (
    <div style={styles.card}>
      <div style={styles.connectEyebrow}>Step 3</div>
      <div style={styles.stepHeader}>
        <span style={styles.stepIcon}>
          <MdAnalytics size={24} />
        </span>
        <div>
          <h2 style={styles.title}>Assessment & Migration Strategy</h2>
          <p style={styles.subtitle}>Review assessment results and define the migration roadmap</p>
        </div>
      </div>

      <StrategySummary
        selectedRepo={selectedRepo}
        repoAnalysis={repoAnalysis}
        riskLevel={riskLevel}
      />

      <ToolSelection
        migrationApproach={migrationApproach}
        setMigrationApproach={setMigrationApproach}
      />

      <JavaVersionSelector
        repoAnalysis={repoAnalysis}
        selectedSourceVersion={selectedSourceVersion}
        setSelectedSourceVersion={setSelectedSourceVersion}
        selectedTargetVersion={selectedTargetVersion}
        setSelectedTargetVersion={setSelectedTargetVersion}
        userSelectedVersion={userSelectedVersion}
        setUserSelectedVersion={setUserSelectedVersion}
        availableTargetVersions={availableTargetVersions}
        versionRecommendation={versionRecommendation}
        versionRecommendationLoading={versionRecommendationLoading}
        versionRecommendationError={versionRecommendationError}
      />

      <MigrationOptions
        migrationApproach={migrationApproach}
        targetRepoName={targetRepoName}
        setTargetRepoName={setTargetRepoName}
      />

      <StrategyActions setStep={setStep} />
    </div>
  );
}
