import { NextResponse } from "next/server";
import { addUserToIndex, createSession, deleteKey, getJson, getUserKey, hashPassword, setJson } from "@/lib/authStore";
import { logAuthError } from "@/lib/authDebug";
import { buildWelcomeEmail } from "@/lib/emailTemplates";
import { isMailerConfigured, sendEmail } from "@/lib/mailer";
import { normalizePortfolioProfile } from "@/lib/portfolioProfile";
import { isConfiguredAdminEmail } from "@/lib/adminAccess";
import { createRegisteredUser } from "@/lib/authUserFactory";
import { createAccountWithSession, runRegistrationAfterCommit } from "@/lib/registrationFlow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const json = (data, init = {}) =>
  NextResponse.json(data, {
    status: init.status ?? 200,
    headers: { "Cache-Control": "no-store", ...(init.headers || {}) },
  });

export async function POST(request) {
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

    if (!email || !password || password.length < 8 || !firstName || !lastName) {
      return json({ error: "Ogiltig registrering." }, { status: 400 });
    }

    stage = "check-existing-user";
    const existing = await getJson(getUserKey(email));
    if (existing) {
      return json({ error: "E-postadressen är redan registrerad." }, { status: 409 });
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
        const coffeeUrl = process.env.DONATE_BUYMEACOFFEE_URL || "https://buymeacoffee.com/evuul";
        const { subject, html } = buildWelcomeEmail({
          email,
          firstName,
          coffeeUrl,
        });
        await sendEmail({ toEmail: email, subject, html });
      }
    };

    stage = "create-account-session";
    const { token } = await createAccountWithSession({
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
    logAuthError({ route: "register", stage, error, context: { emailDomain } });
    return json(
      { error: "Registreringsservern svarar inte just nu. Försök igen om en stund." },
      { status: 500 }
    );
  }
}
