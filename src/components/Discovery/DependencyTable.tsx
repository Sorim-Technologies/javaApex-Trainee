import React from "react";
import { styles } from "../../pages/styles";
import type { RepoAnalysis } from "../../types/migration";

interface DependencyTableProps {
  repoAnalysis: RepoAnalysis | null;
  detectedJavaVersion: string | null;
  detectedJavaStructureLabel: string;
}

export function DependencyTable({
  repoAnalysis,
  detectedJavaVersion,
  detectedJavaStructureLabel,
}: DependencyTableProps) {
  if (!repoAnalysis) return null;

  return (
    <div style={styles.structureBox}>
      <div style={styles.structureTitle}>Project Structure Summary</div>
      <div style={styles.structureGrid}>
        <span
          style={
            repoAnalysis.structure?.has_pom_xml
              ? styles.structureFound
              : styles.structureMissing
          }
        >
          {repoAnalysis.structure?.has_pom_xml ? "✓" : "✗"} pom.xml
        </span>
        <span
          style={
            repoAnalysis.structure?.has_build_gradle
              ? styles.structureFound
              : styles.structureMissing
          }
        >
          {repoAnalysis.structure?.has_build_gradle ? "✓" : "✗"} build.gradle
        </span>
        <span
          style={
            repoAnalysis.structure?.has_src_main
              ? styles.structureFound
              : styles.structureMissing
          }
        >
          {repoAnalysis.structure?.has_src_main ? "✓" : "✗"} src/main
        </span>
        <span
          style={
            repoAnalysis.structure?.has_src_test
              ? styles.structureFound
              : styles.structureMissing
          }
        >
          {repoAnalysis.structure?.has_src_test ? "✓" : "✗"} src/test
        </span>
        <span style={detectedJavaVersion ? styles.structureFound : styles.structureMissing}>
          {detectedJavaStructureLabel}
        </span>
      </div>
    </div>
  );
}

export default DependencyTable;
