import { useNavigate } from "react-router-dom";
import "./DocsPage.css";

const docsSections = [
  {
    title: "1. Connect your repository",
    description:
      "Paste a public GitHub repository URL or use the repository browser after mock login. Private repository token prompts remain part of the wizard flow.",
  },
  {
    title: "2. Review discovery results",
    description:
      "The frontend displays detected Java versions, build files, dependencies, frameworks, tests, and API endpoints returned by the analysis flow.",
  },
  {
    title: "3. Choose a migration strategy",
    description:
      "Use ranked Java target recommendations, migration approach options, framework selections, and modernization settings before starting migration.",
  },
  {
    title: "4. Preview and run migration",
    description:
      "Preview code changes, select conversion categories, run optional checks, and track progress using the migration status screens.",
  },
];

const quickLinks = [
  "Java version recommendations",
  "Build modernization",
  "Dependency compatibility",
  "Testing and quality gates",
  "Migration report downloads",
  "Frontend mock login",
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
            Learn how to use the migration wizard, understand the recommendation flow,
            and explore the frontend-only demo interactions now available in the navbar.
          </p>
        </div>
        <button type="button" onClick={() => navigate("/")}>
          Open migration wizard
        </button>
      </section>

      <section className="docs-page__grid" aria-label="Documentation steps">
        {docsSections.map((section) => (
          <article key={section.title} className="docs-page__card">
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>

      <section className="docs-page__panel">
        <div>
          <h2>Quick reference</h2>
          <p>
            These topics are static frontend documentation entries and can be replaced
            with real docs content later without changing the navbar behavior.
          </p>
        </div>
        <div className="docs-page__links">
          {quickLinks.map((link) => (
            <span key={link}>{link}</span>
          ))}
        </div>
      </section>

      <section className="docs-page__support">
        <h2>Need help?</h2>
        <p>Open the support modal from the navbar or use this shortcut.</p>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-support-modal"))}
        >
          Open support
        </button>
      </section>
    </div>
  );
}
