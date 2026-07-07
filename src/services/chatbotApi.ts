import { APP_BASE_URL } from "./api";

const CHATBOT_API_BASE_URL = APP_BASE_URL;

export type ChatbotRepository = {
  migration_id: number;
  repository_name: string;
  repository_url?: string | null;
  source_java_version?: string | null;
  target_java_version?: string | null;
  completed_at?: string | null;
  vector_indexed?: boolean;
  vector_indexed_at?: string | null;
  vector_index_error?: string | null;
};

export type ChatbotAskPayload = {
  repository_name?: string | null;
  migration_id: number;
  question: string;
};

export type ChatbotSource = {
  repository_name: string;
  file_path: string;
  file_type?: string | null;
};

export type ChatbotAskResponse = {
  answer: string;
  sources: ChatbotSource[];
};

export type IndexMigrationSummary = {
  indexed: boolean;
  repository_name: string;
  migration_id: number;
  files_indexed: number;
  chunks_indexed: number;
  message?: string;
};

function getAuthToken(): string | null {
  return localStorage.getItem("app_auth_token");
}

function authHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseChatbotResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (text.trim().startsWith("<!doctype") || text.trim().startsWith("<html")) {
        throw new Error(`API routing error: expected JSON from ${response.url} but received HTML. Check VITE_API_URL and backend routing.`);
      }
      data = null;
    }
  }

  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item: any) => item?.msg || item?.message || JSON.stringify(item)).join("; ")
          : data?.message || data?.error || `${fallbackMessage} (status ${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

async function safeFetch<T>(url: string, options: RequestInit, fallbackMessage: string): Promise<T> {
  try {
    console.log("Chatbot API URL:", url);
    if (options.body) {
      console.log("Chatbot payload:", options.body);
    }
    const response = await fetch(url, options);
    return parseChatbotResponse<T>(response, fallbackMessage);
  } catch (error: any) {
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new Error(
        `Unable to reach Repo Assistant backend at ${CHATBOT_API_BASE_URL}. Check that FastAPI is running, VITE_API_URL is correct, and CORS allows the frontend origin.`
      );
    }
    throw error;
  }
}

export async function checkChatbotHealth(): Promise<{ status: string; service: string }> {
  return safeFetch<{ status: string; service: string }>(
    `${CHATBOT_API_BASE_URL}/api/chatbot/health`,
    { method: "GET" },
    "Failed to reach Repo Assistant health endpoint"
  );
}

export async function getChatbotRepositories(): Promise<ChatbotRepository[]> {
  return safeFetch<ChatbotRepository[]>(
    `${CHATBOT_API_BASE_URL}/api/chatbot/repositories`,
    {
      method: "GET",
      headers: authHeaders(),
    },
    "Failed to load chatbot repositories"
  );
}

export async function indexMigration(migrationId: number): Promise<IndexMigrationSummary> {
  return safeFetch<IndexMigrationSummary>(
    `${CHATBOT_API_BASE_URL}/api/chatbot/index-migration`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ migration_id: migrationId }),
    },
    "Failed to index repository"
  );
}

export async function askRepoChatbot(payload: ChatbotAskPayload): Promise<ChatbotAskResponse> {
  return safeFetch<ChatbotAskResponse>(
    `${CHATBOT_API_BASE_URL}/api/chatbot/ask`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(payload),
    },
    "Failed to ask Repo Assistant"
  );
}
