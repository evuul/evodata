import { NextResponse } from "next/server";
import { addUserToIndex, createSession, getJson, getUserKey, hashPassword, setJson, verifyPassword } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();
const DEMO_EMAIL = "demo@evotracker.org";
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD || "Demo12345!";

const buildDemoUser = ({ now, existing }) => ({
  email: DEMO_EMAIL,
  firstName: "Rich",
  lastName: "Man",
  passwordHash: hashPassword(DEMO_PASSWORD),
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

  let user = await getJson(getUserKey(email));
  if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
    const now = new Date().toISOString();
    user = buildDemoUser({ now, existing: user || null });
    await setJson(getUserKey(email), user);
    await addUserToIndex(email);
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json({ error: "Fel e-post eller lösenord." }, { status: 401 });
  }

  const isAdmin = email === ADMIN_EMAIL;
  if (Boolean(user.isAdmin) !== isAdmin) {
    user.isAdmin = isAdmin;
    user.updatedAt = new Date().toISOString();
    await setJson(getUserKey(email), user);
  }

  const { token } = await createSession(email);
  await addUserToIndex(email);

  return json({
    token,
    user: {
      email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      isSubscriber: Boolean(user.isSubscriber),
      isAdmin,
      profile: user.profile ?? { shares: 0, avgCost: 0 },
    },
  });
}
