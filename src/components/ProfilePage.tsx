import React from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import { getActiveProfileUser, logout } from "../services/frontendAuth";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const user = getActiveProfileUser();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme === "dark" ? "#050816" : "#f8fafc",
        padding: "32px 24px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <p style={{ margin: 0, color: theme === "dark" ? "#94a3b8" : "#475569", fontSize: 14 }}>Profile</p>
            <h1 style={{ margin: "10px 0 0", fontSize: "clamp(30px, 3vw, 42px)", color: theme === "dark" ? "#f8fafc" : "#0f172a" }}>Account settings</h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
            <div style={{ borderRadius: 20, padding: 28, background: theme === "dark" ? "rgba(15, 23, 42, 0.92)" : "#ffffff", border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "#2563eb", display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 22 }}>
                      {user?.name?.[0] ?? "U"}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme === "dark" ? "#f8fafc" : "#111827" }}>
                        {user?.name ?? user?.login ?? "Unknown user"}
                      </p>
                      <p style={{ margin: "6px 0 0", fontSize: 14, color: theme === "dark" ? "#cbd5e1" : "#475569" }}>
                        {user?.email ?? "No email available"}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  style={{
                    minWidth: 150,
                    padding: "14px 18px",
                    borderRadius: 14,
                    border: "1px solid transparent",
                    background: theme === "dark" ? "#f97316" : "#f97316",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    boxShadow: "0 18px 45px rgba(249, 115, 22, 0.2)",
                  }}
                >
                  Logout
                </button>
              </div>
            </div>

            <div style={{ borderRadius: 20, padding: 28, background: theme === "dark" ? "rgba(15, 23, 42, 0.92)" : "#ffffff", border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.08)" }}>
              <h2 style={{ margin: 0, fontSize: 20, color: theme === "dark" ? "#f8fafc" : "#0f172a" }}>Logout from profile</h2>
              <p style={{ margin: "12px 0 0", color: theme === "dark" ? "#cbd5e1" : "#475569", lineHeight: 1.7 }}>
                Use this profile page to sign out of the frontend session. The repository dashboard will only keep your session while you remain signed in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
