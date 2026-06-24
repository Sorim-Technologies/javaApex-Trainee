import React, { useEffect, useRef, useState } from "react";

const containerStyle: React.CSSProperties = {
  position: "fixed",
  right: 20,
  bottom: 20,
  zIndex: 2000,
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
};

const buttonStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 28,
  background: "linear-gradient(135deg,#4f46e5,#06b6d4)",
  boxShadow: "0 8px 30px rgba(2,6,23,0.2)",
  border: "none",
  color: "white",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const panelStyle: React.CSSProperties = {
  width: 360,
  height: 520,
  borderRadius: 12,
  background: "var(--surface)",
  boxShadow: "0 20px 60px rgba(2,6,23,0.28)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const headerStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const messagesStyle: React.CSSProperties = {
  padding: 12,
  flex: 1,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), transparent)"
};

const inputBarStyle: React.CSSProperties = {
  padding: 12,
  borderTop: "1px solid var(--border)",
  display: "flex",
  gap: 8,
  alignItems: "center",
};

type Message = { id: string; from: "user" | "assistant"; text: string };

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

const ChatbotLauncher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: uid(), from: "assistant", text: "Hi — I'm your AI Assistant. Ask me about migrating Java apps, recommendations, or get help using this tool." },
  ]);
  const [text, setText] = useState("");
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [open, messages]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: uid(), from: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setText("");

    // Try calling an API endpoint if available, otherwise echo with small delay
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply: Message = { id: uid(), from: "assistant", text: data?.reply || "I couldn't find an answer." };
        setMessages((m) => [...m, reply]);
        return;
      }
    } catch {
      // ignore and fall back
    }

    // Fallback simulated assistant response
    setTimeout(() => {
      const reply: Message = { id: uid(), from: "assistant", text: `Thanks — I heard: "${trimmed}". For a richer experience, connect an AI backend at /api/assistant.` };
      setMessages((m) => [...m, reply]);
    }, 700);
  };

  return (
    <div style={containerStyle} aria-live="polite">
      {open && (
        <div style={panelStyle} role="dialog" aria-label="AI Assistant">
          <div style={headerStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#4f46e5,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700 }}>AI</div>
              <div>
                <div style={{ fontWeight: 700 }}>AI Assistant</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Available on every page</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                title="Minimize"
                onClick={() => setOpen(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>
          </div>

          <div ref={messagesRef} style={messagesStyle}>
            {messages.map((m) => (
              <div key={m.id} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "78%", padding: "10px 12px", borderRadius: 10, background: m.from === "user" ? "var(--primary)" : "var(--surface-alt)", color: m.from === "user" ? "var(--surface)" : "var(--text)", fontSize: 14 }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div style={inputBarStyle}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask me anything..."
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", outline: "none", background: "var(--surface)", color: "var(--text)" }}
              aria-label="Type a message"
            />
            <button
              onClick={sendMessage}
              title="Send"
              style={{ padding: "10px 12px", borderRadius: 8, border: "none", background: "var(--primary)", color: "white", cursor: "pointer" }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Open AI assistant"
            style={buttonStyle}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "white" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatbotLauncher;
