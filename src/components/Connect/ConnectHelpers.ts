export const getInputBorderColor = (
  isValid: boolean,
  repoUrl: string
): string => {
  return isValid ? "#22c55e" : repoUrl ? "#ef4444" : "#dbe3ef";
};
