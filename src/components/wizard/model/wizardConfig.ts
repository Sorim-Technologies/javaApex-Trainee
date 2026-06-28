import type { ConfidenceLevel } from "./wizardTypes";

export const MIGRATION_STEPS = [
  {
    id: 1,
    name: "Connect",
    icon: "🔗",
    description: "Connect to GitHub Repository",
    summary: "Enter your GitHub repository URL to start the migration process"
  },
  {
    id: 2,
    name: "Discovery",
    icon: "🔍",
    description: "Repository Discovery & Dependencies",
    summary: "Explore repository structure and analyze project dependencies"
  },
  {
    id: 3,
    name: "Strategy",
    icon: "📋",
    description: "Assessment & Migration Strategy",
    summary: "Review assessment results and define the migration roadmap"
  },
  {
    id: 4,
    name: "Migration",
    icon: "⚡",
    description: "Build Modernization & Migration",
    summary: "Execute the upgrade using automation tools and refactor legacy components"
  },
  {
    id: 5,
    name: "Result",
    icon: "📊",
    description: "Migration Results",
    summary: "View migration report and download migrated project"
  },
];

export const STEP_ROUTES: Record<number, string> = {
  1: "/",
  2: "/discovery",
  3: "/strategy",
  4: "/migration",
  5: "/migrating",
  6: "/progress",
  7: "/report",
};

export const getStepFromPath = (pathname: string) => {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const entry = Object.entries(STEP_ROUTES).find(([, route]) => route === normalizedPath);
  return entry ? Number(entry[0]) : 1;
};

export const WIZARD_REPO_URL_KEY = "migration_wizard_repo_url";
export const WIZARD_SELECTED_REPO_KEY = "migration_wizard_selected_repo";
export const WIZARD_REPO_ANALYSIS_KEY = "migration_wizard_repo_analysis";
export const WIZARD_FORM_STATE_KEY = "migration_wizard_form_state";

export const LTS_JAVA_VERSIONS = new Set(["8", "11", "17", "21", "25"]);

export const normalizeConfidence = (confidence: string | undefined): ConfidenceLevel => {
  const normalized = confidence?.toLowerCase() || "";
  if (normalized.includes("high")) return "High";
  if (normalized.includes("low")) return "Low";
  return "Medium";
};

export const getIndicatorStep = (step: number) => Math.min(step, MIGRATION_STEPS.length);
