import { API_BASE_URL, APP_BASE_URL } from "./migrationService";
 
export type SocialProvider = "github" | "gitlab" | "google" | "guest";
export type OAuthProvider = Exclude<SocialProvider, "guest">;
 
export type AuthUser = {
  id?: number;
  name: string;
  email: string | null;
  provider: SocialProvider;
  role: "guest" | "user";
  migration_limit?: number | null;
  migrations_used?: number | null;
  remaining_migrations?: number | null;
};
 
const APP_AUTH_TOKEN_KEY = "app_auth_token";
 
type AuthTokenResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};
 
async function parseAuthResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();
  let data: any = null;
 
  if (contentType.includes("application/json") && bodyText) {
    try {
      data = JSON.parse(bodyText);
    } catch {
      throw new Error(fallbackMessage);
    }
  }
 
  if (!response.ok) {
    if (bodyText.trim().startsWith("<!doctype") || bodyText.trim().startsWith("<html")) {
      throw new Error(`API routing error: expected JSON from ${response.url} but received HTML. Check that the FastAPI backend is running on port 8001.`);
    }
    throw new Error(data?.detail || data?.message || fallbackMessage);
  }
 
  if (!data) {
    throw new Error(fallbackMessage);
  }
 
  return data as T;
}
 
export async function startSocialLogin(provider: OAuthProvider) {
  try {
    const healthResponse = await fetch(`${APP_BASE_URL}/health`, { method: "HEAD" });
    if (!healthResponse.ok) {
      throw new Error("Backend health check failed");
    }
  } catch {
    throw new Error(`Backend is not reachable at ${APP_BASE_URL}. Start the FastAPI server on port 8001 before signing in.`);
  }
 
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const redirectUrl = origin ? `${origin}/auth/callback?provider=${provider}` : "/";
  window.location.href = `${API_BASE_URL}/auth/oauth/${provider}/login?redirect_url=${encodeURIComponent(redirectUrl)}`;
}
 
export async function guestLogin(): Promise<AuthTokenResponse> {
  try {
    const healthResponse = await fetch(`${APP_BASE_URL}/health`, { method: "HEAD" });
    if (!healthResponse.ok) {
      throw new Error("Backend health check failed");
    }
  } catch {
    throw new Error(`Backend is not reachable at ${APP_BASE_URL}. Start the FastAPI server on port 8001 before continuing as guest.`);
  }
 
  const response = await fetch(`${API_BASE_URL}/auth/oauth/guest`, { method: "POST" });
 
  return parseAuthResponse<AuthTokenResponse>(response, "Failed to continue as guest");
}
 
export async function getSocialCurrentUser(token: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/auth/oauth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
 
  return parseAuthResponse<AuthUser>(response, "Failed to load current user");
}
 
export async function logoutCurrentUser(token: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/oauth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
 
  return parseAuthResponse<{ message: string }>(response, "Failed to logout current user");
}
 
export function getStoredAppToken() {
  return localStorage.getItem(APP_AUTH_TOKEN_KEY);
}
 
export function setStoredAppToken(token: string) {
  localStorage.setItem(APP_AUTH_TOKEN_KEY, token);
}
 
export function clearStoredAppToken() {
  localStorage.removeItem(APP_AUTH_TOKEN_KEY);
}

export async function completeSocialLogin(
  provider: OAuthProvider,
  code: string
): Promise<AuthTokenResponse> {
  const response = await fetch(
    `${API_BASE_URL}/auth/oauth/${provider}/callback?code=${encodeURIComponent(
      code
    )}`
  );

  const data = await parseAuthResponse<AuthTokenResponse>(
    response,
    `${provider} login failed`
  );

  setStoredAppToken(data.access_token);

  return data;
}

