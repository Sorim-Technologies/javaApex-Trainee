import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiGithub,
  FiLoader,
} from "react-icons/fi";

import {
  completeSocialLogin,
  getSocialCurrentUser,
  setStoredAppToken,
} from "../../services/SocialAuthApi";
import type { OAuthProvider } from "../../services/SocialAuthApi";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("Connecting securely...");
  const [providerName, setProviderName] = useState("Authentication");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const provider =
      (params.get("provider") as OAuthProvider) || "github";

    const code = params.get("code");
    const oauthToken = params.get("oauth_token");

    const providerLabel =
      provider.charAt(0).toUpperCase() + provider.slice(1);

    setProviderName(providerLabel);
    setMessage(`Connecting securely with ${providerLabel}...`);

    if (oauthToken) {
      setStoredAppToken(oauthToken);
      localStorage.setItem(`${provider}_token`, oauthToken);

      getSocialCurrentUser(oauthToken)
        .then((user) => {
          localStorage.setItem(
            `${provider}_user`,
            JSON.stringify(user)
          );

          setStatus("success");
          setMessage(`${providerLabel} connected successfully.`);

          setTimeout(() => navigate("/"), 1000);
        })
        .catch((err) => {
          setStatus("error");
          setMessage(err.message || "Failed to load user profile.");

          setTimeout(() => navigate("/"), 1600);
        });
      return;
    }

    if (code) {
      completeSocialLogin(provider, code)
        .then((data) => {
          localStorage.setItem(`${provider}_token`, data.access_token);
          localStorage.setItem(
            `${provider}_user`,
            JSON.stringify(data.user)
          );

          setStatus("success");
          setMessage(`${providerLabel} connected successfully.`);

          setTimeout(() => navigate("/"), 1000);
        })
        .catch((err) => {
          setStatus("error");
          setMessage(err.message || "Authentication failed.");

          setTimeout(() => navigate("/"), 1600);
        });
      return;
    }

    setStatus("error");
    setMessage("Authentication token or code was not received.");
    setTimeout(() => navigate("/"), 1500);
  }, [navigate]);

  const getProviderIcon = () => {
    switch (providerName.toLowerCase()) {
      case "github":
        return <FiGithub />;

      case "gitlab":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path
              fill="#FC6D26"
              d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.415-.724-.415-.859 0l-2.664 8.189H7.574L4.91 1.263c-.135-.415-.724-.415-.859 0L1.387 9.452.045 13.587c-.12.37.007.777.317 1.002l11.638 8.455 11.638-8.455c.31-.225.437-.632.317-1.002z"
            />
          </svg>
        );

      case "google":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.98h6.61c-.3 1.53-1.18 2.82-2.52 3.68v3.02h4.03c2.37-2.17 3.625-5.38 3.625-8.61z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.03-3.02c-1.18.79-2.69 1.27-3.93 1.27-3.03 0-5.6-2.05-6.52-4.81H1.31v3.11C3.29 21.6 7.37 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.48 14.53A7.16 7.16 0 0 1 5.08 12c0-.88.15-1.74.4-2.53V6.36H1.31A11.96 11.96 0 0 0 0 12c0 2.06.52 4 1.31 5.64l4.17-3.11z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.96 1.19 15.24 0 12 0 7.37 0 3.29 2.4 1.31 6.36l4.17 3.11c.92-2.76 3.49-4.72 6.52-4.72z"
            />
          </svg>
        );

      default:
        return <FiLoader className="animate-spin" />;
    }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "var(--background)",
    padding: 20,
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    padding: 40,
    borderRadius: 16,
    background: "var(--card)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-lg)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    textAlign: "center",
  };

  const iconStyle = (
    bg: string,
    color: string
  ): React.CSSProperties => ({
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: bg,
    color,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 28,
  });

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {status === "loading" && (
          <>
            <div style={iconStyle("var(--secondary)", "var(--primary)")}>
              {getProviderIcon()}
            </div>

            <h2>Connecting Account</h2>

            <p style={{ color: "var(--muted-foreground)" }}>
              {message}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={iconStyle("#ecfdf5", "#16a34a")}>
              <FiCheckCircle />
            </div>

            <h2 style={{ color: "#16a34a" }}>
              Successfully Connected!
            </h2>

            <p style={{ color: "var(--muted-foreground)" }}>
              {message}
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={iconStyle("#fef2f2", "#dc2626")}>
              <FiAlertCircle />
            </div>

            <h2 style={{ color: "#dc2626" }}>
              Connection Failed
            </h2>

            <p style={{ color: "var(--muted-foreground)" }}>
              {message}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;