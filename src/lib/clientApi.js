// Lightweight client-side helpers for authenticated JSON requests.

import { parseJsonResponse } from "@/lib/apiResponse";

export const fetchJson = async (input, init = {}) => {
  const response = await fetch(input, init);
  return parseJsonResponse(response);
};

export const fetchAuthJson = async (token, input, init = {}) => {
  if (!token) {
    throw new Error("Unauthorized");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);

  return fetchJson(input, {
    ...init,
    headers,
  });
};
