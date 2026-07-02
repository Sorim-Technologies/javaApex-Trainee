import React from "react";
import type { RepoAnalysis } from "../../types/migration";

interface ApiEndpointCardProps {
  isOpen: boolean;
  onClose: () => void;
  repoAnalysis: RepoAnalysis | null;
}

export function ApiEndpointCard({ isOpen, onClose, repoAnalysis }: ApiEndpointCardProps) {
  if (!isOpen) return null; 

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(248, 250, 252, 0.78)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          width: "90%",
          maxWidth: "1100px",
          maxHeight: "85vh",
          overflowY: "auto",
          borderRadius: 16,
          boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          padding: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "relative",
            textAlign: "center",
            marginBottom: 24,
            paddingBottom: 16,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 36,
              height: 36,
              border: "none",
              borderRadius: "50%",
              background: "#f1f5f9",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 700,
              color: "#475569",
            }}
          >
            ✕
          </button>

          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: "#1e293b",
            }}
          >
            🔗 API Endpoint Detection
          </h2>

          <p
            style={{
              marginTop: 8,
              color: "#64748b",
              fontSize: 14,
            }}
          >
            Endpoints grouped by HTTP methods
          </p>
        </div>

        {/* API Sections */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {["GET", "POST", "PUT", "DELETE", "PATCH"].map((method) => {
            const endpoints =
              repoAnalysis?.api_endpoints?.filter(
                (api) => api.method?.toUpperCase() === method
              ) || [];

            if (endpoints.length === 0) return null;

            const methodColor =
              method === "GET"
                ? "#2563eb"
                : method === "POST"
                ? "#16a34a"
                : method === "PUT"
                ? "#ca8a04"
                : method === "DELETE"
                ? "#dc2626"
                : "#7c3aed";

            return (
              <div
                key={method}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Method Header */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span
                      style={{
                        background: methodColor,
                        color: "#fff",
                        padding: "5px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      {method}
                    </span>

                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#1e293b",
                      }}
                    >
                      {endpoints.length} Endpoint
                      {endpoints.length > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Table */}
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th
                        style={{
                          padding: 12,
                          textAlign: "center",
                          borderBottom: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      >
                        Endpoint Path
                      </th>

                      <th
                        style={{
                          padding: 12,
                          textAlign: "center",
                          borderBottom: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                      >
                        Source File
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {endpoints.map((api, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                        }}
                      >
                        <td
                          style={{
                            padding: 12,
                            textAlign: "center",
                          }}
                        >
                          <code
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "4px 8px",
                              borderRadius: 6,
                            }}
                          >
                            {api.path}
                          </code>
                        </td>

                        <td
                          style={{
                            padding: 12,
                            textAlign: "center",
                            color: "#64748b",
                            fontSize: 13,
                          }}
                        >
                          {api.file}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ApiEndpointCard;
