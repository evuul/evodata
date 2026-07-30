// Applies privacy-preserving distributed rate limits to authentication endpoints.

import crypto from "crypto";
import { kvRestRequest } from "./kvClient.js";

const RATE_LIMIT_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
local ttl = redis.call("TTL", KEYS[1])
return {current, ttl}
`.trim();

const memoryCounters = globalThis.__authRateLimitMemory ?? new Map();
globalThis.__authRateLimitMemory = memoryCounters;

export const AUTH_RATE_LIMITS = Object.freeze({
  login: { ip: { limit: 20, windowSeconds: 15 * 60 }, account: { limit: 8, windowSeconds: 15 * 60 } },
  register: { ip: { limit: 10, windowSeconds: 60 * 60 }, account: { limit: 3, windowSeconds: 60 * 60 } },
  forgotPassword: { ip: { limit: 10, windowSeconds: 60 * 60 }, account: { limit: 3, windowSeconds: 60 * 60 } },
  resetPassword: { ip: { limit: 10, windowSeconds: 60 * 60 }, account: { limit: 5, windowSeconds: 60 * 60 } },
  changePassword: { ip: { limit: 10, windowSeconds: 60 * 60 }, account: { limit: 5, windowSeconds: 60 * 60 } },
});

const hashIdentifier = (value) => crypto
  .createHash("sha256")
  .update(String(value || "unknown"))
  .digest("hex")
  .slice(0, 24);

export function getClientIp(request) {
  const forwarded = request?.headers?.get?.("x-forwarded-for");
  return String(
    forwarded?.split(",")[0]
    || request?.headers?.get?.("cf-connecting-ip")
    || request?.headers?.get?.("x-real-ip")
    || "unknown"
  ).trim();
}

const incrementMemoryCounter = async (key, windowSeconds) => {
  const now = Date.now();
  const existing = memoryCounters.get(key);
  const entry = existing?.expiresAt > now
    ? { count: existing.count + 1, expiresAt: existing.expiresAt }
    : { count: 1, expiresAt: now + windowSeconds * 1000 };
  memoryCounters.set(key, entry);
  return {
    count: entry.count,
    ttl: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)),
  };
};

const incrementDistributedCounter = async (key, windowSeconds) => {
  const response = await kvRestRequest("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(["EVAL", RATE_LIMIT_SCRIPT, "1", key, String(windowSeconds)]),
  }, {
    errorCodePrefix: "AUTH_RATE_LIMIT",
    missingCode: "AUTH_RATE_LIMIT_MISSING_ENV",
    serviceName: "Auth rate limiter",
  });
  const [count, ttl] = Array.isArray(response?.result) ? response.result : [];
  if (!Number.isFinite(Number(count)) || !Number.isFinite(Number(ttl))) {
    throw new Error("Invalid auth rate-limit response");
  }
  return { count: Number(count), ttl: Math.max(1, Number(ttl)) };
};

async function incrementCounter(key, windowSeconds) {
  try {
    return await incrementDistributedCounter(key, windowSeconds);
  } catch (error) {
    console.warn("[auth-rate-limit] distributed counter unavailable", {
      code: error?.code || "AUTH_RATE_LIMIT_FALLBACK",
    });
    return incrementMemoryCounter(key, windowSeconds);
  }
}

export async function checkAuthRateLimit({
  request,
  scope,
  account,
  rules = AUTH_RATE_LIMITS[scope],
  increment = incrementCounter,
}) {
  if (!rules?.ip || !rules?.account) throw new Error(`Unknown auth rate-limit scope: ${scope}`);
  const identifiers = [
    { kind: "ip", value: getClientIp(request), rule: rules.ip },
    { kind: "account", value: String(account || "unknown").trim().toLowerCase(), rule: rules.account },
  ];

  const results = await Promise.all(identifiers.map(async ({ kind, value, rule }) => {
    const key = `auth:limit:${scope}:${kind}:${hashIdentifier(value)}`;
    const result = await increment(key, rule.windowSeconds);
    return { ...result, limit: rule.limit, key };
  }));
  const blocked = results.filter((result) => result.count > result.limit);
  return {
    allowed: blocked.length === 0,
    retryAfter: blocked.length ? Math.max(...blocked.map((result) => result.ttl)) : 0,
  };
}

export function rateLimitResponseHeaders(result) {
  return result?.allowed ? {} : { "Retry-After": String(Math.max(1, result.retryAfter || 1)) };
}
