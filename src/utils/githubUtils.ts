export const GITHUB_REPOSITORY_URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[^/]+\/[^/\s]+$/;

export function isEnterpriseGithub(url: string) {
  const match = url.match(/^https?:\/\/(www\.)?github\.([^.]+)\.com\//i);
  return match && match[2] !== "" && match[2] !== "com";
}

export function normalizeGithubUrl(url: string): { valid: boolean; normalizedUrl: string; message: string } {
  if (!url.trim()) {
    return { valid: false, normalizedUrl: "", message: "URL is required" };
  }

  let normalized = url.trim();

  normalized = normalized.replace(/\/tree\/[^/]+.*$/, "");
  normalized = normalized.replace(/\/blob\/[^/]+.*$/, "");
  normalized = normalized.replace(/\/src\/.*$/, "");
  normalized = normalized.replace(/\/$/, "");
  normalized = normalized.replace(/\.git$/, "");

  const isGithubUrl = /^https?:\/\/(www\.)?github(\.[^/]+)?\.com\/[^/]+\/[^/\s]+$/.test(normalized);
  const isGitlabUrl = /^https?:\/\/(www\.)?gitlab\.com\/[^/]+\/[^/\s]+$/.test(normalized);
  const isShortFormat = /^[^/]+\/[^/\s]+$/.test(normalized);

  if (isGithubUrl || isGitlabUrl || isShortFormat) {
    if (url !== normalized) {
      return {
        valid: true,
        normalizedUrl: normalized,
        message: "✓ URL normalized (removed tree/blob paths)",
      };
    }
    return { valid: true, normalizedUrl: normalized, message: "" };
  }

  return {
    valid: false,
    normalizedUrl: "",
    message: "Invalid URL format. Use: https://github.com/owner/repo, https://github.<enterprise>.com/owner/repo, or owner/repo",
  };
}

export function isPrivateRepoAccessError(message: string) {
  const normalizedMessage = message.toLowerCase();
  return (
    normalizedMessage.includes("private repository") ||
    normalizedMessage.includes("repository not found or is private") ||
    normalizedMessage.includes("provide a personal access token") ||
    normalizedMessage.includes("access denied")
  );
}
