import { NextResponse } from "next/server";
import {
  deleteKey,
  getJson,
  getSessionKey,
  getUserKey,
  removeUserFromIndex,
  setJson,
  verifyPassword,
} from "@/lib/authStore";

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

export async function PUT(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const firstName = String(payload?.firstName || "").trim();
  const lastName = String(payload?.lastName || "").trim();
  if (!firstName || !lastName) {
    return json({ error: "Ogiltigt namn." }, { status: 400 });
  }
  if (firstName.length > 80 || lastName.length > 80) {
    return json({ error: "Namnet är för långt." }, { status: 400 });
  }

  const user = resolved.user;
  user.firstName = firstName;
  user.lastName = lastName;
  user.updatedAt = new Date().toISOString();
  await setJson(getUserKey(user.email), user);

  return json({
    ok: true,
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSubscriber: Boolean(user.isSubscriber),
      isAdmin: Boolean(user.isAdmin),
      profile: user.profile ?? { shares: 0, avgCost: 0 },
    },
  });
}

export async function DELETE(request) {
  const token = getToken(request);
  const resolved = await resolveUserFromToken(token);
  if (!resolved) return json({ error: "Unauthorized" }, { status: 401 });

  let payload = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const currentPassword = String(payload?.currentPassword || "");
  const confirmation = String(payload?.confirmation || "").trim();
  const expectedConfirmation = String(resolved.user.email || "").toLowerCase();
  if (!currentPassword || !confirmation) {
    return json({ error: "Missing confirmation." }, { status: 400 });
  }
  if (confirmation.toLowerCase() !== expectedConfirmation) {
    return json({ error: "Fel bekräftelse." }, { status: 400 });
  }
  if (!verifyPassword(currentPassword, resolved.user.passwordHash)) {
    return json({ error: "Fel lösenord." }, { status: 400 });
  }

  const userEmail = String(resolved.user.email || "").toLowerCase();
  await deleteKey(getUserKey(userEmail));
  await deleteKey(getSessionKey(token));
  await removeUserFromIndex(userEmail);

  return json({ ok: true });
}

