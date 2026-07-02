import { useMemo } from "react";
import { normalizeGithubUrl, isEnterpriseGithub } from "../utils/validators";

export function useValidation(
  repoUrl: string,
  githubToken: string,
  patToken: string,
  isPrivateRepo: boolean
) {
  const urlValidation = useMemo(() => {
    return repoUrl
      ? normalizeGithubUrl(repoUrl)
      : { valid: false, normalizedUrl: "", message: "" };
  }, [repoUrl]);

  const showEnterpriseToken = useMemo(() => {
    return (
      !!repoUrl &&
      isEnterpriseGithub(urlValidation.normalizedUrl || repoUrl)
    );
  }, [repoUrl, urlValidation.normalizedUrl]);

  const shouldShowPatInput = useMemo(() => {
    return showEnterpriseToken || isPrivateRepo;
  }, [showEnterpriseToken, isPrivateRepo]);

  const currentToken = useMemo(() => {
    if (showEnterpriseToken) return githubToken.trim();
    if (isPrivateRepo) return patToken.trim() || githubToken.trim();
    if (githubToken.trim()) return githubToken.trim();
    if (patToken.trim()) return patToken.trim();
    return "";
  }, [githubToken, patToken, showEnterpriseToken, isPrivateRepo]);

  return {
    urlValidation,
    showEnterpriseToken,
    shouldShowPatInput,
    currentToken,
  };
}
export default useValidation;
