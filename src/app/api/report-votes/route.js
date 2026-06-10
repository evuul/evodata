import { NextResponse } from "next/server";
import { kvRestRequest } from "@/lib/kvClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

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
  const data = await kvRestRequest(`/get/${encodeURIComponent(key)}`, {}, {
    serviceName: "Report votes KV",
  });
  const value = Number(data.result ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function upstashIncrBy(key, amount) {
  const data = await kvRestRequest(`/incrby/${encodeURIComponent(key)}/${amount}`, {}, {
    serviceName: "Report votes KV",
  });
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
