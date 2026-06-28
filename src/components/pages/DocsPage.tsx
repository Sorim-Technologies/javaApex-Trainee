import { useNavigate } from "react-router-dom";
import "./Pages.css";

const docsSections = [
  {
    title: "1. Connect Project Source",
    description:
      "Choose Public GitHub Repository, Private GitHub Repository, or Local ZIP File. Public repos are validated directly, private repos require a secure access token, and ZIP files are checked before upload.",
    icon: "🔗",
  },
  {
    title: "2. Analyze Project",
    description:
      "JavaApex scans the project to detect Java version, Maven/Gradle files, dependencies, frameworks, test files, APIs, and project structure.",
    icon: "🔍",
  },
  {
    title: "3. Get Java Recommendations",
    description:
      "The system provides top suitable Java target versions with confidence score, benefits, risks, migration effort, and LTS status.",
    icon: "☕",
  },
  {
    title: "4. Review Migration Plan",
    description:
      "View migration strategy, dependency compatibility, modernization suggestions, and step-by-step migration guidance before running changes.",
    icon: "🧭",
  },
  {
    title: "5. Preview Code Changes",
    description:
      "Preview possible code updates such as deprecated API replacement, javax to jakarta migration, and dependency updates.",
    icon: "🧩",
  },
  {
    title: "6. Download Report",
    description:
      "Generate and download a migration report containing project analysis, recommendations, risks, readiness score, and migration roadmap.",
    icon: "📄",
  },
];

const quickLinks = [
  "Public repository access",
  "Private repository PAT setup",
  "ZIP upload validation",
  "Java version recommendations",
  "Dependency compatibility",
  "Migration readiness score",
  "AI code suggestions",
  "Migration report downloads",
];

const features = [
  {
    label: "Public Repo",
    text: "Validate and analyze public GitHub repositories.",
  },
  {
    label: "Private Repo",
    text: "Use GitHub Personal Access Token for private repository access.",
  },
  {
    label: "Local ZIP",
    text: "Upload and analyze local Java project ZIP files.",
  },
];

export default function DocsPage() {
  const navigate = useNavigate();

  return (
    <div className="docs-page">
      <section className="docs-page__hero">
        <div>
          <div className="docs-page__eyebrow">JavaAPEX Documentation</div>
          <h1>JavaApex Migration Guide</h1>
          <p>
            A simple guide to connect Java projects, analyze migration readiness,
            view AI-powered Java version recommendations, and generate migration
            reports.
          </p>
        </div>

        <button type="button" onClick={() => navigate("/")}>
          Open Migration Wizard
        </button>
      </section>

      <section className="docs-page__features">
        {features.map((feature) => (
          <article key={feature.label} className="docs-page__feature-card">
            <h3>{feature.label}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="docs-page__grid" aria-label="Documentation steps">
        {docsSections.map((section) => (
          <article key={section.title} className="docs-page__card">
            <div className="docs-page__icon">{section.icon}</div>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>

      <section className="docs-page__panel">
        <div>
          <h2>Quick Reference</h2>
          <p>
            Use these topics to quickly understand the main features available in
            the JavaApex Migration Accelerator.
          </p>
        </div>

        <div className="docs-page__links">
          {quickLinks.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </div>
      </section>

      <section className="docs-page__flow">
        <h2>Migration Flow</h2>
        <div className="docs-page__flow-steps">
          <span>Connect</span>
          <span>Analyze</span>
          <span>Recommend</span>
          <span>Preview</span>
          <span>Report</span>
        </div>
      </section>

      <section className="docs-page__support">
        <div>
          <h2>Need Help?</h2>
          <p>
            Open the support modal to get help with repository access, ZIP
            upload, migration recommendations, or reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-support-modal"))}
        >
          Open Support
        </button>
      </section>
    </div>
  );
}
