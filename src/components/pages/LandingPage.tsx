import Header from "../layout/Header";
import Footer from "../layout/Footer";
import { GITHUB_AUTH_LOGIN_URL } from "../../services/api";
import productVisual from "../../assets/javapexfinal.png";
import "./Pages.css";

const capabilityCards = [
  {
    title: "Repository Intelligence",
    description:
      "Scan Maven and Gradle projects, dependencies, frameworks, source version, and migration blockers before any code changes.",
  },
  {
    title: "Version Recommendation",
    description:
      "Compare Java target versions with readiness, effort, risk, LTS status, and compatibility guidance for enterprise teams.",
  },
  {
    title: "Guided Migration",
    description:
      "Move from analysis to strategy, execution, preview, and reports through one controlled migration workflow.",
  },
];

const workflowSteps = ["Connect", "Discover", "Recommend", "Migrate", "Report"];

const trustMetrics = [
  { value: "5-step", label: "guided workflow" },
  { value: "LTS", label: "version planning" },
  { value: "API", label: "integrated analysis" },
];

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="landing-page">
      <Header />

      <main className="landing-page__main">
        <section className="landing-page__hero">
          <div className="landing-page__hero-content">
            <div className="landing-page__eyebrow">Java Migration Accelerator</div>
            <h1 className="landing-page__headline">
              Modernize Java applications with a controlled migration workflow.
            </h1>
            <p className="landing-page__description">
              Analyze repositories, identify Java upgrade paths, choose a strategy,
              run migration automation, and generate stakeholder-ready reports from
              one professional migration workspace.
            </p>

            <div className="landing-page__cta-container">
              <button
                className="landing-page__button landing-page__button--primary"
                onClick={onStart}
              >
                Start Migration
              </button>
              <button
                className="landing-page__button landing-page__button--secondary"
                onClick={() => {
                  window.location.href = GITHUB_AUTH_LOGIN_URL;
                }}
              >
                Login with GitHub
              </button>
              <button className="landing-page__button landing-page__button--ghost">
                About this product
              </button>
            </div>

            <div className="landing-page__metrics" aria-label="Product highlights">
              {trustMetrics.map((metric) => (
                <div key={metric.label} className="landing-page__metric">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="landing-page__visual-panel" aria-label="Migration workflow preview">
            <div className="landing-page__visual-header">
              <span>Migration Readiness</span>
              <strong>82%</strong>
            </div>
            <img
              src={productVisual}
              alt="JavaAPEX migration accelerator"
              className="landing-page__product-visual"
            />
            <div className="landing-page__status-list">
              <div>
                <span className="landing-page__status-dot landing-page__status-dot--complete" />
                Repository analysis complete
              </div>
              <div>
                <span className="landing-page__status-dot landing-page__status-dot--active" />
                Java 17 recommendation prepared
              </div>
              <div>
                <span className="landing-page__status-dot" />
                Migration report ready for review
              </div>
            </div>
          </aside>
        </section>

        <section className="landing-page__workflow" aria-label="Migration workflow">
          {workflowSteps.map((step, index) => (
            <div key={step} className="landing-page__workflow-step">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </section>

        <section className="landing-page__features" id="landing-capabilities">
          {capabilityCards.map((card) => (
            <article key={card.title} className="landing-page__feature-card">
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </article>
          ))}
        </section>
      </main>

      <Footer variant="light" />
    </div>
  );
}
