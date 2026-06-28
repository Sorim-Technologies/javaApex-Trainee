import { useEffect, useState } from "react";
import "./Layout.css";

const supportTopics = [
  "Repository connection and GitHub access",
  "Java version recommendation questions",
  "Migration preview or execution issues",
  "Build modernization, testing, SonarQube, and FOSSA guidance",
];

export default function Support() {
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    const openSupportModal = () => setShowSupportModal(true);
    window.addEventListener("open-support-modal", openSupportModal);

    return () => {
      window.removeEventListener("open-support-modal", openSupportModal);
    };
  }, []);

  useEffect(() => {
    if (!showSupportModal) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowSupportModal(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [showSupportModal]);

  if (!showSupportModal) {
    return null;
  }

  return (
    <div className="support__modal-backdrop" role="presentation" onMouseDown={() => setShowSupportModal(false)}>
      <section
        className="support__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="support__header">
          <div>
            <div className="support__eyebrow">Migration support center</div>
            <h2 id="support-modal-title">How can we help?</h2>
          </div>
          <button type="button" className="support__modal-close" onClick={() => setShowSupportModal(false)} aria-label="Close support modal">
            ×
          </button>
        </div>

        <p className="support__copy">
          This mock support panel is available without backend integration. Pick a topic below or use the sample contact details.
        </p>

        <div className="support__topics">
          {supportTopics.map((topic) => (
            <button key={topic} type="button" onClick={() => setShowSupportModal(false)}>
              {topic}
            </button>
          ))}
        </div>

        <div className="support__contact">
          <div>
            <strong>Email</strong>
            <span>support@sorim.ai</span>
          </div>
          <div>
            <strong>Response time</strong>
            <span>Mock SLA: within 1 business day</span>
          </div>
        </div>
      </section>
    </div>
  );
}
