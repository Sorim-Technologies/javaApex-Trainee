import type { RepoAnalysis } from "../../services/api";

interface DetectedFramework {
  name: string;
  path: string;
  type: string;
}

interface FrameworkListProps {
  detectedFrameworks: DetectedFramework[];
  repoAnalysis: RepoAnalysis | null;
  onFrameworkClick: (framework: DetectedFramework) => void;
  getDetectedComponentCategory: (type: string) => string;
}

const getFrameworkIcon = (type: string) => {
  if (type === "Testing Framework") return "🧪";
  if (type === "Application Framework") return "🍃";
  if (type === "ORM Framework") return "🗄️";
  if (type === "Logging") return "📝";
  if (type === "Mocking Framework") return "🎭";
  if (type === "JSON Processing") return "📦";
  return "📚";
};

export default function FrameworkList({
  detectedFrameworks,
  repoAnalysis,
  onFrameworkClick,
  getDetectedComponentCategory,
}: FrameworkListProps) {
  if (detectedFrameworks.length > 0) {
    return (
      <div className="discovery-framework-grid">
        {detectedFrameworks.map((framework, index) => {
          const category = getDetectedComponentCategory(framework.type);
          return (
            <div key={index} onClick={() => onFrameworkClick(framework)} className="discovery-framework-card">
              <div className="discovery-framework-main">
                <span className="discovery-framework-icon">{getFrameworkIcon(framework.type)}</span>
                <div>
                  <div className="discovery-framework-name">{framework.name}</div>
                  <div className="discovery-framework-meta">
                    <span className="discovery-framework-type">{framework.type}</span>
                    <span
                      className={`discovery-framework-category ${
                        category === "Framework"
                          ? "discovery-framework-category--framework"
                          : "discovery-framework-category--library"
                      }`}
                    >
                      {category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="discovery-framework-actions">
                <span className="discovery-detected-badge discovery-detected-badge--soft">Detected</span>
                <span className="discovery-framework-view">📂 View</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="discovery-framework-grid discovery-framework-grid--fallback">
      <div className="inner-card-hover discovery-framework-inner-card discovery-framework-card discovery-framework-card--fallback">
        <span>🍃</span>
        <span>Spring Boot</span>
        {repoAnalysis?.dependencies?.some((dependency) => dependency.artifact_id.includes("spring")) && (
          <span className="discovery-detected-badge">Detected</span>
        )}
      </div>
      <div className="inner-card-hover discovery-framework-inner-card discovery-framework-card discovery-framework-card--fallback">
        <span>🗄️</span>
        <span>JPA/Hibernate</span>
        {repoAnalysis?.dependencies?.some((dependency) => dependency.artifact_id.includes("hibernate") || dependency.artifact_id.includes("jpa")) && (
          <span className="discovery-detected-badge">Detected</span>
        )}
      </div>
      <div className="inner-card-hover discovery-framework-inner-card discovery-framework-card discovery-framework-card--fallback">
        <span>🧪</span>
        <span>JUnit</span>
        {repoAnalysis?.dependencies?.some((dependency) => dependency.artifact_id.includes("junit")) && (
          <span className="discovery-detected-badge">Detected</span>
        )}
      </div>
      <div className="inner-card-hover discovery-framework-inner-card discovery-framework-card discovery-framework-card--fallback">
        <span>📝</span>
        <span>Log4j/SLF4J</span>
        {repoAnalysis?.dependencies?.some((dependency) => dependency.artifact_id.includes("log4j") || dependency.artifact_id.includes("slf4j")) && (
          <span className="discovery-detected-badge">Detected</span>
        )}
      </div>
    </div>
  );
}
