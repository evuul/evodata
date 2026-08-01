// Registers users and establishes a hardened browser session.

import { NextResponse } from "next/server";
import { addUserToIndex, createSession, deleteKey, getJson, getUserKey, hashPassword, setJson } from "@/lib/authStore";
import { logAuthError } from "@/lib/authDebug";
import { buildWelcomeEmail } from "@/lib/emailTemplates";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { isConfiguredAdminEmail } from "@/lib/adminAccess";
import { createRegisteredUser } from "@/lib/authUserFactory";
import { createAccountWithSession, runRegistrationAfterCommit } from "@/lib/registrationFlow";
import { buildSessionUser, isTrustedSessionRequest, setSessionCookie } from "@/lib/authSession";
import { checkAuthRateLimit, rateLimitResponseHeaders } from "@/lib/authRateLimit";
import { validatePassword } from "@/lib/passwordPolicy";
import { DEFAULT_SUPPORT_URL } from "@/lib/supportLinks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function POST(request) {
  if (!isTrustedSessionRequest(request)) {
    return json({ error: "Otillåten anropskälla." }, { status: 403 });
  }
  let stage = "parse-request";
  let emailDomain = null;

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
    emailDomain = email.includes("@") ? email.split("@").pop() : null;

    if (!email || !validatePassword(password).valid || !firstName || !lastName) {
      return json({ error: "Ogiltig registrering.", code: "INVALID_REGISTRATION" }, { status: 400 });
    }

    const rateLimit = await checkAuthRateLimit({ request, scope: "register", account: email });
    if (!rateLimit.allowed) {
      return json(
        { error: "För många registreringsförsök. Försök igen senare.", code: "REGISTRATION_RATE_LIMITED" },
        { status: 429, headers: rateLimitResponseHeaders(rateLimit) }
      );
    }

    stage = "check-existing-user";
    const existing = await getJson(getUserKey(email));
    if (existing) {
      return json({ error: "E-postadressen är redan registrerad.", code: "EMAIL_ALREADY_REGISTERED" }, { status: 409 });
    }

    stage = "prepare-user-record";
    const isAdmin = isConfiguredAdminEmail(email);
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const user = createRegisteredUser({
      email,
      firstName,
      lastName,
      passwordHash,
      isAdmin,
      now,
    });

    const sendWelcome = async () => {
      if (isMailerConfigured()) {
        const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || DEFAULT_SUPPORT_URL;
        const { subject, html } = buildWelcomeEmail({
          email,
          firstName,
          coffeeUrl,
        });
        await sendEmail({ toEmail: email, subject, html });
      }
    };

    stage = "create-account-session";
    const { token, session } = await createAccountWithSession({
      email,
      user,
      setJson,
      createSession,
      deleteKey,
      getUserKey,
    });

    stage = "post-registration";
    const postCommitResult = await runRegistrationAfterCommit({
      email,
      indexUser: addUserToIndex,
      sendWelcome,
    });
    if (postCommitResult.failures.length) {
      console.warn("Registration post-commit tasks failed", {
        emailDomain,
        indexed: postCommitResult.indexed,
        welcomeSent: postCommitResult.welcomeSent,
      });
    }

    const response = json({
      user: buildSessionUser(user),
      accessExpiresAt: session.expiresAt,
    });
    return setSessionCookie(response, token, session.expiresAt);
  } catch (error) {
    logAuthError({ route: "register", stage, error, context: { emailDomain } });
    return json(
      { error: "Registreringsservern svarar inte just nu. Försök igen om en stund.", code: "REGISTRATION_SERVICE_UNAVAILABLE" },
      { status: 500 }
    );
  }
}
