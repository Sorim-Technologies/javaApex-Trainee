import React, { useState } from "react";
import { sendChatbotMessage } from "../services/api";
import "./ChatbotWidget.css";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const CHATBOT_MIGRATOR_CONTEXT_KEY = "java_migration_chatbot_context";

const readMigratorContext = (): Record<string, unknown> | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    const raw =
      window.sessionStorage.getItem(CHATBOT_MIGRATOR_CONTEXT_KEY) ??
      window.localStorage.getItem(CHATBOT_MIGRATOR_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
};

const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! Ask me anything about the Java Migration application.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const appendMessage = (message: ChatMessage) => {
    setMessages((current) => [...current, message]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    setError("");
    appendMessage({ role: "user", content: trimmed });
    setInput("");
    setLoading(true);

    try {
      const response = await sendChatbotMessage(trimmed, "", readMigratorContext());
      appendMessage({ role: "assistant", content: response.reply });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the chatbot service."
      );
      appendMessage({
        role: "assistant",
        content:
          "Sorry, I could not process your message. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chatbot-widget">
      <button
        className="chatbot-toggle-button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        <span className="chatbot-icon">💬</span>
      </button>

      {isOpen && (
        <div className="chatbot-popup" role="dialog" aria-modal="true">
          <div className="chatbot-header">
            <div>
              <div className="chatbot-title">Java Migration Chatbot</div>
              <div className="chatbot-subtitle">
                Ask questions about this Java Migration application.
              </div>
            </div>
            <button
              type="button"
              className="chatbot-close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              ×
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`chatbot-message ${message.role}`}
              >
                {message.content}
              </div>
            ))}
          </div>

          {error && <div className="chatbot-error">{error}</div>}

          <div className="chatbot-input-area">
            <textarea
              className="chatbot-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about this app or displayed result..."
              rows={2}
              disabled={loading}
            />
            <button
              className="chatbot-send-button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;
