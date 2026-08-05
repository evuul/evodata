// Resolves private Founder account entitlements without exposing account emails publicly.

import { FOUNDERS } from "../app/data/founders.js";
import {
  EXTENDED_HISTORY_MAX_DAYS,
  STANDARD_HISTORY_MAX_DAYS,
} from "./historyRange.js";
import { FOUNDER_PROGRAM } from "../config/founderProgram.js";
import { isConfiguredAdminEmail } from "./adminAccess.js";
import { isSubscriberActive } from "./subscriberAccess.js";

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

export function findFounderAccess(email, records = FOUNDERS) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !Array.isArray(records)) return null;

  const record = records
    .filter((candidate) => candidate?.qualified === true)
    .slice(0, FOUNDER_PROGRAM.maximumFounders)
    .find(
      (candidate) =>
        normalizeEmail(candidate?.accountEmail) === normalizedEmail
    );
  if (!record) return null;

  return {
    id: String(record.id || "").trim(),
    recognizedAt: String(record.recognizedAt || "").trim() || null,
  };
}

export function isFounderEmail(email, records = FOUNDERS) {
  return Boolean(findFounderAccess(email, records));
}

export function hasExtendedDataAccess(user, records = FOUNDERS) {
  return (
    Boolean(user?.isAdmin || isSubscriberActive(user)) ||
    isConfiguredAdminEmail(user?.email) ||
    isFounderEmail(user?.email, records)
  );
}

export function normalizeHistoryDays(value, { hasExtendedAccess = false } = {}) {
  const parsed = Number(value);
  const fallback = 45;
  const maximum = hasExtendedAccess
    ? EXTENDED_HISTORY_MAX_DAYS
    : STANDARD_HISTORY_MAX_DAYS;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(7, Math.min(Math.floor(parsed), maximum));
}
