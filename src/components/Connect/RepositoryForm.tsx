import React from "react";
import { MdOutlineLink } from "react-icons/md";
import { styles } from "../../pages/styles";
import RepositoryInput from "./RepositoryInput";
import ProviderSelector from "./ProviderSelector";
import ConnectionStatus from "./ConnectionStatus";
import ValidationMessage from "./ValidationMessage";
import AuthenticationSection from "./AuthenticationSection";
import type { ConnectRepositoryProps } from "./ConnectTypes";

export function RepositoryForm({
  repoUrl,
  setRepoUrl,
  urlValidation,
  handleRepositoryContinue,
  shouldShowPatInput,
  showEnterpriseToken,
  githubToken,
  setGithubToken,
  patToken,
  setPatToken,
  repoAccessCheckLoading,
  setSelectedRepo,
  setRepoAnalysis,
  setIsPrivateRepo,
  setError,
}: ConnectRepositoryProps) {
  return (
    <div style={{ ...styles.card, padding: 0, overflow: "hidden" }}>
      <div style={styles.connectLayout}>
        <section style={styles.connectFormPanel}>
          <div style={styles.connectEyebrow}>Step 1</div>
          <div style={styles.connectHeaderRow}>
            <span style={styles.stepIcon}>
              <MdOutlineLink />
            </span>
            <div>
              <h2 style={styles.title}>Connect Repository</h2>
              <p style={styles.subtitle}>
                Add the source repository and let the migration flow prepare discovery, strategy, and modernization.
              </p>
            </div>
          </div>

          <div style={styles.connectInputCard}>
            <label style={styles.label}>Repository URL</label>
            <RepositoryInput
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              isValid={urlValidation.valid}
              onContinue={handleRepositoryContinue}
              setSelectedRepo={setSelectedRepo}
              setRepoAnalysis={setRepoAnalysis}
              setIsPrivateRepo={setIsPrivateRepo}
              setPatToken={setPatToken}
              setError={setError}
            />

            <ProviderSelector />

            <ConnectionStatus
              isLoading={repoAccessCheckLoading}
              shouldShowPatInput={shouldShowPatInput}
            />

            <ValidationMessage
              repoUrl={repoUrl}
              isValid={urlValidation.valid}
              message={urlValidation.message}
            />
          </div>

          <AuthenticationSection
            showEnterpriseToken={showEnterpriseToken}
            githubToken={githubToken}
            setGithubToken={setGithubToken}
            patToken={patToken}
            setPatToken={setPatToken}
            shouldShowPatInput={shouldShowPatInput}
          />
        </section>
      </div>
    </div>
  );
}

export default RepositoryForm;
