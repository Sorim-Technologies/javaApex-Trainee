import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiCheckCircle, FiGithub, FiLoader } from "react-icons/fi";
import { API_BASE_URL } from "../services/api";

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting securely...");
  const [providerName, setProviderName] = useState("Authentication");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const provider = urlParams.get("provider") || "github"; // Default to github

    if (provider === "github") {
      setProviderName("GitHub");
      setMessage("Connecting securely with GitHub...");
      
      if (!code) {
        setStatus("error");
        setMessage("GitHub did not return an authorization code. Redirecting...");
        setTimeout(() => navigate("/"), 1500);
        return;
      }

      fetch(`${API_BASE_URL}/auth/github/callback?code=${encodeURIComponent(code)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.access_token) {
            localStorage.setItem("github_token", data.access_token);
            localStorage.setItem("github_user", JSON.stringify(data.user));
            setStatus("success");
            setMessage("GitHub connected successfully. Taking you back to javaAPEX...");
            setTimeout(() => navigate("/"), 1000);
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
    } else if (provider === "gitlab") {
      setProviderName("GitLab");
      setMessage("Connecting securely with GitLab...");
      
      // Simulate OAuth login for GitLab
      setTimeout(() => {
        const mockUser = {
          login: "gitlab-dev",
          name: "GitLab Developer",
          avatar_url: "https://gitlab.com/uploads/-/system/user/avatar/gitlab-avatar.png",
          email: "gitlab-dev@sorim.ai"
        };
        // Use a mock token; if they need to search live, we'll prompt for their real PAT on step 1
        localStorage.setItem("gitlab_token", "mock_gitlab_token_9999");
        localStorage.setItem("gitlab_user", JSON.stringify(mockUser));
        
        setStatus("success");
        setMessage("GitLab connected successfully. Taking you back to javaAPEX...");
        setTimeout(() => navigate("/"), 1000);
      }, 1200);
    } else if (provider === "google") {
      setProviderName("Google");
      setMessage("Connecting securely with Google...");
      
      // Simulate OAuth login for Google
      setTimeout(() => {
        const mockUser = {
          login: "google-dev",
          name: "Google Developer",
          avatar_url: "https://lh3.googleusercontent.com/a/default-user=s96-c",
          email: "google-dev@sorim.ai"
        };
        localStorage.setItem("google_token", "mock_google_token_5555");
        localStorage.setItem("google_user", JSON.stringify(mockUser));
        
        setStatus("success");
        setMessage("Google connected successfully. Taking you back to javaAPEX...");
        setTimeout(() => navigate("/"), 1000);
      }, 1200);
    }
  }, [navigate]);

  const getProviderIcon = () => {
    if (providerName === "GitHub") {
      return <FiGithub />;
    } else if (providerName === "GitLab") {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path fill="#FC6D26" d="M23.955 13.587l-1.342-4.135-2.664-8.189c-.135-.415-.724-.415-.859 0l-2.664 8.189H7.574L4.91 1.263c-.135-.415-.724-.415-.859 0L1.387 9.452.045 13.587c-.12.37.007.777.317 1.002l11.638 8.455 11.638-8.455c.31-.225.437-.632.317-1.002z"/>
        </svg>
      );
    } else if (providerName === "Google") {
      return (
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      );
    }
    return <FiCheckCircle />;
  };

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
      className="glass-panel"
      style={{
        minHeight: "calc(100vh - 180px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        background: "var(--background)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "var(--shadow-xl)",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: status === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(37, 99, 235, 0.1)",
            border: status === "error" ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(37, 99, 235, 0.2)",
            color: status === "error" ? "var(--destructive)" : "var(--primary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            marginBottom: 18,
          }}
        >
          {icon}
        </div>
        
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 8,
          alignItems: "center",
          color: "var(--muted-foreground)",
          fontSize: 13,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: 8
        }}>
          {getProviderIcon()}
          {providerName} Connection
        </div>

        <h1 style={{ color: "var(--foreground)", fontSize: 24, fontWeight: 800, lineHeight: 1.2, marginBottom: 12, letterSpacing: "-0.5px" }}>
          {status === "success" ? "Authorized" : status === "error" ? "Connection Issue" : "Signing you in"}
        </h1>
        
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;
