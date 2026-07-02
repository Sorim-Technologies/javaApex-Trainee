export const isEnterpriseGithub = (url: string): boolean => {
  // Matches github.<anything>.com but not github.com
  const match = url.match(/^https?:\/\/(www\.)?github\.([^.]+)\.com\//i);
  return !!(match && match[2] !== "" && match[2] !== "com");
};

export const normalizeGithubUrl = (
  url: string
): { valid: boolean; normalizedUrl: string; message: string } => {
  if (!url.trim()) {
    return { valid: false, normalizedUrl: "", message: "URL is required" };
  }

  let normalized = url.trim();

  // Remove /tree/branch-name and everything after it
  normalized = normalized.replace(/\/tree\/[^/]+.*$/, '');
  // Remove /blob/branch-name and everything after it
  normalized = normalized.replace(/\/blob\/[^/]+.*$/, '');
  // Remove /src/ paths
  normalized = normalized.replace(/\/src\/.*$/, '');
  // Remove trailing slashes
  normalized = normalized.replace(/\/$/, '');
  // Remove .git extension
  normalized = normalized.replace(/\.git$/, '');

  // Accept github.com, gitlab.com, and any github.<custom>.com (enterprise)
  const isGithubUrl = /^https?:\/\/(www\.)?github(\.[^/]+)?\.com\/[^/]+\/[^/\s]+$/.test(normalized);
  const isGitlabUrl = /^https?:\/\/(www\.)?gitlab\.com\/[^/]+\/[^/\s]+$/.test(normalized);
  const isShortFormat = /^[^/]+\/[^/\s]+$/.test(normalized);

  if (isGithubUrl || isGitlabUrl || isShortFormat) {
    if (url !== normalized) {
      return { 
        valid: true, 
        normalizedUrl: normalized, 
        message: `✓ URL normalized (removed tree/blob paths)` 
      };
    }
    return { valid: true, normalizedUrl: normalized, message: "" };
  }

  return { 
    valid: false, 
    normalizedUrl: "", 
    message: "Invalid URL format. Use: https://github.com/owner/repo, https://github.<enterprise>.com/owner/repo, or owner/repo" 
  };
};

export const isPrivateRepoAccessError = (message: string): boolean => {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("private repository") ||
    normalizedMessage.includes("repository not found or is private") ||
    normalizedMessage.includes("provide a personal access token") ||
    normalizedMessage.includes("access denied")
  );
};
