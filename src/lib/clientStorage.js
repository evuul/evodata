// Safe browser storage helpers for client-side state persistence.

const hasWindow = () => typeof window !== "undefined";

export const readStoredString = (key, fallback = "") => {
  if (!hasWindow() || !key) return fallback;
  try {
    return String(window.localStorage.getItem(key) || fallback);
  } catch {
    return fallback;
  }
};

export const writeStoredString = (key, value) => {
  if (!hasWindow() || !key) return false;
  try {
    if (!value) {
      window.localStorage.removeItem(key);
      return true;
    }
    window.localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
};

export const readStoredJson = (key, fallback = null) => {
  const raw = readStoredString(key, "");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const writeStoredJson = (key, value) => {
  if (!hasWindow() || !key) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const removeStoredValue = (key) => {
  if (!hasWindow() || !key) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
