"use client";

// Donation nudge visibility and dismissal persistence for the live header.

import { useCallback, useEffect, useState } from "react";

const DONATION_NUDGE_STORAGE_KEY = "evodata_donation_nudge_dismissed_v1";
const DONATION_NUDGE_TTL_MS = 24 * 60 * 60 * 1000;

export function useDonationNudge({ delayMs = 3200 } = {}) {
  const [showDonationNudge, setShowDonationNudge] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(DONATION_NUDGE_STORAGE_KEY) : null;
      if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && Date.now() - parsed < DONATION_NUDGE_TTL_MS) return undefined;
      }
    } catch {
      /* ignore storage errors */
    }

    const timerId = setTimeout(() => setShowDonationNudge(true), delayMs);
    return () => clearTimeout(timerId);
  }, [delayMs]);

  const handleDismissDonationNudge = useCallback(() => {
    setShowDonationNudge(false);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DONATION_NUDGE_STORAGE_KEY, String(Date.now()));
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return {
    showDonationNudge,
    setShowDonationNudge,
    handleDismissDonationNudge,
  };
}
