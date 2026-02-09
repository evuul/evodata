import { NextResponse } from "next/server";
import { createSession, getJson, getUserKey, verifyPassword } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
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

  const user = await getJson(getUserKey(email));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json({ error: "Fel e-post eller lösenord." }, { status: 401 });
  }

  const { token } = await createSession(email);

  return json({
    token,
    user: {
      email,
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      isSubscriber: Boolean(user.isSubscriber),
      profile: user.profile ?? { shares: 0, avgCost: 0 },
    },
  });
}
