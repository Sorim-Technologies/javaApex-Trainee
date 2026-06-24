import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle, FiGithub, FiLoader } from "react-icons/fi";
import { API_BASE_URL } from "../services/api";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting securely with GitHub...");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (!code) {
      setStatus("error");
      setMessage("GitHub did not return an authorization code. Redirecting...");
      setTimeout(() => navigate("/"), 1400);
      return;
    }

    fetch(`${API_BASE_URL}/auth/github/callback?code=${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.access_token) {
          localStorage.setItem("github_token", data.access_token);
          localStorage.setItem("github_user", JSON.stringify(data.user));
          setStatus("success");
          setMessage("GitHub connected. Taking you back to JavaApex...");
          setTimeout(() => navigate("/"), 900);
          return;
        }

        setStatus("error");
        setMessage(data.error || "GitHub login failed. Redirecting...");
        setTimeout(() => navigate("/"), 1600);
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error while connecting GitHub. Redirecting...");
        setTimeout(() => navigate("/"), 1600);
      });
  }, [navigate]);

  const icon =
    status === "success" ? (
      <FiCheckCircle />
    ) : status === "error" ? (
      <FiAlertCircle />
    ) : (
      <FiLoader className="auth-spinner" />
    );

  return (
    <div
      style={{
        minHeight: "calc(100vh - 150px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
          padding: 32,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: status === "error" ? "#fef2f2" : "#eff6ff",
            border: status === "error" ? "1px solid #fecaca" : "1px solid #bfdbfe",
            color: status === "error" ? "#dc2626" : "#2563eb",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            marginBottom: 18,
          }}
        >
          {icon}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center", color: "#64748b", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 8 }}>
          <FiGithub />
          GitHub Authentication
        </div>
        <h1 style={{ color: "#1e293b", fontSize: 24, lineHeight: 1.2, marginBottom: 10 }}>
          {status === "success" ? "Connection complete" : status === "error" ? "Connection issue" : "Signing you in"}
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{message}</p>
      </div>
    </div>
  );
};

export default AuthCallback;
