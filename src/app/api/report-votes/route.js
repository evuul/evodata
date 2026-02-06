import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const UPSTASH_REST_URL = process.env.UPSTASH_REST_URL;
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REST_TOKEN;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });

const getKey = (id, type) => `reportVotes:${id}:${type}`;

async function upstashGetNumber(key) {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    throw new Error("Missing UPSTASH_REST_URL or UPSTASH_REST_TOKEN");
  }
  const res = await fetch(`${UPSTASH_REST_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash GET ${key} failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const value = Number(data.result ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function upstashIncrBy(key, amount) {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    throw new Error("Missing UPSTASH_REST_URL or UPSTASH_REST_TOKEN");
  }
  const res = await fetch(
    `${UPSTASH_REST_URL}/incrby/${encodeURIComponent(key)}/${amount}`,
    {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstash INCRBY ${key} failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const value = Number(data.result ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const [up, down] = await Promise.all([
      upstashGetNumber(getKey(id, "up")),
      upstashGetNumber(getKey(id, "down")),
    ]);
    return json({ id, up, down });
  } catch (error) {
    return json({ error: error.message ?? "Failed to load votes" }, { status: 500 });
  }
}

export async function POST(request) {
  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }
  const id = payload?.id;
  const type = payload?.type;
  if (!id || (type !== "up" && type !== "down")) {
    return json({ error: "Invalid payload" }, { status: 400 });
  }
  try {
    const value = await upstashIncrBy(getKey(id, type), 1);
    return json({ id, type, value });
  } catch (error) {
    return json({ error: error.message ?? "Failed to record vote" }, { status: 500 });
  }
}
