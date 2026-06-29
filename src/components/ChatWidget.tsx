import React, { useEffect, useState } from "react";
import Chatbot from "./Chatbot";
import { API_BASE_URL } from "../services/api";

interface ChatWidgetProps {
  context?: any;
  apiUrl?: string;
  mode?: "floating" | "embedded";
  title?: string;
  subtitle?: string;
  welcomeMessage?: string;
  suggestedPrompts?: string[];
}

const ChatWidget: React.FC<ChatWidgetProps> = ({
  context,
  apiUrl,
  mode = "floating",
  title = "Migration Assistant",
  subtitle = "Context-aware help for strategy",
  welcomeMessage,
  suggestedPrompts,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || mode === "embedded") return;
    const timer = window.setTimeout(() => {
      const input = document.getElementById("migration-assistant-input") as HTMLInputElement | null;
      input?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, mode]);

  const chatbot = (
    <Chatbot
      apiUrl={apiUrl || `${API_BASE_URL}/chat`}
      context={context}
      title={title}
      subtitle={subtitle}
      welcomeMessage={welcomeMessage}
      suggestedPrompts={suggestedPrompts}
      fullWidth
      height={mode === "embedded" ? 380 : 160}
    />
  );

  if (mode === "embedded") {
    return chatbot;
  }

  return (
    <>
      <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 9999 }}>
        {!open && (
          <button
            aria-label="Open migration assistant"
            onClick={() => setOpen(true)}
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#2563eb,#4f46e5)",
              color: "#fff",
              border: "none",
              boxShadow: "0 6px 18px rgba(15,23,42,0.25)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            AI
          </button>
        )}

        {open && (
          <div
            role="dialog"
            aria-label="Migration Assistant"
            style={{
              width: 380,
              maxWidth: "calc(100vw - 48px)",
              height: 460,
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 12px 32px rgba(2,6,23,0.3)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                borderBottom: "1px solid #eef2ff",
                background: "linear-gradient(180deg,#f8fafc,#fff)",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#eef2ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#1e3a8a",
                  }}
                >
                  AI
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{title}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{subtitle}</div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer" }}
              >
                X
              </button>
            </div>

            <div style={{ padding: 12, flex: 1, minHeight: 0, overflowY: "auto" }}>{chatbot}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatWidget;
