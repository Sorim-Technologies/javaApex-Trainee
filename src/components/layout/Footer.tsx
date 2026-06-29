import apexLogo from "../../assets/logo.jpg";
import "./Layout.css";

type FooterVariant = "light" | "dark";

export default function Footer({
  variant = "dark",
  fixed = false,
}: {
  variant?: FooterVariant;
  fixed?: boolean;
}) {
  return (
    <footer className={`app-footer app-footer--${variant}${fixed ? " app-footer--fixed" : ""}`}>
      <div className="app-footer__content">
        <div className="app-footer__brand" aria-label="JavaAPEX">
          <img src={apexLogo} alt="JavaAPEX" className="app-footer__logo" />
        </div>
        <div className="app-footer__meta">Java Migration Accelerator</div>
        <div className="app-footer__copyright">
          {"\u00A9"} {new Date().getFullYear()}{" "}
          <a href="https://sorim.ai/" target="_blank" rel="noreferrer">
            Sorim.ai
          </a>
        </div>
      </div>
    </footer>
  );
}
