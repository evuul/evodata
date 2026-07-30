// Restores and manages browser authentication without exposing session secrets.

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { COOKIE_SESSION_MARKER, fetchAuthJson } from "@/lib/clientApi";

const STORAGE_KEY = "evodata.auth";
const AuthContext = createContext(undefined);

const normalizeBaseUrl = (value) => {
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
const LOGIN_PATH = "/api/auth/login";
const REGISTER_PATH = "/api/auth/register";
const FORGOT_PASSWORD_PATH = "/api/auth/forgot-password";
const RESET_PASSWORD_PATH = "/api/auth/reset-password";
const CHANGE_PASSWORD_PATH = "/api/auth/change-password";
const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
const PASSWORD_RESET_ENABLED = process.env.NEXT_PUBLIC_PASSWORD_RESET_ENABLED === "true";
const GUEST_AUTH_STATE = AUTH_DISABLED
  ? { token: "guest-token", user: null, accessExpiresAt: null, initialized: true }
  : { token: null, user: null, accessExpiresAt: null, initialized: false };

const createAuthError = (message, { status, code } = {}) => {
  const error = new Error(message);
  if (Number.isFinite(status)) {
    error.status = status;
  }
  if (code) {
    error.code = code;
  }
  return error;
};

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => ({ ...GUEST_AUTH_STATE }));

  useEffect(() => {
    if (AUTH_DISABLED) return;
    if (typeof window === "undefined") return;
    let active = true;
    const restoreSession = async () => {
      let legacyToken = null;
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        legacyToken = stored ? JSON.parse(stored)?.token ?? null : null;
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        legacyToken = null;
      }

      try {
        const headers = legacyToken ? { Authorization: `Bearer ${legacyToken}` } : undefined;
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
          headers,
          credentials: "include",
          cache: "no-store",
        });
        const payload = response.ok ? await response.json() : null;
        if (!active) return;
        if (payload?.authenticated && payload?.user) {
          setAuthState({
            token: COOKIE_SESSION_MARKER,
            user: payload.user,
            accessExpiresAt: payload.accessExpiresAt ?? null,
            initialized: true,
          });
          return;
        }
      } catch {
        // A failed restore leaves the visitor signed out.
      }
      if (active) setAuthState({ token: null, user: null, accessExpiresAt: null, initialized: true });
    };

    restoreSession();
    return () => { active = false; };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    if (AUTH_DISABLED) {
      const guestState = { token: "guest-token", user: { email }, accessExpiresAt: null, initialized: true };
      setAuthState(guestState);
      return guestState;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${LOGIN_PATH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        // If response is empty or not JSON we fall back to a status-specific error below.
      }

      if (!response.ok) {
        const status = response.status;
        const message =
          payload?.message ||
          payload?.error ||
          payload?.errors?.[0] ||
          (status === 401
            ? "Fel e-post eller lösenord."
            : status === 400
              ? "Ogiltig inloggning."
              : "Inloggningsservern svarar inte just nu. Försök igen om en stund.");
        const code =
          status === 401
            ? "INVALID_CREDENTIALS"
            : status === 400
              ? "INVALID_LOGIN_PAYLOAD"
              : status >= 500
                ? "AUTH_SERVER_UNAVAILABLE"
                : "AUTH_REQUEST_FAILED";
        throw createAuthError(message, { status, code });
      }

      if (!payload?.user) {
        throw createAuthError("Oväntat svar från servern: ingen användare mottagen.", {
          code: "AUTH_INVALID_RESPONSE",
        });
      }

      const token = COOKIE_SESSION_MARKER;
      const user = payload.user;
      const accessExpiresAt = payload?.accessExpiresAt ?? null;
      setAuthState({ token, user, accessExpiresAt, initialized: true });
      return { token, user, accessExpiresAt };
    } catch (error) {
      if (error instanceof Error && error.code) {
        throw error;
      }
      throw createAuthError(
        "Inloggningsservern svarar inte just nu. Försök igen om en stund.",
        { code: "AUTH_NETWORK_ERROR" }
      );
    }
  }, []);

  const register = useCallback(async ({ email, password, firstName, lastName }) => {
    if (AUTH_DISABLED) {
      const guestState = { token: "guest-token", user: { email }, accessExpiresAt: null, initialized: true };
      setAuthState(guestState);
      return guestState;
    }

    const response = await fetch(`${API_BASE_URL}${REGISTER_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName }),
      credentials: "include",
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

    if (!payload?.user) throw new Error("Registreringsservern returnerade ett ogiltigt svar.");
    const token = COOKIE_SESSION_MARKER;
    const user = payload.user;
    const accessExpiresAt = payload?.accessExpiresAt ?? null;
    setAuthState({ token, user, accessExpiresAt, initialized: true });
    return { token, user, accessExpiresAt };
  }, []);

  const requestPasswordReset = useCallback(async ({ email }) => {
    if (AUTH_DISABLED) {
      return { message: "Återställning av lösenord är inaktiverad." };
    }
    if (!PASSWORD_RESET_ENABLED) {
      throw new Error("Återställning av lösenord är inte aktiverad.");
    }

    const response = await fetch(`${API_BASE_URL}${FORGOT_PASSWORD_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
    if (!PASSWORD_RESET_ENABLED) {
      throw new Error("Återställning av lösenord är inte aktiverad.");
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

  const changePassword = useCallback(async ({ token, currentPassword, newPassword }) => {
    if (AUTH_DISABLED) {
      return { message: "Password change is disabled." };
    }
    if (!token) {
      throw new Error("Unauthorized");
    }

    return fetchAuthJson(token, `${API_BASE_URL}${CHANGE_PASSWORD_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentPassword, newPassword }),
      credentials: "include",
    });
  }, []);

  const logout = useCallback(async () => {
    if (AUTH_DISABLED) {
      setAuthState({ ...GUEST_AUTH_STATE });
      return;
    }
    try {
      await fetch(`${API_BASE_URL}/api/auth/session`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {
      // Local state is cleared even if server-side revocation is temporarily unavailable.
    }
    setAuthState({ token: null, user: null, accessExpiresAt: null, initialized: true });
  }, []);

  const value = useMemo(
    () => ({
      user: authState.user,
      token: authState.token,
      accessExpiresAt: authState.accessExpiresAt,
      isAuthenticated: AUTH_DISABLED ? true : Boolean(authState.user && authState.token),
      initialized: authState.initialized,
      login,
      register,
      logout,
      requestPasswordReset,
      resetPassword,
      changePassword,
      passwordResetEnabled: PASSWORD_RESET_ENABLED,
      authDisabled: AUTH_DISABLED,
    }),
    [authState, login, register, logout, requestPasswordReset, resetPassword, changePassword]
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
