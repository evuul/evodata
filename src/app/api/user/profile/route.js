// Serves and updates the authenticated user's portfolio profile.

import { NextResponse } from "next/server";
import { getUserKey, setJson } from "@/lib/authStore";
import { normalizePortfolioProfile } from "@/lib/portfolioProfile";
import {
  buildEditableTransactionLedger,
  deletePortfolioTransaction,
  rebuildPortfolioFromTransactions,
  updatePortfolioTransaction,
} from "@/lib/portfolioTransactions";
import { getRequestSessionToken as getToken, resolveUserFromToken } from "@/lib/authSession";
import { normalizePlayerAlertPreferences } from "@/lib/playerAlertPreferences";
import { findFounderAccess } from "@/lib/founderAccess";
import { isSubscriberActive } from "@/lib/subscriberAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

const founderFields = (email) => {
  const access = findFounderAccess(email);
  return { isFounder: Boolean(access), founderSince: access?.recognizedAt ?? null };
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
    ok: true,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    isSubscriber: isSubscriberActive(user),
    isAdmin,
    ...founderFields(user.email),
    notifications: normalizePlayerAlertPreferences(user.notifications),
    profile: normalizePortfolioProfile(user.profile ?? { shares: 0, avgCost: 0 }),
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
  const profile = normalizePortfolioProfile(user.profile ?? { shares: 0, avgCost: 0, acquisitionDate: null, lots: [] });
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
  const transactions = buildEditableTransactionLedger(profile);
  const importedDividendTotalRaw = Number(payload?.dividendTotal);
  const importedDividendTotal =
    Number.isFinite(importedDividendTotalRaw) && importedDividendTotalRaw >= 0
      ? importedDividendTotalRaw
      : null;

  const now = new Date().toISOString();

  if (action === "buy" || action === "sell") {
    const date = action === "buy" ? normalizedBuyDate : normalizedSellDate;
    if (!(shares > 0) || !(price > 0) || !date) {
      return json({ error: action === "buy" ? "Ogiltig köpdata." : "Ogiltig säljdata." }, { status: 400 });
    }
    const rebuilt = rebuildPortfolioFromTransactions([
      ...transactions,
      { type: action, shares, price, date, fee: 0, sourceOrder: transactions.length },
    ]);
    if (!rebuilt.ok) return json({ error: rebuilt.error }, { status: 400 });
    Object.assign(profile, rebuilt.profile);
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
    if (!incoming.length && importedDividendTotal == null) {
      return json({ error: "Ingen transaktionsdata hittades." }, { status: 400 });
    }
    if (!incoming.length && importedDividendTotal != null) {
      profile.importedDividendTotal = importedDividendTotal;
      profile.updatedAt = now;
      user.profile = profile;
      user.updatedAt = now;
      await setJson(getUserKey(user.email), user);
      return json({
        ok: true,
        email: user.email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        isSubscriber: isSubscriberActive(user),
        isAdmin: Boolean(user.isAdmin),
        ...founderFields(user.email),
        notifications: normalizePlayerAlertPreferences(user.notifications),
        profile,
      });
    }

    const rebuilt = rebuildPortfolioFromTransactions(incoming);
    if (!rebuilt.ok) return json({ error: rebuilt.error }, { status: 400 });
    Object.assign(profile, rebuilt.profile);
    if (importedDividendTotal != null) {
      profile.importedDividendTotal = importedDividendTotal;
    }
  } else if (action === "updateTransaction") {
    const rebuilt = updatePortfolioTransaction(transactions, payload?.transactionId, payload?.changes);
    if (!rebuilt.ok) return json({ error: rebuilt.error }, { status: 400 });
    Object.assign(profile, rebuilt.profile);
  } else if (action === "deleteTransaction") {
    const rebuilt = deletePortfolioTransaction(transactions, payload?.transactionId);
    if (!rebuilt.ok) return json({ error: rebuilt.error }, { status: 400 });
    Object.assign(profile, rebuilt.profile);
  } else {
    return json({ error: "Okänd åtgärd." }, { status: 400 });
  }

  profile.updatedAt = now;
  const normalizedProfile = normalizePortfolioProfile(profile);
  user.profile = normalizedProfile;
  user.updatedAt = now;

  await setJson(getUserKey(user.email), user);

  return json({
    ok: true,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
      isSubscriber: isSubscriberActive(user),
    isAdmin: Boolean(user.isAdmin),
    ...founderFields(user.email),
    notifications: normalizePlayerAlertPreferences(user.notifications),
    profile: normalizedProfile,
  });
}
