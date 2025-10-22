"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "evodata.auth";
const AuthContext = createContext(undefined);

const normalizeBaseUrl = (value) => {
  if (!value) return "https://authevo-dvezc6g5f6gufpgf.francecentral-01.azurewebsites.net";
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const LOGIN_PATH = "/api/auth/login";
const REGISTER_PATH = "/api/auth/register";
const FORGOT_PASSWORD_PATH = "/api/auth/forgot-password";
const RESET_PASSWORD_PATH = "/api/auth/reset-password";
const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
const GUEST_AUTH_STATE = AUTH_DISABLED
  ? { token: "guest-token", user: null, accessExpiresAt: null, initialized: true }
  : { token: null, user: null, accessExpiresAt: null, initialized: false };

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => ({ ...GUEST_AUTH_STATE }));

  useEffect(() => {
    if (AUTH_DISABLED) return;
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token) {
          setAuthState({
            token: parsed.token,
            user: parsed.user ?? null,
            accessExpiresAt: parsed.accessExpiresAt ?? null,
            initialized: true,
          });
          return;
        }
      }
    } catch {
      // Ignore storage errors – continue without persisted auth state.
    }
    setAuthState((prev) => ({ ...prev, initialized: true }));
  }, []);

  const persistAuth = useCallback((token, user, accessExpiresAt) => {
    if (AUTH_DISABLED) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, accessExpiresAt }));
    } catch {
      // Ignore storage errors to avoid blocking login flow.
    }
  }, []);

  const clearPersistedAuth = useCallback(() => {
    if (AUTH_DISABLED) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors to avoid blocking logout flow.
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    if (AUTH_DISABLED) {
      const guestState = { token: "guest-token", user: { email }, accessExpiresAt: null, initialized: true };
      setAuthState(guestState);
      return guestState;
    }

    const response = await fetch(`${API_BASE_URL}${LOGIN_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // If response is empty or not JSON we fall back to a generic error below.
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.errors?.[0] ||
        "Inloggningen misslyckades. Kontrollera uppgifterna och försök igen.";
      throw new Error(message);
    }

    const token = payload?.token ?? payload?.accessToken;
    if (!token) {
      throw new Error("Oväntat svar från servern: ingen token mottagen.");
    }

    const user = payload?.user ?? { email };
    const accessExpiresAt = payload?.accessExpiresAt ?? null;
    setAuthState({ token, user, accessExpiresAt, initialized: true });
    persistAuth(token, user, accessExpiresAt);
    return { token, user, accessExpiresAt };
  }, [persistAuth]);

  const register = useCallback(async ({ email, password }) => {
    if (AUTH_DISABLED) {
      const guestState = { token: "guest-token", user: { email }, accessExpiresAt: null, initialized: true };
      setAuthState(guestState);
      return guestState;
    }

    const response = await fetch(`${API_BASE_URL}${REGISTER_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // Ignore parse errors; handled below if request failed.
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.errors?.[0] ||
        "Registreringen misslyckades. Försök igen.";
      throw new Error(message);
    }

    const token = payload?.token ?? payload?.accessToken;
    if (!token) {
      // Om backend inte skickar token direkt försöker vi logga in istället.
      return login({ email, password });
    }

    const user = payload?.user ?? { email };
    const accessExpiresAt = payload?.accessExpiresAt ?? null;
    setAuthState({ token, user, accessExpiresAt, initialized: true });
    persistAuth(token, user, accessExpiresAt);
    return { token, user, accessExpiresAt };
  }, [login, persistAuth]);

  const requestPasswordReset = useCallback(async ({ email, resetUrlBase }) => {
    if (AUTH_DISABLED) {
      return { message: "Återställning av lösenord är inaktiverad." };
    }

    const response = await fetch(`${API_BASE_URL}${FORGOT_PASSWORD_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, resetUrlBase }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // Ignore parse errors when request fails; handled below.
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.errors?.[0] ||
        "Kunde inte påbörja återställning av lösenord. Försök igen.";
      throw new Error(message);
    }

    return payload;
  }, []);

  const resetPassword = useCallback(async ({ email, token, newPassword }) => {
    if (AUTH_DISABLED) {
      return { message: "Återställning av lösenord är inaktiverad." };
    }

    const response = await fetch(`${API_BASE_URL}${RESET_PASSWORD_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, newPassword }),
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      // Ignore parse errors when request fails; handled below.
    }

    if (!response.ok) {
      const message =
        payload?.message ||
        payload?.error ||
        payload?.errors?.[0] ||
        "Kunde inte återställa lösenordet. Försök igen.";
      throw new Error(message);
    }

    return payload;
  }, []);

  const logout = useCallback(() => {
    if (AUTH_DISABLED) {
      setAuthState({ ...GUEST_AUTH_STATE });
      return;
    }
    clearPersistedAuth();
    setAuthState({ token: null, user: null, accessExpiresAt: null, initialized: true });
  }, [clearPersistedAuth]);

  const value = useMemo(
    () => ({
      user: authState.user,
      token: authState.token,
      accessExpiresAt: authState.accessExpiresAt,
      isAuthenticated: AUTH_DISABLED ? true : Boolean(authState.token),
      initialized: authState.initialized,
      login,
      register,
      logout,
      requestPasswordReset,
      resetPassword,
      authDisabled: AUTH_DISABLED,
    }),
    [authState, login, register, logout, requestPasswordReset, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth måste användas inom en AuthProvider.");
  }
  return ctx;
}
