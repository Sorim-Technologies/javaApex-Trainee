import Header from "../layout/Header";
import Footer from "../layout/Footer";
import { GITHUB_AUTH_LOGIN_URL } from "../../services/api";
import "./Pages.css";

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="landing-page">
      <Header />

      {/* Hero Section */}
      <div className="landing-page__hero">
        <h1 className="landing-page__headline">Modernize Your</h1>
        <div className="landing-page__highlighted-text">Java Applications</div>
        
        <p className="landing-page__description">
          Accelerate your Java application migration with automated tools and intelligent refactoring. 
          Upgrade to newer Java versions with minimal effort and maximum reliability. 
          Reduce technical debt and improve performance across your entire codebase.
        </p>

        {/* Features Grid */}
        <div className="landing-page__features">
          <div className="landing-page__feature-card">
            <div className="landing-page__feature-icon">⚡</div>
            <div className="landing-page__feature-title">Fast Migration</div>
            <div className="landing-page__feature-description">Automated refactoring and code transformation in minutes</div>
          </div>

          <div className="landing-page__feature-card">
            <div className="landing-page__feature-icon">🔍</div>
            <div className="landing-page__feature-title">Deep Analysis</div>
            <div className="landing-page__feature-description">Comprehensive dependency and compatibility scanning</div>
          </div>

          <div className="landing-page__feature-card">
            <div className="landing-page__feature-icon">✅</div>
            <div className="landing-page__feature-title">Quality Assurance</div>
            <div className="landing-page__feature-description">Automated testing and SonarQube integration included</div>
          </div>
        </div>

        <div className="landing-page__version-info">Latest Version: 1.0.0</div>

        {/* CTA Buttons */}
        <div className="landing-page__cta-container">
          <button
            className="landing-page__button landing-page__button--primary"
            onClick={onStart}
          >
            Start Migration →
          </button>
          <button
            className="landing-page__button landing-page__button--secondary"
            onClick={() => {
              window.location.href = GITHUB_AUTH_LOGIN_URL;
            }}
          >
            Login with GitHub
          </button>
          <button
            className="landing-page__button landing-page__button--secondary"
          >
            About this product
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
