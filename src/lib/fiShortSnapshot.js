// Server-side snapshot cache for the FI short register.

import fs from "fs/promises";
import path from "path";
import { getKvClient } from "./kvClient.js";
import {
  EVO_LEI,
  fetchFiShortRegisterData,
  stockholmYmd,
} from "./fiShortRegister.js";

const FI_SHORT_SNAPSHOT_KV_KEY = "short:snapshot:v1";
const FI_SHORT_SNAPSHOT_FILE = path.join(process.cwd(), "src", "app", "data", "shortSnapshot.json");
export const FI_SHORT_SNAPSHOT_TTL_MS = 3 * 60 * 60 * 1000;

let inFlightSnapshotPromise = null;

export function isFreshShortSnapshot(snapshot, now = Date.now()) {
  if (!snapshot?.fetchedAt) return false;
  const fetchedAtMs = Date.parse(snapshot.fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) return false;
  return now - fetchedAtMs < FI_SHORT_SNAPSHOT_TTL_MS;
}

function normalizeShortSnapshot(data) {
  if (!data || typeof data !== "object") return null;

  const totalPercent = Number(data.totalPercent);
  const publicPercent = Number(data.publicPercent);
  const fetchedAt = typeof data.fetchedAt === "string" ? data.fetchedAt : null;
  const observedDate = typeof data.observedDate === "string" ? data.observedDate : null;

  return {
    lei: typeof data.lei === "string" ? data.lei : EVO_LEI,
    totalPercent: Number.isFinite(totalPercent) ? +totalPercent.toFixed(2) : null,
    publicPercent: Number.isFinite(publicPercent) ? +publicPercent.toFixed(2) : null,
    publicPositions: Array.isArray(data.publicPositions) ? data.publicPositions : [],
    observedDate,
    source: typeof data.source === "string" ? data.source : "Finansinspektionen",
    fetchedAt,
  };
}

async function readShortSnapshotFileFallback() {
  try {
    const raw = await fs.readFile(FI_SHORT_SNAPSHOT_FILE, "utf8");
    return normalizeShortSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function writeShortSnapshotFileFallback(snapshot) {
  try {
    await fs.mkdir(path.dirname(FI_SHORT_SNAPSHOT_FILE), { recursive: true });
    await fs.writeFile(FI_SHORT_SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), "utf8");
  } catch {}
}

export async function loadShortSnapshot() {
  const kv = await getKvClient();
  if (kv) {
    try {
      const stored = await kv.get(FI_SHORT_SNAPSHOT_KV_KEY);
      if (stored) {
        const normalized =
          typeof stored === "string" ? normalizeShortSnapshot(JSON.parse(stored)) : normalizeShortSnapshot(stored);
        if (normalized) return normalized;
      }
    } catch {}
  }

  return await readShortSnapshotFileFallback();
}

export async function saveShortSnapshot(snapshot) {
  const normalized = normalizeShortSnapshot(snapshot);
  if (!normalized) return null;

  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(FI_SHORT_SNAPSHOT_KV_KEY, JSON.stringify(normalized));
    } catch {}
  }
  await writeShortSnapshotFileFallback(normalized);
  return normalized;
}

export async function resolveFiShortSnapshot({ lei = EVO_LEI, force = false } = {}) {
  const cached = await loadShortSnapshot();
  if (!force && cached && cached.lei === lei && isFreshShortSnapshot(cached)) {
    return { ...cached, cached: true, stale: false };
  }

  if (inFlightSnapshotPromise) {
    return await inFlightSnapshotPromise;
  }

  inFlightSnapshotPromise = (async () => {
    try {
      const fresh = await fetchFiShortRegisterData(lei);
      const snapshot = await saveShortSnapshot({
        ...fresh,
        fetchedAt: new Date().toISOString(),
      });
      if (!snapshot) throw new Error("Could not persist FI short snapshot");
      return { ...snapshot, cached: false, stale: false };
    } catch (error) {
      if (cached && cached.lei === lei) {
        return { ...cached, cached: true, stale: true, error: error instanceof Error ? error.message : String(error) };
      }
      throw error;
    } finally {
      inFlightSnapshotPromise = null;
    }
  })();

  return await inFlightSnapshotPromise;
}

export { stockholmYmd };
