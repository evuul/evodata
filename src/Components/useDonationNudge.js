"use client";

// Donation nudge visibility and dismissal persistence for the live header.

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_DONATION_NUDGE_DELAY_MS,
  isDonationNudgeDismissalFresh,
} from "@/lib/donationNudgePolicy";

const DONATION_NUDGE_STORAGE_KEY = "evodata_donation_nudge_dismissed_v1";

export function useDonationNudge({ delayMs = DEFAULT_DONATION_NUDGE_DELAY_MS } = {}) {
  const [showDonationNudge, setShowDonationNudge] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(DONATION_NUDGE_STORAGE_KEY) : null;
      if (isDonationNudgeDismissalFresh(raw)) return undefined;
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
