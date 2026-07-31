// Lets verified Founders control whether they appear in the public directory.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUserKey, setJson } from "@/lib/authStore";
import {
  getRequestSessionToken,
  isTrustedSessionRequest,
  resolveUserFromToken,
} from "@/lib/authSession";
import { findFounderAccess } from "@/lib/founderAccess";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (data, status = 200) => NextResponse.json(data, {
  status,
  headers: { "Cache-Control": "no-store" },
});

export async function PUT(request) {
  if (!isTrustedSessionRequest(request)) return json({ error: "Forbidden" }, 403);
  const resolved = await resolveUserFromToken(getRequestSessionToken(request), { cache: false });
  if (!resolved) return json({ error: "Unauthorized" }, 401);

  const access = findFounderAccess(resolved.user?.email);
  if (!access) return json({ error: "Founder access required" }, 403);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (typeof payload?.visible !== "boolean") return json({ error: "Invalid request" }, 400);

  const user = resolved.user;
  user.founderPublic = payload.visible;
  user.updatedAt = new Date().toISOString();
  await setJson(getUserKey(user.email), user);
  revalidatePath("/founders");

  return json({ ok: true, founderPublic: user.founderPublic });
}
