// Centralizes browser-session cookies, request authentication, and CSRF checks.

import { deleteKey, getJson, getSessionKey, getUserKey } from "./authStore.js";
import { normalizePortfolioProfile } from "./portfolioProfile.js";

export const SESSION_COOKIE_NAME = "evodata_session";
export const COOKIE_SESSION_MARKER = "cookie-session";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const readCookieHeader = (header, name) => {
  const prefix = `${name}=`;
  for (const part of String(header || "").split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
};

const readSessionCookie = (request) =>
  request?.cookies?.get?.(SESSION_COOKIE_NAME)?.value
  || readCookieHeader(request?.headers?.get?.("cookie"), SESSION_COOKIE_NAME);

const readBearerToken = (request) => {
  const authorization = request?.headers?.get?.("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token && token !== COOKIE_SESSION_MARKER ? token : null;
};

export function isTrustedSessionRequest(request) {
  const method = String(request?.method || "GET").toUpperCase();
  if (SAFE_METHODS.has(method)) return true;

  let expectedOrigin = null;
  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  const origin = request?.headers?.get?.("origin");
  if (origin) return origin === expectedOrigin;
  return request?.headers?.get?.("sec-fetch-site") === "same-origin";
}

export function getRequestAuth(request) {
  const bearerToken = readBearerToken(request);
  if (bearerToken) return { token: bearerToken, source: "bearer" };

  const cookieToken = readSessionCookie(request);
  if (!cookieToken || !isTrustedSessionRequest(request)) return null;
  return { token: cookieToken, source: "cookie" };
}

export const getRequestSessionToken = (request) => getRequestAuth(request)?.token ?? null;

export function isSessionExpired(session, now = Date.now()) {
  const expiresAt = Date.parse(session?.expiresAt || "");
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

export async function resolveUserFromToken(token, { cache = true } = {}) {
  if (!token) return null;
  const session = await getJson(getSessionKey(token), { cache });
  if (!session?.email) return null;

  if (isSessionExpired(session)) {
    await deleteKey(getSessionKey(token)).catch(() => {});
    return null;
  }

  const user = await getJson(getUserKey(session.email), { cache });
  return user ? { user, email: session.email, session, token } : null;
}

export async function resolveRequestUser(request, options) {
  const auth = getRequestAuth(request);
  if (!auth) return null;
  const resolved = await resolveUserFromToken(auth.token, options);
  return resolved ? { ...resolved, authSource: auth.source } : null;
}

export function buildSessionUser(user) {
  return {
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    isSubscriber: Boolean(user.isSubscriber),
    isAdmin: Boolean(user.isAdmin),
    profile: normalizePortfolioProfile(user.profile ?? { shares: 0, avgCost: 0 }),
  };
}

export function setSessionCookie(response, token, expiresAt) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
