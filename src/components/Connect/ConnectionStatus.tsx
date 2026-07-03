import React from "react";
import { styles } from "../../pages/styles";

interface ConnectionStatusProps {
  isLoading: boolean;
  shouldShowPatInput: boolean;
}

export function ConnectionStatus({
  isLoading,
  shouldShowPatInput,
}: ConnectionStatusProps) {
  if (isLoading && !shouldShowPatInput) {
    return (
      <div style={{ ...styles.connectNote, color: "#2563eb" }}>
        Checking repository access...
      </div>
    );
  }

  if (!shouldShowPatInput) {
    return (
      <div style={styles.connectNote}>
        Public GitHub repositories can be analyzed without a token. If the repository is private, we will ask for a PAT after detection.
      </div>
    );
  }

  return null;
}

export default ConnectionStatus;
