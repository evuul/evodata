// Normalizes the authenticated session payload used to initialize Mina sidor.

import { normalizePortfolioProfile } from "./portfolioProfile.js";
import { normalizePlayerAlertPreferences } from "./playerAlertPreferences.js";

export function buildPortfolioSessionState(user) {
  const source = user && typeof user === "object" ? user : {};
  return {
    identity: {
      firstName: String(source.firstName || ""),
      lastName: String(source.lastName || ""),
      email: String(source.email || ""),
    },
    profile: normalizePortfolioProfile(
      source.profile ?? { shares: 0, avgCost: 0, acquisitionDate: null, lots: [] }
    ),
    isAdmin: Boolean(source.isAdmin),
    isSubscriber: Boolean(source.isSubscriber),
    isFounder: Boolean(source.isFounder),
    founderSince: typeof source.founderSince === "string" ? source.founderSince : null,
    notifications: normalizePlayerAlertPreferences(source.notifications),
  };
}
