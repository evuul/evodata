import crypto from "crypto";

const UPSTASH_REST_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REST_TOKEN;

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const PASSWORD_RESET_TTL_SECONDS = 60 * 30; // 30 minutes

const requireUpstash = () => {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    throw new Error("Missing UPSTASH_REST_URL or UPSTASH_REST_TOKEN");
  }
};

const upstashRequest = async (path, init = {}) => {
  requireUpstash();
  const res = await fetch(`${UPSTASH_REST_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
};

const encodeValue = (value) => encodeURIComponent(value);

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
};

export const verifyPassword = (password, hash) => {
  if (!hash || typeof hash !== "string") return false;
  const [salt, stored] = hash.split(":");
  if (!salt || !stored) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(derived, "hex"));
};

export const getUserKey = (email) => `user:${email.toLowerCase()}`;
export const getSessionKey = (token) => `session:${token}`;
export const getPasswordResetKey = (tokenId) => `pwdreset:${tokenId}`;
export const getUserIndexKey = () => "admin:user:index";

export const getJson = async (key) => {
  const data = await upstashRequest(`/get/${encodeURIComponent(key)}`);
  if (!data?.result) return null;
  try {
    return typeof data.result === "string" ? JSON.parse(data.result) : data.result;
  } catch {
    return null;
  }
};

export const setJson = async (key, value, ttlSeconds) => {
  const payload = JSON.stringify(value);
  const ttlParam =
    Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? `?EX=${ttlSeconds}` : "";
  await upstashRequest(`/set/${encodeURIComponent(key)}/${encodeValue(payload)}${ttlParam}`, {
    method: "POST",
  });
};

export const addUserToIndex = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;
  const key = getUserIndexKey();
  const index = (await getJson(key)) || {};
  const emails = Array.isArray(index?.emails) ? index.emails : [];
  if (emails.includes(normalizedEmail)) return;
  await setJson(key, {
    emails: [...emails, normalizedEmail].slice(-5000),
    updatedAt: new Date().toISOString(),
  });
};

export const deleteKey = async (key) => {
  await upstashRequest(`/del/${encodeURIComponent(key)}`, {
    method: "POST",
  });
};

const hashResetSecret = (secret) =>
  crypto.createHash("sha256").update(secret).digest("hex");

export const createSession = async (email) => {
  const token = crypto.randomUUID();
  const session = {
    email: email.toLowerCase(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
  };
  await setJson(getSessionKey(token), session, SESSION_TTL_SECONDS);
  return { token, session };
};

export const createPasswordResetToken = async (
  email,
  ttlSeconds = PASSWORD_RESET_TTL_SECONDS
) => {
  const tokenId = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString("hex");
  const token = `${tokenId}.${secret}`;
  const payload = {
    email: String(email).toLowerCase(),
    tokenHash: hashResetSecret(secret),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
  await setJson(getPasswordResetKey(tokenId), payload, ttlSeconds);
  return { token, tokenId, expiresAt: payload.expiresAt };
};

export const verifyAndConsumePasswordResetToken = async (email, token) => {
  if (!email || !token || typeof token !== "string") return false;
  const [tokenId, secret] = token.split(".");
  if (!tokenId || !secret) return false;

  const key = getPasswordResetKey(tokenId);
  const record = await getJson(key);
  if (!record?.email || !record?.tokenHash) return false;
  if (String(record.email).toLowerCase() !== String(email).toLowerCase()) return false;

  const now = Date.now();
  const expiresAt = Date.parse(record.expiresAt || "");
  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    await deleteKey(key).catch(() => {});
    return false;
  }

  const candidateHash = hashResetSecret(secret);
  const a = Buffer.from(String(record.tokenHash), "hex");
  const b = Buffer.from(candidateHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  await deleteKey(key);
  return true;
};
