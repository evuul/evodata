// Centralizes the primary administrator and optional environment-configured access.

export const PRIMARY_ADMIN_EMAIL = "alexander.ek@live.se";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export function getConfiguredAdminEmail(env = process.env) {
  const value = normalizeEmail(env.ADMIN_EMAIL);
  return value || null;
}

export function isPrimaryAdminEmail(email) {
  return normalizeEmail(email) === PRIMARY_ADMIN_EMAIL;
}

export function isConfiguredAdminEmail(email, env = process.env) {
  const adminEmail = getConfiguredAdminEmail(env);
  const normalizedEmail = normalizeEmail(email);
  return isPrimaryAdminEmail(normalizedEmail) || Boolean(adminEmail && normalizedEmail === adminEmail);
}
