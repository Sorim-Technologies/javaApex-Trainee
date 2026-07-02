import React from "react";
import { FiZap } from "react-icons/fi";
import { styles } from "../styles";
import ConversionTypeCard from "../../components/Strategy/ConversionTypeCard";
import {
  ModernizationPlan,
  DiffPreview,
  MigrationOptionsCheckbox,
  MigrationActions,
  MigrationStatusCard,
} from "../../components/Migration";
import type { MigrationStepProps } from "../../components/Migration/MigrationTypes";

export default function Migration(props: MigrationStepProps) {
  const {
    step,
    setStep,
    selectedRepo,
    repoUrl,
    repoAnalysis,
    selectedSourceVersion,
    selectedTargetVersion,
    runTests,
    setRunTests,
    runSonar,
    setRunSonar,
    runFossa,
    setRunFossa,
    fixBusinessLogic,
    setFixBusinessLogic,
    migrationPreview,
    migrationPreviewLoading,
    migrationPreviewError,
    codeChanges,
    selectedDiffFile,
    setSelectedDiffFile,
    handleStartMigration,
    loading,
    conversionTypes,
    selectedConversions,
    setSelectedConversions,
    setShowApiEndpoints,
    targetRepoName,
    setTargetRepoName,
    migrationJob,
    setMigrationJob,
    migrationLogs,
    animationProgress,
    fossaResult,
    fossaLoading,
    showCodeChanges,
    setShowCodeChanges,
    resetWizard,
    isHighRiskProject,
    detectedFrameworks,
    setError,
  } = props;

  if (step === 4) {
    return (
      <div style={styles.card}>
        <div style={styles.connectEyebrow}>Step 4</div>
        <div style={styles.stepHeader}>
          <span style={styles.stepIcon}>
            <FiZap size={24} />
          </span>
          <div>
            <h2 style={styles.title}>Build Modernization & Migration</h2>
            <p style={styles.subtitle}>Execute the upgrade using automation tools and refactor legacy components</p>
          </div>
        </div>

        <div style={styles.sectionTitle}> Migration Configuration</div>

        <ModernizationPlan
          selectedSourceVersion={selectedSourceVersion}
          selectedTargetVersion={selectedTargetVersion}
          repoAnalysis={repoAnalysis}
          migrationPreview={migrationPreview}
          fixBusinessLogic={fixBusinessLogic}
          setShowApiEndpoints={setShowApiEndpoints}
        />

        <DiffPreview
          migrationPreviewLoading={migrationPreviewLoading}
          migrationPreviewError={migrationPreviewError}
          migrationPreview={migrationPreview}
          codeChanges={codeChanges}
          selectedDiffFile={selectedDiffFile}
          setSelectedDiffFile={setSelectedDiffFile}
        />

        <ConversionTypeCard
          conversionTypes={conversionTypes}
          selectedConversions={selectedConversions}
          setSelectedConversions={setSelectedConversions}
        />

        <MigrationOptionsCheckbox
          runTests={runTests}
          setRunTests={setRunTests}
          runSonar={runSonar}
          setRunSonar={setRunSonar}
          runFossa={runFossa}
          setRunFossa={setRunFossa}
          fixBusinessLogic={fixBusinessLogic}
          setFixBusinessLogic={setFixBusinessLogic}
        />

        <MigrationActions
          setStep={setStep}
          loading={loading}
          onStartMigration={handleStartMigration}
          targetRepoName={targetRepoName}
        />
      </div>
    );
  }

  return (
    <MigrationStatusCard
      step={step}
      setStep={setStep}
      migrationJob={migrationJob}
      selectedSourceVersion={selectedSourceVersion}
      selectedTargetVersion={selectedTargetVersion}
      animationProgress={animationProgress}
      migrationLogs={migrationLogs}
      resetWizard={resetWizard}
    />
  );
}
