import { NextResponse } from "next/server";
import {
  buildSnapshotFromEntries,
  getLiveTop3Range,
  getLiveTop3Snapshot,
  saveLiveTop3Snapshot,
} from "@/lib/liveTop3Store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const SOURCE_URL = process.env.LIVE_TOP3_SOURCE_URL;
const ALLOW_DIRECT_FALLBACK = process.env.LIVE_TOP3_ALLOW_DIRECT_FALLBACK === "1";

function json(data, init = {}) {
  return NextResponse.json(data, {
    status: init.status ?? 200,
    headers: {
      "Cache-Control": "no-store",
      ...(init.headers || {}),
    },
  });
}

async function fetchFromSource() {
  if (!SOURCE_URL) {
    throw new Error("LIVE_TOP3_SOURCE_URL is not configured");
  }
  const res = await fetch(SOURCE_URL, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
      "User-Agent": "Mozilla/5.0",
    },
    cache: "no-store",
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    throw new Error(`CasinoScores HTTP ${res.status}`);
  }
  const data = await res.json();
  const snapshot = buildSnapshotFromEntries(data, { source: "live-feed" });
  if (!snapshot) {
    throw new Error("Upstream payload lacked valid entries");
  }
  return snapshot;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const historyDays = Number(searchParams.get("historyDays") ?? "0");
  const historyPerDay = Number(searchParams.get("historyPerDay") ?? "0");

  const historyPromise =
    Number.isFinite(historyDays) && historyDays > 0
      ? getLiveTop3Range(historyDays, historyPerDay)
      : Promise.resolve(null);

  const cached = await getLiveTop3Snapshot();
  if (cached) {
    const history = await historyPromise;
    return json({ ok: true, source: "kv", history, ...cached });
  }

  if (!ALLOW_DIRECT_FALLBACK) {
    return json(
      { ok: false, error: "No cached Live Top 3 data. Worker sync required." },
      { status: 503 }
    );
  }

  try {
    const snapshot = await fetchFromSource();
    await saveLiveTop3Snapshot(snapshot, { source: "live-feed" });
    const history = await historyPromise;
    return json({ ok: true, source: "live-feed", history, ...snapshot });
  } catch (error) {
    return json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
