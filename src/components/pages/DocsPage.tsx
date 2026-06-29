import { useNavigate } from "react-router-dom";
import "./Pages.css";

const brdSummary = [
  {
    label: "Business Goal",
    text: "Speed up Java modernization with guided assessment and reporting.",
  },
  {
    label: "Primary Users",
    text: "Developers, architects, migration teams, QA, and delivery owners.",
  },
  {
    label: "Expected Outcome",
    text: "Clear recommendations, risks, readiness, and a downloadable report.",
  },
];

const brdSections = [
  {
    title: "1. Business Objectives",
    points: [
      "Reduce manual migration assessment effort.",
      "Standardize recommendations and readiness decisions.",
    ],
  },
  {
    title: "2. In Scope",
    points: [
      "Public, private, and ZIP-based Java project intake.",
      "Analysis, recommendations, migration plan, and report.",
    ],
  },
  {
    title: "3. Out of Scope",
    points: [
      "Production deployment automation.",
      "Direct repository changes without explicit approval.",
    ],
  },
  {
    title: "4. Stakeholders",
    points: [
      "Business and technical owners approve direction.",
      "Migration and QA teams validate execution readiness.",
    ],
  },
  {
    title: "5. Assumptions",
    points: [
      "Source input contains a valid Java project.",
      "Private access uses a valid GitHub token.",
    ],
  },
  {
    title: "6. Risks and Mitigations",
    points: [
      "Limited source access can reduce analysis accuracy.",
      "Legacy dependencies and weak tests may increase risk.",
    ],
  },
];

const functionalRequirements = [
  {
    id: "FR-01",
    name: "Source Connection",
    priority: "High",
    acceptance: "Supports public repo, private repo, or ZIP input.",
  },
  {
    id: "FR-02",
    name: "Project Analysis",
    priority: "High",
    acceptance: "Detects Java version, build tool, dependencies, tests, and structure.",
  },
  {
    id: "FR-03",
    name: "Recommendation Engine",
    priority: "High",
    acceptance: "Returns target versions with effort, risk, confidence, and LTS status.",
  },
  {
    id: "FR-04",
    name: "Migration Plan",
    priority: "High",
    acceptance: "Shows strategy, compatibility, and next actions.",
  },
  {
    id: "FR-05",
    name: "Code Preview",
    priority: "Medium",
    acceptance: "Previews dependency, API, and javax to jakarta guidance.",
  },
  {
    id: "FR-06",
    name: "Report Generation",
    priority: "High",
    acceptance: "Downloads analysis, recommendations, risks, and roadmap.",
  },
];

const flowSteps = ["Start", "Connect", "Analyze", "Recommend", "Plan", "Report", "Approve"];

export default function DocsPage() {
  const navigate = useNavigate();

  return (
    <div className="docs-page">
      <section className="docs-page__hero">
        <div>
          <div className="docs-page__eyebrow">JavaAPEX BRD</div>
          <h1>JavaApex Migration Documentation</h1>
          <p>
            A concise BRD for JavaAPEX migration assessment, recommendations,
            planning, reporting, and approval.
          </p>
        </div>

        <button type="button" onClick={() => navigate("/")}>
          Open Migration Wizard
        </button>
      </section>

      <section className="docs-page__features" aria-label="BRD summary">
        {brdSummary.map((item) => (
          <article key={item.label} className="docs-page__feature-card">
            <h3>{item.label}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="docs-page__grid" aria-label="BRD sections">
        {brdSections.map((section) => (
          <article key={section.title} className="docs-page__card">
            <h2>{section.title}</h2>
            <ul className="docs-page__list">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="docs-page__flow">
        <h2>Business Process Flow</h2>
        <div className="docs-page__flow-steps">
          {flowSteps.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </section>

      <section className="docs-page__requirements" aria-label="Functional requirements">
        <div className="docs-page__section-heading">
          <div className="docs-page__eyebrow">Functional Requirements</div>
          <h2>System Capabilities and Acceptance Criteria</h2>
        </div>

        <div className="docs-page__requirement-table">
          {functionalRequirements.map((requirement) => (
            <article key={requirement.id} className="docs-page__requirement-row">
              <strong>{requirement.id}</strong>
              <div>
                <h3>{requirement.name}</h3>
                <p>{requirement.acceptance}</p>
              </div>
              <span>{requirement.priority}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="docs-page__support">
        <div>
          <h2>Review and Sign-off</h2>
          <p>
            Review the generated report and approve the recommended roadmap
            before execution.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-support-modal"))}
        >
          Contact Support
        </button>
      </section>
    </div>
  );
}
