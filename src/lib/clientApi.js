// Lightweight client-side helpers for authenticated JSON requests.

import { parseJsonResponse } from "./apiResponse.js";

export const COOKIE_SESSION_MARKER = "cookie-session";

export const fetchJson = async (input, init = {}) => {
  const response = await fetch(input, init);
  return parseJsonResponse(response);
};

export const buildAuthRequestInit = (token, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (token && token !== COOKIE_SESSION_MARKER) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...init,
    headers,
    credentials: "same-origin",
  };
};

export const fetchAuthJson = async (token, input, init = {}) => {
  return fetchJson(input, buildAuthRequestInit(token, init));
};
