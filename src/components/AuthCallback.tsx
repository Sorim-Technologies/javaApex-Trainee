import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../services/api";

interface AuthCallbackProps {
  provider?: "github" | "google";
}

const AuthCallback: React.FC<AuthCallbackProps> = ({ provider = "github" }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const isGoogle = provider === "google";
    const callbackPath = isGoogle ? "google/callback" : "github/callback";
    const tokenKey = isGoogle ? "google_token" : "github_token";
    const userKey = isGoogle ? "google_user" : "github_user";
    const providerLabel = isGoogle ? "Google" : "GitHub";

    if (code) {
      fetch(
        `${API_BASE_URL}/auth/${callbackPath}?code=${encodeURIComponent(code)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            localStorage.setItem(tokenKey, data.access_token);
            localStorage.setItem(userKey, JSON.stringify(data.user));
            localStorage.setItem(
              "auth_session",
              JSON.stringify({
                provider,
                user: data.user,
              }),
            );
            window.dispatchEvent(new Event("auth-changed"));
            if (!isGoogle) {
              window.dispatchEvent(new Event("github-auth-changed"));
            }
            navigate("/");
          } else {
            alert(
              `${providerLabel} login failed: ` +
                (data.error || "Unknown error"),
            );
            navigate("/");
          }
        })
        .catch(() => {
          alert(`${providerLabel} login failed: Network error`);
          navigate("/");
        });
    } else {
      alert("No code found in URL");
      navigate("/");
    }
  }, [navigate, provider]);

  return (
    <div>Logging in with {provider === "google" ? "Google" : "GitHub"}...</div>
  );
};

export default AuthCallback;
