import React, { useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../services/api";

interface ChatMessage {
  from: "user" | "bot";
  text: string;
}

interface ChatbotProps {
  apiUrl?: string;
  context?: any;
  title?: string;
  subtitle?: string;
  welcomeMessage?: string;
  suggestedPrompts?: string[];
  fullWidth?: boolean;
  height?: number;
}

const defaultPrompts: string[] = [];

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderFormattedText(text: string) {
  const lines = (text || "").replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listKind: "ul" | "ol" | null = null;
  let codeLines: string[] = [];
  let inCode = false;
  let key = 0;

  const nextKey = (prefix: string) => `${prefix}-${key++}`;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    nodes.push(
      <div
        key={nextKey("p")}
        style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}
      >
        {paragraph.join(" ")}
      </div>,
    );
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    const isOrdered = listKind === "ol";
    nodes.push(
      isOrdered ? (
        <ol
          key={nextKey("ol")}
          style={{ margin: "6px 0 6px 20px", paddingLeft: 16 }}
        >
          {listItems.map((item, index) => (
            <li
              key={`${index}-${item}`}
              style={{ marginBottom: 4, lineHeight: 1.5 }}
            >
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <ul
          key={nextKey("ul")}
          style={{ margin: "6px 0 6px 20px", paddingLeft: 16 }}
        >
          {listItems.map((item, index) => (
            <li
              key={`${index}-${item}`}
              style={{ marginBottom: 4, lineHeight: 1.5 }}
            >
              {item}
            </li>
          ))}
        </ul>
      ),
    );
    listItems = [];
    listKind = null;
  };

  const flushCode = () => {
    if (!codeLines.length) return;
    nodes.push(
      <pre
        key={nextKey("code")}
        style={{
          margin: "8px 0",
          padding: 12,
          borderRadius: 10,
          background: "#0f172a",
          color: "#e2e8f0",
          overflowX: "auto",
          whiteSpace: "pre-wrap",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        {codeLines.join("\n")}
      </pre>,
    );
    codeLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      nodes.push(
        <div
          key={nextKey("h")}
          style={{
            marginTop: heading[1].length === 1 ? 12 : 10,
            marginBottom: 4,
            fontWeight: 800,
            color: "#0f172a",
            fontSize:
              heading[1].length === 1 ? 17 : heading[1].length === 2 ? 15 : 14,
          }}
        >
          {heading[2]}
        </div>,
      );
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      listKind = "ul";
      listItems.push(bullet[1]);
      continue;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      listKind = "ol";
      listItems.push(numbered[1]);
      continue;
    }

    if (listKind) {
      flushList();
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCode();
  return nodes;
}

const Chatbot: React.FC<ChatbotProps> = ({
  apiUrl,
  context,
  title = "Migration Assistant",
  subtitle = "Ask about strategy, risks, build changes, or next steps.",
  welcomeMessage,
  suggestedPrompts,
  fullWidth = true,
  height = 360,
}) => {
  const endpoint = apiUrl || `${API_BASE_URL}/chat`;
  const statusEndpoint = `${endpoint}/status`;
  const [messages, setMessages] = useState<ChatMessage[]>(
    welcomeMessage ? [{ from: "bot", text: welcomeMessage }] : [],
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionState, setConnectionState] = useState<
    "checking" | "ready" | "warning"
  >("checking");
  const [connectionDetail, setConnectionDetail] = useState(
    "Checking LLM connection...",
  );
  const [typingMessage, setTypingMessage] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const llmStatusPromiseRef = useRef<Promise<void> | null>(null);
  const prompts = useMemo(
    () => (suggestedPrompts !== undefined ? suggestedPrompts : defaultPrompts),
    [suggestedPrompts],
  );
  const requestContext = useMemo(
    () => ({ ...(context || {}), force_llm: true }),
    [context],
  );

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, typingMessage]);

  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      setMessages([{ from: "bot", text: welcomeMessage }]);
    }
  }, [welcomeMessage, messages.length]);

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      try {
        const res = await fetch(statusEndpoint);
        if (!res.ok) {
          throw new Error(`Status request failed with ${res.status}`);
        }

        const data = await res.json();
        if (cancelled) return;

        if (data?.ready === false) {
          setConnectionState("warning");
          setConnectionDetail(String(data?.detail || "LLM is not ready yet."));
          return;
        }

        const modelLabel =
          data?.active_model || data?.configured_model || data?.model;
        setConnectionState("ready");
        setConnectionDetail(
          modelLabel
            ? `LLM ready: ${modelLabel}`
            : String(data?.detail || "LLM ready"),
        );
      } catch {
        if (cancelled) return;
        setConnectionState("ready");
        setConnectionDetail("LLM will connect on the first message.");
      }
    };

    llmStatusPromiseRef.current = checkConnection();

    return () => {
      cancelled = true;
    };
  }, [statusEndpoint]);

  useEffect(() => {
    function onQuickPrompt(e: any) {
      const msg = e?.detail?.message || e?.detail || e?.message;
      if (msg) {
        const text = String(msg);
        setInput(text);
        void sendMessageText(text);
      }
    }

    window.addEventListener(
      "migration-assistant-quick",
      onQuickPrompt as EventListener,
    );
    return () =>
      window.removeEventListener(
        "migration-assistant-quick",
        onQuickPrompt as EventListener,
      );
  }, []);

  const sendMessageText = async (text: string) => {
    const content = (text || "").trim();
    if (!content) return;

    setMessages((current) => [...current, { from: "user", text: content }]);
    setInput("");

    setLoading(true);
    setConnectionState("checking");
    setConnectionDetail("Connecting to LLM...");
    setTypingMessage("Thinking...");

    try {
      if (llmStatusPromiseRef.current) {
        await llmStatusPromiseRef.current.catch(() => undefined);
      }

      let lastError: any = null;
      let replyText = "";

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 120000);

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content, context: requestContext }),
            signal: controller.signal,
          });

          if (!res.ok) {
            let errorText = await res.text();
            try {
              const parsed = JSON.parse(errorText);
              errorText =
                parsed?.detail ||
                parsed?.error ||
                JSON.stringify(parsed) ||
                errorText;
            } catch {
              // not JSON
            }

            const error = new Error(errorText || res.statusText) as Error & {
              status?: number;
            };
            error.status = res.status;
            throw error;
          }

          const data = await res.json();
          replyText = String(data.reply || JSON.stringify(data));
          lastError = null;
          window.clearTimeout(timeoutId);
          break;
        } catch (error: any) {
          lastError = error;
          window.clearTimeout(timeoutId);

          const statusCode = Number(error?.status || 0);
          const message = String(error?.message || "");
          const isRetriable =
            error?.name === "AbortError" ||
            statusCode >= 500 ||
            /Failed to fetch|NetworkError|network|timed out|timeout/i.test(
              message,
            );

          if (attempt === 0 && isRetriable) {
            setConnectionDetail("Retrying LLM connection...");
            await sleep(900);
            continue;
          }

          throw error;
        }

        window.clearTimeout(timeoutId);
      }

      if (lastError) {
        throw lastError;
      }

      setConnectionState("ready");
      setConnectionDetail("LLM connected.");
      setMessages((current) => [...current, { from: "bot", text: replyText }]);
    } catch (e: any) {
      const errorMessage =
        e?.name === "AbortError"
          ? "The LLM is taking too long to respond."
          : e?.message || String(e);
      setConnectionState("warning");
      setConnectionDetail("LLM connection needs attention.");
      setMessages((current) => [
        ...current,
        { from: "bot", text: `Error: ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
      setTypingMessage(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    await sendMessageText(input);
  };

  useEffect(() => {
    function onSend(e: any) {
      const msg = e?.detail?.message || e?.detail || e?.message;
      if (msg) sendMessageText(String(msg));
    }

    window.addEventListener(
      "migration-assistant-send",
      onSend as EventListener,
    );
    return () =>
      window.removeEventListener(
        "migration-assistant-send",
        onSend as EventListener,
      );
  }, [context, endpoint]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        border: "1px solid #dbe4f0",
        borderRadius: 16,
        padding: 16,
        width: fullWidth ? "100%" : "auto",
        maxWidth: fullWidth ? "none" : 800,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 15 }}>
            {title}
          </div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            {subtitle}
          </div>
          <div
            style={{
              color: connectionState === "warning" ? "#b45309" : "#64748b",
              fontSize: 11,
              marginTop: 4,
            }}
          >
            {connectionDetail}
          </div>
        </div>
        <small
          style={{
            color: connectionState === "warning" ? "#b45309" : "#6b7280",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {loading
            ? "Thinking..."
            : connectionState === "checking"
              ? "Connecting..."
              : connectionState === "warning"
                ? "LLM Issue"
                : "LLM Ready"}
        </small>
      </div>

      <div
        ref={messagesRef}
        style={{
          height,
          overflowY: "auto",
          padding: 12,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "#64748b", lineHeight: 1.5 }}>
            Ask about migration strategy, dependencies, build changes, or next
            steps.
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            style={{
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: message.from === "user" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                background: message.from === "user" ? "#dbeafe" : "#f8fafc",
                padding: "10px 12px",
                borderRadius: 12,
                maxWidth: "92%",
                border: "1px solid #e2e8f0",
                boxShadow:
                  message.from === "user"
                    ? "0 4px 10px rgba(37, 99, 235, 0.08)"
                    : "none",
              }}
            >
              <div style={{ fontSize: 14, color: "#111827" }}>
                {renderFormattedText(message.text)}
              </div>
            </div>
          </div>
        ))}
        {typingMessage && (
          <div
            style={{
              marginBottom: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                padding: "10px 12px",
                borderRadius: 12,
                maxWidth: "60%",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontSize: 14,
              }}
            >
              {typingMessage}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => sendMessageText(prompt)}
            disabled={loading}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              padding: "8px 10px",
              borderRadius: 999,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          id="migration-assistant-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the migration assistant..."
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? "#94a3b8" : "#2563eb",
            color: "#fff",
            border: "none",
            padding: "10px 14px",
            borderRadius: 10,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            fontWeight: 700,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
