import { NextResponse } from "next/server";
import { getJson, getSessionKey, getUserKey, setJson } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const getToken = (request) => {
  const auth = request.headers.get("authorization") || "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim();
};

const resolveUserFromToken = async (token) => {
  if (!token) return null;
  const session = await getJson(getSessionKey(token));
  if (!session?.email) return null;
  const user = await getJson(getUserKey(session.email));
  return user ? { user, email: session.email } : null;
};

export async function GET(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const { user } = resolved;
  return json({
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    isSubscriber: Boolean(user.isSubscriber),
    profile: user.profile ?? { shares: 0, avgCost: 0 },
  });
}

export async function PUT(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const { user } = resolved;
  const profile = user.profile ?? { shares: 0, avgCost: 0, acquisitionDate: null, lots: [] };
  const action = payload?.action;
  const shares = Number(payload?.shares ?? 0);
  const price = Number(payload?.price ?? 0);
  const buyDateRaw = typeof payload?.buyDate === "string" ? payload.buyDate.trim() : "";
  const normalizedBuyDate = buyDateRaw ? buyDateRaw.slice(0, 10) : null;
  const rawAcquisitionDate = payload?.acquisitionDate;
  const normalizedAcquisitionDate =
    typeof rawAcquisitionDate === "string" && rawAcquisitionDate.trim()
      ? rawAcquisitionDate.trim().slice(0, 10)
      : null;
  const lots = Array.isArray(profile.lots) ? profile.lots.filter((lot) => Number(lot?.shares) > 0) : [];

  const now = new Date().toISOString();

  if (action === "buy") {
    if (!(shares > 0) || !(price > 0)) {
      return json({ error: "Ogiltig köpdata." }, { status: 400 });
    }
    if (lots.length === 0 && profile.shares > 0) {
      lots.push({
        shares: profile.shares,
        price: profile.avgCost,
        date: profile.acquisitionDate ?? now.slice(0, 10),
      });
    }
    const totalCost = profile.avgCost * profile.shares + shares * price;
    const newShares = profile.shares + shares;
    profile.shares = newShares;
    profile.avgCost = newShares > 0 ? totalCost / newShares : 0;
    const lotDate = normalizedBuyDate ?? now.slice(0, 10);
    lots.push({
      shares,
      price,
      date: lotDate,
    });
    if (!profile.acquisitionDate || (typeof profile.acquisitionDate === "string" && lotDate < profile.acquisitionDate)) {
      profile.acquisitionDate = lotDate;
    }
  } else if (action === "sell") {
    if (!(shares > 0)) {
      return json({ error: "Ogiltig säljdata." }, { status: 400 });
    }
    const newShares = Math.max(profile.shares - shares, 0);
    let remainingToSell = shares;
    const sortedLots = [...lots].sort((a, b) => {
      const da = String(a?.date || "");
      const db = String(b?.date || "");
      return da.localeCompare(db);
    });
    const nextLots = [];
    sortedLots.forEach((lot) => {
      const lotShares = Number(lot?.shares ?? 0);
      if (!(lotShares > 0)) return;
      if (remainingToSell <= 0) {
        nextLots.push({ ...lot, shares: lotShares });
        return;
      }
      if (lotShares <= remainingToSell) {
        remainingToSell -= lotShares;
        return;
      }
      nextLots.push({ ...lot, shares: lotShares - remainingToSell });
      remainingToSell = 0;
    });
    profile.lots = nextLots;
    profile.shares = newShares;
    if (newShares === 0) {
      profile.avgCost = 0;
      profile.acquisitionDate = null;
      profile.lots = [];
    }
  } else if (action === "set") {
    const nextShares = Number(payload?.shares ?? profile.shares);
    const nextAvgCost = Number(payload?.avgCost ?? profile.avgCost);
    profile.shares = Number.isFinite(nextShares) && nextShares >= 0 ? nextShares : profile.shares;
    profile.avgCost = Number.isFinite(nextAvgCost) && nextAvgCost >= 0 ? nextAvgCost : profile.avgCost;
    profile.acquisitionDate = normalizedAcquisitionDate;
    if (profile.shares > 0) {
      profile.lots = [
        {
          shares: profile.shares,
          price: profile.avgCost,
          date: normalizedAcquisitionDate ?? now.slice(0, 10),
        },
      ];
    } else {
      profile.lots = [];
      profile.acquisitionDate = null;
    }
  } else if (action === "reset") {
    profile.shares = 0;
    profile.avgCost = 0;
    profile.acquisitionDate = null;
    profile.lots = [];
  } else {
    return json({ error: "Okänd åtgärd." }, { status: 400 });
  }

  if (action === "buy") {
    profile.lots = lots;
  }

  profile.updatedAt = now;
  user.profile = profile;
  user.updatedAt = now;

  await setJson(getUserKey(user.email), user);

  return json({
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    isSubscriber: Boolean(user.isSubscriber),
    profile,
  });
}
