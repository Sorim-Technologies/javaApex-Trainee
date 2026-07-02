import React from "react";
import { FaJava } from "react-icons/fa";
import { styles } from "../../pages/styles";

interface JavaVersionCardProps {
  detectedJavaVersion: string | null;
}

export function JavaVersionCard({ detectedJavaVersion }: JavaVersionCardProps) {
  return (
    <div style={styles.discoveryItem}>
      <span style={styles.discoveryIcon}>
        <FaJava size={20} />
      </span>
      <div>
        <div style={styles.discoveryTitle}>
          Java Version: {detectedJavaVersion || "Detecting..."}
        </div>
        <div style={styles.discoveryDesc}>Current Java version detected in the project</div>
      </div>
    </div>
  );
}

export default JavaVersionCard;
