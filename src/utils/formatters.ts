import { getFileContent } from "../services/migrationService";
import type { RepoAnalysis, PreviewFileDiff, CodeChangeEntry } from "../types/migration";

export const readPersistedValue = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
};

export const readSessionJson = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = readPersistedValue(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writeSessionJson = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};

export const getIndicatorStep = (step: number, totalStepsCount = 5): number => {
  return Math.min(step, totalStepsCount);
};

export const generateRepoTimestamp = (): string => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
};

export const buildTargetRepoUrl = (repoName: string, timestamp: string): string =>
  `https://github.com/SrikkanthSorim/${repoName || "repo"}-Migrated${timestamp}`;

export const buildTargetBranchName = (repoName: string, timestamp: string): string =>
  `migration/${repoName || "repo"}-Migrated${timestamp}`;

export const getRepositoryLink = (repoValue: string | null): string | null => {
  if (!repoValue) return null;
  return repoValue.startsWith("http") ? repoValue : `https://github.com/${repoValue}`;
};

export const detectJavaVersionFromPomContent = (pomContent: string): string | null => {
  const normalize = (version: string) => {
    const trimmed = version.trim();
    return trimmed.startsWith("1.") ? trimmed.replace("1.", "") : trimmed;
  };

  const lookupProperty = (propertyName: string) => {
    const escapedProperty = propertyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = pomContent.match(new RegExp(`<${escapedProperty}>\\s*(\\d+(?:\\.\\d+)?)\\s*</${escapedProperty}>`));
    return match ? normalize(match[1]) : null;
  };

  const directPatterns = [
    /<maven\.compiler\.source>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.source>/,
    /<maven\.compiler\.target>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.target>/,
    /<maven\.compiler\.release>\s*(\d+(?:\.\d+)?)\s*<\/maven\.compiler\.release>/,
    /<java\.version>\s*(\d+(?:\.\d+)?)\s*<\/java\.version>/,
    /<javaVersion>\s*(\d+(?:\.\d+)?)\s*<\/javaVersion>/,
    /<source>\s*(\d+(?:\.\d+)?)\s*<\/source>/,
  ];

  for (const pattern of directPatterns) {
    const match = pomContent.match(pattern);
    if (match) return normalize(match[1]);
  }

  const propertyPatterns = [
    /<maven\.compiler\.source>\s*\$\{([^}]+)\}\s*<\/maven\.compiler\.source>/,
    /<maven\.compiler\.target>\s*\$\{([^}]+)\}\s*<\/maven\.compiler\.target>/,
    /<maven\.compiler\.release>\s*\$\{([^}]+)\}\s*<\/maven\.compiler\.release>/,
    /<source>\s*\$\{([^}]+)\}\s*<\/source>/,
  ];

  for (const pattern of propertyPatterns) {
    const match = pomContent.match(pattern);
    if (!match) continue;
    const resolved = lookupProperty(match[1]);
    if (resolved) return resolved;
  }

  return null;
};

export const getDetectedComponentCategory = (type: string): "Framework" | "Library" => {
  const normalizedType = type.toLowerCase();

  if (normalizedType.includes("library")) {
    return "Library";
  }

  if (
    normalizedType.includes("framework") ||
    normalizedType.includes("orm") ||
    normalizedType.includes("testing")
  ) {
    return "Framework";
  }

  return "Library";
};

export const parseJavaVersion = (version: string): number | null => {
  const parsed = parseInt(version, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const buildCodeChangesFromPreviewDiffs = (fileDiffs: PreviewFileDiff[]): CodeChangeEntry[] => {
  return fileDiffs.map((fileDiff) => {
    const diffLinesRaw = fileDiff.diff.split(/\r?\n/);
    const parsedDiffLines: CodeChangeEntry["diffLines"] = [];
    let oldLineNumber = 0;
    let newLineNumber = 0;

    diffLinesRaw.forEach((line) => {
      if (!line || line.startsWith("---") || line.startsWith("+++")) {
        return;
      }

      if (line.startsWith("@@")) {
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNumber = Number(match[1]);
          newLineNumber = Number(match[2]);
        }
        return;
      }

      if (line.startsWith("+")) {
        parsedDiffLines.push({
          type: "add",
          lineNumber: newLineNumber,
          content: line.slice(1),
        });
        newLineNumber += 1;
        return;
      }

      if (line.startsWith("-")) {
        parsedDiffLines.push({
          type: "remove",
          lineNumber: oldLineNumber,
          content: line.slice(1),
        });
        oldLineNumber += 1;
        return;
      }

      const content = line.startsWith(" ") ? line.slice(1) : line;
      parsedDiffLines.push({
        type: "context",
        lineNumber: newLineNumber,
        content,
      });
      oldLineNumber += 1;
      newLineNumber += 1;
    });

    const additions = diffLinesRaw.filter((line) => line.startsWith("+") && !line.startsWith("+++")).length;
    const deletions = diffLinesRaw.filter((line) => line.startsWith("-") && !line.startsWith("---")).length;

    return {
      fileName: fileDiff.file_path.split("/").pop() || fileDiff.file_path,
      filePath: fileDiff.file_path,
      changeType: "modified",
      additions,
      deletions,
      oldContent: "",
      newContent: "",
      diffLines: parsedDiffLines,
    };
  });
};

export const isDetectedDependencyStatus = (status: string): boolean => {
  const normalizedStatus = status.trim().toLowerCase();
  return normalizedStatus === "upgraded" || normalizedStatus.startsWith("analyzing");
};

export const getDependencyStatusLabel = (status: string): string => {
  return isDetectedDependencyStatus(status)
    ? "ANALYZED"
    : status.replace(/_/g, " ").toUpperCase();
};

export const enrichAnalysisWithPomVersion = async (
  analysis: RepoAnalysis,
  repoUrlToAnalyze: string,
  token: string
): Promise<RepoAnalysis> => {
  const javaVersionFromAnalysis = analysis.java_version || analysis.java_version_from_build;
  const needsPomFallback =
    (analysis.build_tool === "maven" || analysis.structure?.has_pom_xml) &&
    (!javaVersionFromAnalysis || javaVersionFromAnalysis === "unknown" || javaVersionFromAnalysis === "not_specified");

  if (!needsPomFallback) {
    return analysis;
  }

  try {
    const response = await getFileContent(repoUrlToAnalyze, "pom.xml", token);
    const fallbackJavaVersion = detectJavaVersionFromPomContent(response.content || "");
    if (!fallbackJavaVersion) {
      return analysis;
    }

    return {
      ...analysis,
      java_version: fallbackJavaVersion,
      java_version_from_build: fallbackJavaVersion,
    };
  } catch {
    return analysis;
  }
};
