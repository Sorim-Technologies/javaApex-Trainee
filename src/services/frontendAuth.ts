export interface FrontendAuthUser {
  login: string;
  name: string;
  avatar_url: string;
  email: string;
  frontend_bypass: boolean;
}

const FRONTEND_AUTH_SESSION_KEY = "frontend_auth_bypass_active";
const FRONTEND_AUTH_USER_KEY = "frontend_auth_user";

export const FRONTEND_AUTH_BYPASS_ENABLED =
  (import.meta.env?.VITE_FRONTEND_AUTH_BYPASS ?? "").trim().toLowerCase() === "true";

export const FRONTEND_AUTH_USER: FrontendAuthUser = {
  login: "frontend-dev",
  name: "Frontend Dev",
  avatar_url: "",
  email: "frontend-dev@local",
  frontend_bypass: true,
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function isFrontendAuthBypassEnabled() {
  return FRONTEND_AUTH_BYPASS_ENABLED;
}

export function enableFrontendAuthBypass(): FrontendAuthUser | null {
  if (!FRONTEND_AUTH_BYPASS_ENABLED || typeof window === "undefined") {
    return null;
  }

  window.localStorage.setItem(FRONTEND_AUTH_SESSION_KEY, "true");
  window.localStorage.setItem(FRONTEND_AUTH_USER_KEY, JSON.stringify(FRONTEND_AUTH_USER));
  return FRONTEND_AUTH_USER;
}

export function disableFrontendAuthBypass() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(FRONTEND_AUTH_SESSION_KEY);
  window.localStorage.removeItem(FRONTEND_AUTH_USER_KEY);
}

export function ensureFrontendAuthBypass() {
  if (!FRONTEND_AUTH_BYPASS_ENABLED) return null;

  return enableFrontendAuthBypass();
}

export function getFrontendAuthUser(): FrontendAuthUser | null {
  if (!FRONTEND_AUTH_BYPASS_ENABLED || typeof window === "undefined") {
    return null;
  }

  const active = window.localStorage.getItem(FRONTEND_AUTH_SESSION_KEY) === "true";
  if (!active) return null;

  return readJson<FrontendAuthUser>(FRONTEND_AUTH_USER_KEY) ?? FRONTEND_AUTH_USER;
}

export function getActiveProfileUser(): FrontendAuthUser | null {
  return getFrontendAuthUser();
}
