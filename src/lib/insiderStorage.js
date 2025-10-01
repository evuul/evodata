import fs from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "src", "app", "data", "insiderTransactions.json");
const KV_KEY = "insiders:dataset:v1";

let kvClient = null;

async function getKvClient() {
  if (kvClient !== null) return kvClient;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const mod = await import("@vercel/kv");
      kvClient = mod.kv;
    } catch {
      kvClient = undefined;
    }
  } else {
    kvClient = undefined;
  }
  return kvClient;
}

const readFileFallback = async () => {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeFileFallback = async (data) => {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
};

export async function loadInsiderDataset() {
  const kv = await getKvClient();
  if (kv) {
    try {
      const stored = await kv.get(KV_KEY);
      if (!stored) return null;
      if (typeof stored === "string") return JSON.parse(stored);
      return stored;
    } catch {
      // fall back to file cache if kv read fails
    }
  }
  return readFileFallback();
}

export async function saveInsiderDataset(dataset) {
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.set(KV_KEY, JSON.stringify(dataset));
    } catch {
      // swallow and still persist to file fallback
    }
  }
  await writeFileFallback(dataset);
}

export async function clearInsiderDataset() {
  const kv = await getKvClient();
  if (kv) {
    try {
      await kv.del(KV_KEY);
    } catch {
      // ignore
    }
  }
  try {
    await fs.unlink(DATA_FILE);
  } catch {
    // ignore missing file
  }
}
