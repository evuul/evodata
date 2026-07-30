// Shares authenticated inbox resources across components to avoid duplicate API reads.

import { fetchAuthJson } from "./clientApi.js";

const DEFAULT_CACHE_MS = 60 * 1000;
const MESSAGES_RESOURCE = "messages";

const normalizeIdentity = (value) => String(value || "").trim().toLowerCase();

const supportResource = (isAdmin) => `support:${isAdmin ? "admin" : "user"}`;

export function createInboxResourceClient({
  fetchJson = fetchAuthJson,
  now = () => Date.now(),
  cacheMs = DEFAULT_CACHE_MS,
} = {}) {
  const entries = new Map();

  const buildKey = (identity, resource) => {
    const normalizedIdentity = normalizeIdentity(identity);
    if (!normalizedIdentity) throw new Error("An authenticated identity is required");
    return `${normalizedIdentity}:${resource}`;
  };

  const load = ({ identity, token, resource, url, force = false }) => {
    if (!token) return Promise.reject(new Error("An authentication token is required"));
    const key = buildKey(identity, resource);
    const current = entries.get(key) || { data: null, updatedAt: 0, inFlight: null };
    const isFresh = current.data !== null && now() - current.updatedAt < cacheMs;

    if (!force && isFresh) return Promise.resolve(current.data);
    if (current.inFlight) return current.inFlight;

    const inFlight = fetchJson(token, url, { cache: "no-store" })
      .then((data) => {
        entries.set(key, { data, updatedAt: now(), inFlight: null });
        return data;
      })
      .catch((error) => {
        entries.set(key, { ...current, inFlight: null });
        throw error;
      });

    entries.set(key, { ...current, inFlight });
    return inFlight;
  };

  const set = ({ identity, resource, data }) => {
    const key = buildKey(identity, resource);
    entries.set(key, { data, updatedAt: now(), inFlight: null });
    return data;
  };

  const invalidate = ({ identity, resource }) => {
    entries.delete(buildKey(identity, resource));
  };

  const updateMessages = async ({ identity, token, action, ids = [] }) => {
    if (action !== "markRead" && action !== "delete") {
      throw new Error("Unsupported message action");
    }
    const data = await fetchJson(token, "/api/user/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ids }),
    });
    return set({ identity, resource: MESSAGES_RESOURCE, data });
  };

  return {
    loadMessages: ({ identity, token, force = false }) =>
      load({
        identity,
        token,
        resource: MESSAGES_RESOURCE,
        url: "/api/user/messages",
        force,
      }),
    loadSupport: ({ identity, token, isAdmin = false, force = false }) =>
      load({
        identity,
        token,
        resource: supportResource(isAdmin),
        url: isAdmin ? "/api/admin/support/tickets" : "/api/support/tickets",
        force,
      }),
    markMessagesRead: ({ identity, token, ids }) =>
      updateMessages({ identity, token, action: "markRead", ids }),
    deleteMessages: ({ identity, token, ids }) =>
      updateMessages({ identity, token, action: "delete", ids }),
    invalidateSupport: ({ identity, isAdmin = false }) =>
      invalidate({ identity, resource: supportResource(isAdmin) }),
    clearIdentity(identity) {
      const prefix = `${normalizeIdentity(identity)}:`;
      if (prefix === ":") return;
      for (const key of entries.keys()) {
        if (key.startsWith(prefix)) entries.delete(key);
      }
    },
  };
}

export const inboxResourceClient = createInboxResourceClient();
