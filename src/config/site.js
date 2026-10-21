// Public site identity and contact details shared by metadata and information pages.

export const CONTACT_EMAIL = "alexander.ek@live.se";
export const DEFAULT_SITE_URL = "https://evotracker.org";
export const SITE_DESCRIPTION = "Följ Evolution med lobbyaktivitet, spelartrender, finansiella rapporter, återköp och modellbaserade prognoser.";

export function resolveSiteUrl(candidate) {
  try {
    const url = new URL(candidate || DEFAULT_SITE_URL);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}
