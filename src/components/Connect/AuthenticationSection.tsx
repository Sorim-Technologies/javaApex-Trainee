import React from "react";
import { styles } from "../../pages/styles";

interface AuthenticationSectionProps {
  showEnterpriseToken: boolean;
  githubToken: string;
  setGithubToken: (val: string) => void;
  patToken: string;
  setPatToken: (val: string) => void;
  shouldShowPatInput: boolean;
}

export function AuthenticationSection({
  showEnterpriseToken,
  githubToken,
  setGithubToken,
  patToken,
  setPatToken,
  shouldShowPatInput,
}: AuthenticationSectionProps) {
  if (!shouldShowPatInput) return null;

  const currentVal = showEnterpriseToken ? githubToken : patToken;
  const setVal = showEnterpriseToken ? setGithubToken : setPatToken;

  return (
    <div style={styles.connectInputCard}>
      <label style={styles.label}>
        GitHub Personal Access Token ({showEnterpriseToken || shouldShowPatInput ? "required" : "optional"})
      </label>
      <input
        type="password"
        style={{
          ...styles.input,
          borderColor: currentVal ? "#22c55e" : "#dbe3ef",
        }}
        value={currentVal}
        onChange={(e) => setVal(e.target.value)}
        placeholder="Paste your GitHub PAT here"
        autoComplete="off"
      />
      <div style={styles.connectNote}>
        {showEnterpriseToken ? (
          <>
            Required for GitHub Enterprise repository analysis.{" "}
            <a
              href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
              target="_blank"
              rel="noopener noreferrer"
            >
              How to create a PAT?
            </a>
          </>
        ) : (
          <>
            Required because this repository appears to be private.{" "}
            <a
              href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
              target="_blank"
              rel="noopener noreferrer"
            >
              How to create a PAT?
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthenticationSection;
