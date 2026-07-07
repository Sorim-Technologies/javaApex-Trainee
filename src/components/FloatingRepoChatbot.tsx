import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  askRepoChatbot,
  checkChatbotHealth,
  getChatbotRepositories,
  indexMigration,
  type ChatbotRepository,
  type ChatbotSource,
} from "../services/chatbotApi";
import { getStoredAppToken } from "../services/socialAuthApi";
import "./FloatingRepoChatbot.css";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  sources?: ChatbotSource[];
  isError?: boolean;
};

const quickQuestions = ["pom.xml", "APIs", "Controllers", "Explain", "Dependencies"];

function BotIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="5" y="7" width="14" height="11" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 12h.01M15.5 12h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function renderInlineMarkdown(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function splitTableRow(line: string) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cell = "";

  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    const previous = trimmed[index - 1];
    if (character === "|" && previous !== "\\") {
      cells.push(cell.trim().replace(/\\\|/g, "|"));
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim().replace(/\\\|/g, "|"));
  return cells;
}

function isTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function renderMarkdownTable(lines: string[], keyPrefix: string) {
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);

  return (
    <div key={keyPrefix} className="apex-ai-chat-table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${keyPrefix}-h-${index}`}>{renderInlineMarkdown(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${keyPrefix}-r-${rowIndex}`}>
              {headers.map((_, cellIndex) => (
                <td key={`${keyPrefix}-c-${rowIndex}-${cellIndex}`}>
                  {renderInlineMarkdown(row[cellIndex] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderMarkdownContent(text: string, keyPrefix: string) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let index = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    nodes.push(
      <p key={`${keyPrefix}-p-${nodes.length}`} className="apex-ai-chat-paragraph">
        {renderInlineMarkdown(paragraph.join("\n"))}
      </p>
    );
    paragraph = [];
  };

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim().startsWith("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      flushParagraph();
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      nodes.push(renderMarkdownTable(tableLines, `${keyPrefix}-t-${nodes.length}`));
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      index += 1;
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph();
  return nodes;
}

function renderMessageText(text: string) {
  const parts = text.split(/```/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <pre key={index} className="apex-ai-chat-code">
          <code>{part.trim()}</code>
        </pre>
      );
    }

    return renderMarkdownContent(part, `md-${index}`);
  });
}

export default function FloatingRepoChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [repositories, setRepositories] = useState<ChatbotRepository[]>([]);
  const [selectedMigrationId, setSelectedMigrationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [isRepoMenuOpen, setIsRepoMenuOpen] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const token = getStoredAppToken();
  const selectedRepo = useMemo(
    () => repositories.find((repo) => repo.migration_id === selectedMigrationId) || null,
    [repositories, selectedMigrationId]
  );
  const filteredRepositories = useMemo(
    () =>
      repositories.filter((repo) =>
        (repo.repository_name || "").toLowerCase().includes(repoSearch.trim().toLowerCase())
      ),
    [repositories, repoSearch]
  );

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, loading, error]);

  const loadRepositories = async () => {
    if (!token) {
      setError("Please login to use Repo Assistant.");
      return;
    }

    setRepositoriesLoading(true);
    try {
      setError("");
      await checkChatbotHealth();
      const data = await getChatbotRepositories();
      setRepositories(data);
      if (!selectedMigrationId && data.length > 0) {
        setSelectedMigrationId(data[0].migration_id);
      }
    } catch (err: any) {
      setError(err?.message || "Unable to reach Repo Assistant. Please check backend connection or try again.");
    } finally {
      setRepositoriesLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    } else {
      setIsRepoMenuOpen(false);
      setRepoSearch("");
    }
  }, [isOpen]);

  const handleIndex = async () => {
    if (!token || !selectedRepo) return;
    setIndexing(true);
    setError("");
    try {
      const summary = await indexMigration(selectedRepo.migration_id);
      await loadRepositories();
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `Indexed ${summary.files_indexed} files and ${summary.chunks_indexed} chunks for ${summary.repository_name}.`,
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Indexing failed. Please try again.");
    } finally {
      setIndexing(false);
    }
  };

  const askQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!token) {
      setError("Please login to use Repo Assistant.");
      return;
    }
    if (!selectedRepo) {
      setError("Please select a migrated repository before asking a question.");
      return;
    }
    if (!selectedRepo.vector_indexed) {
      setError("This repository is not indexed yet. Click Re-index to enable chatbot answers.");
      return;
    }

    setLoading(true);
    setError("");
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    try {
      const response = await askRepoChatbot({
        repository_name: selectedRepo.repository_name,
        migration_id: selectedRepo.migration_id,
        question: trimmed,
      });
      setMessages((current) => [
        ...current,
        { role: "assistant", text: response.answer, sources: response.sources || [] },
      ]);
    } catch (err: any) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: err?.message || "Unable to reach Repo Assistant. Please check backend connection or try again.",
          sources: [],
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    askQuestion(question);
  };

  const selectedRepoVersion = selectedRepo
    ? `Java ${selectedRepo.source_java_version || "?"} -> ${selectedRepo.target_java_version || "?"}`
    : "Java ? -> ?";

  return (
    <div className="apex-ai-chat-widget">
      {isOpen && (
        <section className="apex-ai-chat-panel" aria-label="javaAPEX Repo Assistant">
          <header className="apex-ai-chat-header">
            <div className="apex-ai-chat-avatar">
              <BotIcon />
            </div>
            <div className="apex-ai-chat-heading">
              <h2 className="apex-ai-chat-title">javaAPEX Repo Assistant</h2>
              <p className="apex-ai-chat-subtitle">AI insights for migrated repositories</p>
            </div>
            <button type="button" className="apex-ai-chat-close" onClick={() => setIsOpen(false)} aria-label="Close Repo Assistant">
              x
            </button>
          </header>

          <section className="apex-ai-repo-switcher-wrap">
            <button
              type="button"
              className="apex-ai-repo-switcher"
              onClick={() => repositories.length > 0 && setIsRepoMenuOpen((prev) => !prev)}
              disabled={!token || repositoriesLoading || repositories.length === 0}
              aria-expanded={isRepoMenuOpen}
            >
              <span className="apex-ai-repo-icon">&lt;/&gt;</span>
              <span className="apex-ai-repo-main">
                <span className="apex-ai-repo-name">
                  {!token
                    ? "Login required"
                    : repositoriesLoading
                      ? "Loading repositories"
                      : selectedRepo?.repository_name || "Select repository"}
                </span>
                <span className="apex-ai-repo-version">
                  {selectedRepo ? selectedRepoVersion : repositories.length === 0 ? "No completed repositories" : "Choose a migrated repo"}
                </span>
              </span>
              {selectedRepo && (
                <span className={`apex-ai-repo-status ${selectedRepo.vector_indexed ? "indexed" : "not-indexed"}`}>
                  {selectedRepo.vector_indexed ? "Indexed" : "Not indexed"}
                </span>
              )}
              <span className="apex-ai-repo-chevron">v</span>
            </button>

            {isRepoMenuOpen && (
              <div className="apex-ai-repo-menu">
                <input
                  className="apex-ai-repo-search"
                  placeholder="Search migrated repository..."
                  value={repoSearch}
                  onChange={(event) => setRepoSearch(event.target.value)}
                />

                <div className="apex-ai-repo-list">
                  {filteredRepositories.length === 0 ? (
                    <div className="apex-ai-repo-empty">No repositories match your search.</div>
                  ) : (
                    filteredRepositories.map((repo) => (
                      <button
                        key={repo.migration_id}
                        type="button"
                        className={
                          selectedRepo?.migration_id === repo.migration_id
                            ? "apex-ai-repo-option active"
                            : "apex-ai-repo-option"
                        }
                        onClick={() => {
                          setSelectedMigrationId(repo.migration_id);
                          setMessages([]);
                          setError("");
                          setIsRepoMenuOpen(false);
                          setRepoSearch("");
                        }}
                      >
                        <span className="apex-ai-repo-option-icon">&lt;/&gt;</span>
                        <span className="apex-ai-repo-option-main">
                          <span className="apex-ai-repo-option-name">{repo.repository_name || "Unnamed repository"}</span>
                          <span className="apex-ai-repo-option-version">
                            Java {repo.source_java_version || "?"} -&gt; {repo.target_java_version || "?"}
                          </span>
                        </span>
                        <span className={`apex-ai-repo-option-status ${repo.vector_indexed ? "indexed" : "not-indexed"}`}>
                          {repo.vector_indexed ? "Indexed" : "Pending"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          {repositories.length > 0 && (
            <div className="apex-ai-repo-tools">
              <span className="apex-ai-repo-helper">Ask about code, APIs, dependencies, and migration changes.</span>
              <button
                type="button"
                className="apex-ai-reindex-btn"
                onClick={handleIndex}
                disabled={!selectedRepo || indexing}
              >
                {indexing ? "Indexing..." : "Re-index"}
              </button>
            </div>
          )}

          {!selectedRepo?.vector_indexed && repositories.length > 0 && (
            <div className="apex-ai-chat-warning">
              <strong>This repository is not indexed yet.</strong> Click Re-index to enable accurate answers.
            </div>
          )}

          {repositories.length > 0 && (
            <section className="apex-ai-chat-suggestions" aria-label="Suggested questions">
              {quickQuestions.map((item) => (
                <button key={item} type="button" className="apex-ai-chat-chip" onClick={() => askQuestion(item)} disabled={loading}>
                  {item}
                </button>
              ))}
            </section>
          )}

          <main className="apex-ai-chat-body" ref={bodyRef}>
            {error && (
              <div className="apex-ai-chat-error">
                <strong>Unable to reach Repo Assistant.</strong>
                <span>{error}</span>
              </div>
            )}

            {messages.length === 0 && !error && (
              <div className="apex-ai-chat-empty">
                <div className="apex-ai-chat-empty-icon">
                  <BotIcon />
                </div>
                <div className="apex-ai-chat-empty-title">Ask anything about your migrated repo</div>
                <div className="apex-ai-chat-empty-text">
                  Explore APIs, dependencies, Java version changes, controllers, services, and configuration files.
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`apex-ai-chat-message-row ${message.role}`}>
                {message.role === "assistant" && (
                  <div className="apex-ai-chat-mini-avatar">
                    <BotIcon />
                  </div>
                )}
                <article className={`apex-ai-chat-bubble ${message.role} ${message.isError ? "error" : ""}`}>
                  <div className="apex-ai-chat-message-content">{renderMessageText(message.text)}</div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="apex-ai-chat-sources">
                      <div className="apex-ai-chat-sources-title">Sources</div>
                      {message.sources.map((source, sourceIndex) => (
                        <span
                          key={`${source.file_path}-${sourceIndex}`}
                          className="apex-ai-chat-source"
                          title={source.file_path || "Unknown source"}
                        >
                          <FileIcon />
                          <span className="apex-ai-chat-source-path">{source.file_path || "Unknown source"}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </div>
            ))}

            {loading && (
              <div className="apex-ai-chat-thinking">
                <span />
                <span />
                <span />
                Thinking...
              </div>
            )}
          </main>

          <footer className="apex-ai-chat-footer">
            <form className="apex-ai-chat-input-row" onSubmit={handleSubmit}>
              <textarea
                className="apex-ai-chat-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    askQuestion(question);
                  }
                }}
                placeholder="Ask about code, APIs, dependencies, or migration changes..."
                rows={1}
              />
              <button type="submit" className="apex-ai-chat-send" disabled={loading || !token || !question.trim()}>
                <SendIcon />
              </button>
            </form>
          </footer>
        </section>
      )}

      <button
        type="button"
        className={`apex-ai-chat-fab ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((value) => !value)}
        title="Ask Repo Assistant"
        aria-label="Ask Repo Assistant"
      >
        <BotIcon />
      </button>
    </div>
  );
}
