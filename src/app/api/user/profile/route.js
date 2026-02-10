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

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

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
  const isAdmin = String(user.email || "").toLowerCase() === ADMIN_EMAIL;
  return json({
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    isSubscriber: Boolean(user.isSubscriber),
    isAdmin,
    notifications: user.notifications ?? { athEmail: false, dailyAvgEmail: false },
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
  user.isAdmin = String(user.email || "").toLowerCase() === ADMIN_EMAIL;
  const profile = user.profile ?? { shares: 0, avgCost: 0, acquisitionDate: null, lots: [] };
  const action = payload?.action;
  const shares = Number(payload?.shares ?? 0);
  const price = Number(payload?.price ?? 0);
  const buyDateRaw = typeof payload?.buyDate === "string" ? payload.buyDate.trim() : "";
  const normalizedBuyDate = buyDateRaw ? buyDateRaw.slice(0, 10) : null;
  const sellDateRaw = typeof payload?.sellDate === "string" ? payload.sellDate.trim() : "";
  const normalizedSellDate = sellDateRaw ? sellDateRaw.slice(0, 10) : null;
  const rawAcquisitionDate = payload?.acquisitionDate;
  const normalizedAcquisitionDate =
    typeof rawAcquisitionDate === "string" && rawAcquisitionDate.trim()
      ? rawAcquisitionDate.trim().slice(0, 10)
      : null;
  const lots = Array.isArray(profile.lots) ? profile.lots.filter((lot) => Number(lot?.shares) > 0) : [];
  const transactions = Array.isArray(profile.transactions) ? profile.transactions : [];

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
    transactions.push({
      type: "buy",
      shares,
      price,
      date: lotDate,
      fee: 0,
    });
    if (!profile.acquisitionDate || (typeof profile.acquisitionDate === "string" && lotDate < profile.acquisitionDate)) {
      profile.acquisitionDate = lotDate;
    }
  } else if (action === "sell") {
    if (!(shares > 0) || !(price > 0)) {
      return json({ error: "Ogiltig säljdata." }, { status: 400 });
    }
    if (shares > profile.shares) {
      return json({ error: "Du försöker sälja fler aktier än du har." }, { status: 400 });
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
    transactions.push({
      type: "sell",
      shares,
      price,
      date: normalizedSellDate ?? now.slice(0, 10),
      fee: 0,
    });
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
      profile.transactions = [];
    } else {
      profile.lots = [];
      profile.acquisitionDate = null;
      profile.transactions = [];
    }
  } else if (action === "reset") {
    profile.shares = 0;
    profile.avgCost = 0;
    profile.acquisitionDate = null;
    profile.lots = [];
    profile.transactions = [];
  } else if (action === "importTransactions") {
    const incoming = Array.isArray(payload?.transactions) ? payload.transactions : [];
    if (!incoming.length) {
      return json({ error: "Ingen transaktionsdata hittades." }, { status: 400 });
    }
    if (incoming.length > 5000) {
      return json({ error: "För många transaktioner i importen (max 5000)." }, { status: 400 });
    }

    const normalized = incoming
      .map((t) => {
        const type = t?.type === "buy" || t?.type === "sell" ? t.type : null;
        const dateRaw = typeof t?.date === "string" ? t.date.trim().slice(0, 10) : "";
        const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
        const sharesNum = Math.abs(Math.round(Number(t?.shares)));
        const priceNum = Number(t?.price);
        const price = Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null;
        const feeNum = Number(t?.fee);
        const fee = Number.isFinite(feeNum) && feeNum > 0 ? feeNum : 0;
        if (!type || !date) return null;
        if (!(Number.isFinite(sharesNum) && sharesNum > 0)) return null;
        if (type === "buy" && price == null) return null;
        return { type, date, shares: sharesNum, price, fee };
      })
      .filter(Boolean)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!normalized.length) {
      return json({ error: "Kunde inte tolka transaktionerna." }, { status: 400 });
    }

    let computedShares = 0;
    let computedAvgCost = 0;
    let computedLots = [];

    for (const tx of normalized) {
      if (tx.type === "buy") {
        const unitPrice = (tx.shares * tx.price + (tx.fee || 0)) / tx.shares; // include brokerage in cost basis
        const totalCost = computedAvgCost * computedShares + tx.shares * unitPrice;
        computedShares += tx.shares;
        computedAvgCost = computedShares > 0 ? totalCost / computedShares : 0;
        computedLots.push({ shares: tx.shares, price: unitPrice, date: tx.date });
      } else {
        if (tx.shares > computedShares) {
          return json(
            {
              error:
                "Importen innehåller en säljrad som överskrider innehavet. Det beror oftast på att exporten saknar tidigare köp eller att du flyttat aktier mellan Avanza-konton (ÖVERFÖR I/U) och bara exporterat ett konto. Testa att exportera transaktioner för alla konton och hela perioden, eller sätt en baseline via 'Justera GAV' innan du importerar.",
            },
            { status: 400 }
          );
        }
        let remainingToSell = tx.shares;
        const nextLots = [];
        for (const lot of computedLots) {
          const lotShares = Number(lot?.shares ?? 0);
          if (!(lotShares > 0)) continue;
          if (remainingToSell <= 0) {
            nextLots.push({ ...lot, shares: lotShares });
            continue;
          }
          if (lotShares <= remainingToSell) {
            remainingToSell -= lotShares;
            continue;
          }
          nextLots.push({ ...lot, shares: lotShares - remainingToSell });
          remainingToSell = 0;
        }
        computedLots = nextLots;
        computedShares = Math.max(computedShares - tx.shares, 0);
        if (computedShares === 0) {
          computedAvgCost = 0;
          computedLots = [];
        }
      }
    }

    profile.shares = computedShares;
    profile.avgCost = computedAvgCost;
    profile.lots = computedLots;
    profile.acquisitionDate = computedLots.length ? String(computedLots[0].date || "").slice(0, 10) : null;
    profile.transactions = normalized;
  } else {
    return json({ error: "Okänd åtgärd." }, { status: 400 });
  }

  if (action === "buy") {
    profile.lots = lots;
  }
  if (action === "buy" || action === "sell") {
    profile.transactions = transactions.slice(-5000);
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
    isAdmin: Boolean(user.isAdmin),
    notifications: user.notifications ?? { athEmail: false, dailyAvgEmail: false },
    profile,
  });
}
