// src/lib/playerSnapshotStore.js

import { Redis } from "@upstash/redis";

const SNAPSHOT_KEY = "cs:players:snapshot";
const SNAPSHOT_TTL_SECONDS = 12 * 60; // keep slightly above poll interval

let redisClient;
let redisInitAttempted = false;

function getRedis() {
  if (redisInitAttempted) return redisClient ?? null;
  redisInitAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    redisClient = new Redis({ url, token });
  } else {
    redisClient = null;
  }
  return redisClient;
}

// Simple in-memory fallback for local development
let memSnapshot = null;

export async function storePlayerSnapshot(snapshot) {
  const payload = JSON.stringify(snapshot);
  const redis = getRedis();
  if (redis) {
    await redis.set(SNAPSHOT_KEY, payload, { ex: SNAPSHOT_TTL_SECONDS });
    return;
  }
  memSnapshot = { payload, expiresAt: Date.now() + SNAPSHOT_TTL_SECONDS * 1000 };
}

export async function loadPlayerSnapshot() {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.get(SNAPSHOT_KEY);
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }

  if (!memSnapshot) return null;
  if (memSnapshot.expiresAt && memSnapshot.expiresAt < Date.now()) {
    memSnapshot = null;
    return null;
  }
  try {
    return JSON.parse(memSnapshot.payload);
  } catch {
    return null;
  }
}

export function snapshotIsStale(snapshot, maxAgeMs) {
  if (!snapshot || !snapshot.updatedAt) return true;
  const ts = Date.parse(snapshot.updatedAt);
  if (!Number.isFinite(ts)) return true;
  return Date.now() - ts > maxAgeMs;
}

export function buildSnapshotFromResults(results, metadata = {}) {
  const items = {};
  let trackedTotal = 0;
  let trackedCount = 0;

  for (const result of results) {
    const { id, players, fetchedAt, error } = result;
    items[id] = {
      players: Number.isFinite(players) ? Number(players) : null,
      fetchedAt: fetchedAt || null,
      error: error || null,
    };
    if (Number.isFinite(players)) {
      trackedTotal += players;
      trackedCount += 1;
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    trackedTotal,
    trackedCount,
    items,
    meta: metadata,
  };
}

export function emptySnapshot(metadata = {}) {
  return {
    updatedAt: new Date(0).toISOString(),
    trackedTotal: 0,
    trackedCount: 0,
    items: {},
    meta: metadata,
  };
}
