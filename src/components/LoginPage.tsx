import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import { isAuthenticated, loginWithGoogle } from "../services/frontendAuth";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleGoogleLogin = () => {
    loginWithGoogle();
    navigate("/", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: theme === "dark" ? "#060b18" : "#f8fafc",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 24,
          padding: "48px 36px",
          background: theme === "dark" ? "rgba(15, 23, 42, 0.92)" : "#ffffff",
          boxShadow: theme === "dark" ? "0 30px 60px rgba(0, 0, 0, 0.35)" : "0 24px 60px rgba(15, 23, 42, 0.08)",
          border: theme === "dark" ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)", margin: "0 auto 18px" }}>
            <span style={{ color: "white", fontSize: 28, fontWeight: 700 }}>G</span>
          </div>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 3vw, 36px)", color: theme === "dark" ? "#f8fafc" : "#111827" }}>Sign in to continue</h1>
          <p style={{ marginTop: 12, color: theme === "dark" ? "#cbd5e1" : "#4b5563", lineHeight: 1.75 }}>
            Access your repository dashboard and start migration analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "14px 18px",
            borderRadius: 14,
            border: "1px solid transparent",
            background: theme === "dark" ? "#0f172a" : "#ffffff",
            color: theme === "dark" ? "#f8fafc" : "#111827",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: theme === "dark" ? "0 16px 35px rgba(15, 23, 42, 0.4)" : "0 14px 30px rgba(15, 23, 42, 0.12)",
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, background: "#ffffff" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.35 11.1H12v2.8h5.95c-.25 1.36-1 2.51-2.12 3.28v2.72h3.45c2.03-1.87 3.2-4.62 3.2-7.8 0-.64-.06-1.25-.18-1.85z" fill="#4285F4"/>
              <path d="M12 22c2.7 0 4.97-.9 6.63-2.44l-3.45-2.72c-.95.64-2.18 1.02-3.18 1.02-2.45 0-4.53-1.65-5.27-3.87H3.14v2.43C4.78 19.98 8.12 22 12 22z" fill="#34A853"/>
              <path d="M6.73 13.99c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.38H3.14C2.44 8.98 2 10.93 2 13.01s.44 4.03 1.14 5.63l3.59-2.65z" fill="#FBBC05"/>
              <path d="M12 6.21c1.47 0 2.79.5 3.83 1.48l2.87-2.87C16.97 2.98 14.73 2 12 2 8.12 2 4.78 4.02 3.14 7.38l3.59 2.65C7.47 7.86 9.55 6.21 12 6.21z" fill="#EA4335"/>
            </svg>
          </span>
          Continue with Google
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
