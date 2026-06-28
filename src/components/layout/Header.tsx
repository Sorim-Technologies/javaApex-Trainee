import { useNavigate } from "react-router-dom";
import apexLogo from "../../assets/apexlogo.png";
import "./Layout.css";

interface HeaderProps {
  showBackButton?: boolean;
  onBackToHome?: () => void;
}

export default function Header({ showBackButton = false, onBackToHome }: HeaderProps) {
  const navigate = useNavigate();

  const openSupport = () => {
    window.dispatchEvent(new Event("open-support-modal"));
  };

  return (
    <nav className="layout-header">
      {/* Logo Only - No Text */}
      <div className="layout-header__brand" onClick={onBackToHome}>
        <img src={apexLogo} alt="javaAPEX" className="layout-header__logo" />
        <p className="layout-header__logo-text">javaAPEX</p>
      </div>

      {/* Navigation Links */}
      <div className="layout-header__nav">
        <button
          type="button"
          className="layout-header__link"
          onClick={() => navigate("/docs")}
        >
          Documentation
        </button>
        <a
          className="layout-header__link"
          href="https://github.com/sorimdevs-tech/java-migration-accelerator"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
        <button
          type="button"
          className="layout-header__link"
          onClick={openSupport}
        >
          Support Us
        </button>
        
        {showBackButton && onBackToHome ? (
          <button
            className="layout-header__back-button"
            onClick={onBackToHome}
          >
            ← Home
          </button>
        ) : null}
        
        {/* Profile Icon */}
        <button
          className="layout-header__icon-button"
          title="Profile"
          aria-label="Create frontend demo profile"
          onClick={() => {
            window.localStorage.setItem("javapex_mock_user", JSON.stringify({
              name: "Landing Demo User",
              email: "landing.demo@example.com",
              provider: "Landing Profile",
            }));
            navigate("/");
          }}
        >
          👤
        </button>
      </div>
    </nav>
  );
}
