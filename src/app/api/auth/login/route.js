// Authenticates users and provisions the explicitly configured demo account.

import { NextResponse } from "next/server";
import { addUserToIndex, createSession, getJson, getUserKey, hashPassword, setJson, verifyPasswordOrDummy } from "@/lib/authStore";
import { logAuthError } from "@/lib/authDebug";
import { isConfiguredAdminEmail } from "@/lib/adminAccess";
import { isDemoLogin, resolveDemoAccountConfig } from "@/lib/demoAccount";
import { buildSessionUser, isTrustedSessionRequest, setSessionCookie } from "@/lib/authSession";
import { checkAuthRateLimit, rateLimitResponseHeaders } from "@/lib/authRateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const demoAccount = resolveDemoAccountConfig();

const buildDemoUser = ({ now, existing }) => ({
  email: demoAccount.email,
  firstName: "Rich",
  lastName: "Man",
  passwordHash: hashPassword(demoAccount.password),
  createdAt: existing?.createdAt || now,
  updatedAt: now,
  isSubscriber: false,
  isAdmin: false,
  notifications: {
    athEmail: false,
    dailyAvgEmail: false,
  },
  profile: {
    shares: 10_000_000,
    avgCost: 118,
    acquisitionDate: "2017-01-01",
    lots: [
      {
        shares: 10_000_000,
        price: 118,
        date: "2017-01-01",
      },
    ],
    transactions: [],
    updatedAt: now,
  },
});

export async function POST(request) {
  if (!isTrustedSessionRequest(request)) {
    return json({ error: "Otillåten anropskälla." }, { status: 403 });
  }
  let stage = "parse-request";

  try {
    let payload = null;
    try {
      payload = await request.json();
    } catch {
      payload = null;
    }

    const email = String(payload?.email || "").trim().toLowerCase();
    const password = String(payload?.password || "");

    if (!email || !password) {
      return json({ error: "Ogiltig inloggning." }, { status: 400 });
    }

    const rateLimit = await checkAuthRateLimit({ request, scope: "login", account: email });
    if (!rateLimit.allowed) {
      return json(
        { error: "För många inloggningsförsök. Försök igen senare." },
        { status: 429, headers: rateLimitResponseHeaders(rateLimit) }
      );
    }

    stage = "read-user";
    let user = await getJson(getUserKey(email), { cache: false });
    if (isDemoLogin({ email, password }, demoAccount)) {
      stage = "seed-demo-user";
      const now = new Date().toISOString();
      user = buildDemoUser({ now, existing: user || null });
      await setJson(getUserKey(email), user);
      await addUserToIndex(email);
    }

    stage = "verify-password";
    const passwordMatches = verifyPasswordOrDummy(password, user?.passwordHash);
    if (!user || !passwordMatches) {
      return json({ error: "Fel e-post eller lösenord." }, { status: 401 });
    }

    stage = "sync-admin-flag";
    const isAdmin = isConfiguredAdminEmail(email);
    if (Boolean(user.isAdmin) !== isAdmin) {
      user.isAdmin = isAdmin;
      user.updatedAt = new Date().toISOString();
      await setJson(getUserKey(email), user);
    }

    stage = "create-session";
    const { token, session } = await createSession(email);
    stage = "sync-user-index";
    await addUserToIndex(email);

    const response = json({
      user: buildSessionUser(user),
      accessExpiresAt: session.expiresAt,
    });
    return setSessionCookie(response, token, session.expiresAt);
  } catch (error) {
    logAuthError({ route: "login", stage, error });
    return json(
      { error: "Inloggningsservern svarar inte just nu. Försök igen om en stund." },
      { status: 500 }
    );
  }
}
