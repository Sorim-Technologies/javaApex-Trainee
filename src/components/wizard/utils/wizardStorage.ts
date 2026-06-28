export const readPersistedValue = (key: string) => {
  if (typeof window === "undefined") return null;

  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
};

export const readSessionJson = <T,>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = readPersistedValue(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const writeSessionJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(key, JSON.stringify(value));
};
