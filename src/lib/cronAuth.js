// Shared bearer-token auth for cron-triggered API routes.

export function resolveCronSecret(...candidates) {
  for (const value of candidates) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

export function requireCronAuth(request, secret, missingSecretError) {
  if (!secret) {
    return {
      ok: false,
      status: 500,
      error: missingSecretError,
    };
  }

  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;
  if (authHeader !== expected) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  return { ok: true };
}
