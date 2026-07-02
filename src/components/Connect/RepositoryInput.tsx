import React from "react";
import { getInputBorderColor } from "./ConnectHelpers";
import { styles } from "../../pages/styles";

interface RepositoryInputProps {
  repoUrl: string;
  setRepoUrl: (val: string) => void;
  isValid: boolean;
  onContinue: () => void;
  setSelectedRepo: (val: any) => void;
  setRepoAnalysis: (val: any) => void;
  setIsPrivateRepo: (val: boolean) => void;
  setPatToken: (val: string) => void;
  setError: (val: string) => void;
}

export function RepositoryInput({
  repoUrl,
  setRepoUrl,
  isValid,
  onContinue,
  setSelectedRepo,
  setRepoAnalysis,
  setIsPrivateRepo,
  setPatToken,
  setError,
}: RepositoryInputProps) {
  const inputBorderColor = getInputBorderColor(isValid, repoUrl);

  return (
    <div style={styles.connectInputWrap}>
      <input
        type="text"
        style={{ ...styles.input, ...styles.connectInput, borderColor: inputBorderColor }}
        value={repoUrl}
        onChange={(e) => {
          setRepoUrl(e.target.value);
          setSelectedRepo(null);
          setRepoAnalysis(null);
          setIsPrivateRepo(false);
          setPatToken("");
          setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && isValid) {
            onContinue();
          }
        }}
        placeholder="https://github.com/owner/repository"
      />
      <button
        style={{
          ...styles.primaryBtn,
          ...styles.connectInlineBtn,
          opacity: !isValid ? 0.5 : 1,
        }}
        disabled={!isValid}
        onClick={onContinue}
      >
        Continue
      </button>
    </div>
  );
}

export default RepositoryInput;
