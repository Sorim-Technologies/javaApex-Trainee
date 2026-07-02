export interface ConnectRepositoryProps {
  repoUrl: string;
  setRepoUrl: (val: string) => void;
  urlValidation: { valid: boolean; normalizedUrl: string; message: string };
  handleRepositoryContinue: () => void;
  shouldShowPatInput: boolean;
  showEnterpriseToken: boolean;
  githubToken: string;
  setGithubToken: (val: string) => void;
  patToken: string;
  setPatToken: (val: string) => void;
  repoAccessCheckLoading: boolean;
  setSelectedRepo: (val: any) => void;
  setRepoAnalysis: (val: any) => void;
  setIsPrivateRepo: (val: boolean) => void;
  setError: (val: string) => void;
}
