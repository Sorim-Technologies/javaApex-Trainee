import { normalizeGithubUrl } from "../../utils/validators";

export const validateUrl = (url: string) => {
  return normalizeGithubUrl(url);
};
