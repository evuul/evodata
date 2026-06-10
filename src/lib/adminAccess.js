// Central admin access rules derived from explicit environment configuration.

export function getConfiguredAdminEmail(env = process.env) {
  const value = String(env.ADMIN_EMAIL || "").trim().toLowerCase();
  return value || null;
}

export function isConfiguredAdminEmail(email, env = process.env) {
  const adminEmail = getConfiguredAdminEmail(env);
  if (!adminEmail) return false;

  const normalizedEmail = String(email || "").trim().toLowerCase();
  return normalizedEmail === adminEmail;
}
