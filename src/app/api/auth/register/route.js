import { NextResponse } from "next/server";
import { addUserToIndex, createSession, getJson, getUserKey, hashPassword, setJson } from "@/lib/authStore";
import { logAuthError } from "@/lib/authDebug";
import { buildWelcomeEmail } from "@/lib/emailTemplates";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { normalizePortfolioProfile } from "@/lib/portfolioProfile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

export async function POST(request) {
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
    const firstName = String(payload?.firstName || "").trim();
    const lastName = String(payload?.lastName || "").trim();

    if (!email || !password || password.length < 8 || !firstName || !lastName) {
      return json({ error: "Ogiltig registrering." }, { status: 400 });
    }

    stage = "check-existing-user";
    const existing = await getJson(getUserKey(email));
    if (existing) {
      return json({ error: "E-postadressen är redan registrerad." }, { status: 409 });
    }

    stage = "prepare-user-record";
    const isAdmin = email === ADMIN_EMAIL;
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const user = {
      email,
      firstName,
      lastName,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      isSubscriber: false,
      isAdmin,
      notifications: {
        athEmail: false,
      },
      profile: {
        shares: 0,
        avgCost: 0,
        acquisitionDate: null,
        lots: [],
        updatedAt: now,
      },
    };

    stage = "save-user";
    await setJson(getUserKey(email), user);

    stage = "index-user";
    await addUserToIndex(email);

    stage = "send-welcome-email";
    try {
      if (isMailerConfigured()) {
        const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
        const { subject, html } = buildWelcomeEmail({
          email,
          firstName,
          coffeeUrl,
        });
        await sendEmail({ toEmail: email, subject, html });
      }
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }

    stage = "create-session";
    const { token } = await createSession(email);

    return json({
      token,
      user: {
        email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSubscriber: user.isSubscriber,
        isAdmin,
        profile: normalizePortfolioProfile(user.profile),
      },
    });
  } catch (error) {
    logAuthError({ route: "register", stage, error });
    return json(
      { error: "Registreringsservern svarar inte just nu. Försök igen om en stund." },
      { status: 500 }
    );
  }
}
