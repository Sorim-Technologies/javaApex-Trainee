import React from "react";
import { styles } from "../../pages/styles";

export function ProviderSelector() {
  return (
    <div style={styles.connectHelpGrid}>
      <div style={styles.connectFormatBox}>
        <div style={styles.connectFormatTitle}>Supported formats</div>
        <div>https://github.com/owner/repo</div>
        <div>github.com/owner/repo</div>
        <div>owner/repo</div>
      </div>
      <div style={styles.connectFormatBox}>
        <div style={styles.connectFormatTitle}>Access</div>
        <div>Public repositories do not need a token.</div>
        <div>Private and enterprise repositories need a PAT.</div>
      </div>
    </div>
  );
}

export default ProviderSelector;
