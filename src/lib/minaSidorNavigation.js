// Defines valid Mina sidor views and creates shareable view URLs.

export const DEFAULT_MINA_SIDOR_VIEW = "oversikt";
export const MINA_SIDOR_USER_VIEWS = ["oversikt", "transaktioner", "utdelning", "agande", "verktyg"];

export function normalizeMinaSidorView(value, { isAdmin = false, hasExtendedAccess = false } = {}) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (MINA_SIDOR_USER_VIEWS.includes(normalized)) return normalized;
  if (normalized === "extended" && hasExtendedAccess) return normalized;
  if (normalized === "admin" && isAdmin) return normalized;
  return DEFAULT_MINA_SIDOR_VIEW;
}

export function buildMinaSidorViewHref({ pathname = "/mina-sidor", search = "", view, isAdmin = false, hasExtendedAccess = false } = {}) {
  const params = new URLSearchParams(search);
  const normalizedView = normalizeMinaSidorView(view, { isAdmin, hasExtendedAccess });

  if (normalizedView === DEFAULT_MINA_SIDOR_VIEW) params.delete("vy");
  else params.set("vy", normalizedView);

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
