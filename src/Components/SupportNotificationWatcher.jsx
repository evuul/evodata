"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Snackbar } from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { useTranslate } from "@/context/LocaleContext";

const POLL_MS = 60 * 60 * 1000;
const PREVIEW_EVENT = "evodata.support.notify.preview";

const toMs = (value) => {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts) ? ts : 0;
};

const getNumberFromStorage = (key) => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(key);
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
};

const setNumberInStorage = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

export default function SupportNotificationWatcher() {
  const translate = useTranslate();
  const router = useRouter();
  const { token, isAuthenticated, initialized, user } = useAuth();
  const [snack, setSnack] = useState({ open: false, severity: "info", message: "", actionLabel: "" });

  const email = String(user?.email || "").trim().toLowerCase();
  const isAdmin = Boolean(user?.isAdmin);

  const userReplyStorageKey = useMemo(
    () => (email ? `evodata.support.lastSeenReplyAt:${email}` : ""),
    [email]
  );
  const adminTicketStorageKey = useMemo(
    () => (email ? `evodata.support.lastSeenAdminTicketCreatedAt:${email}` : ""),
    [email]
  );

  const userBootstrappedRef = useRef(false);
  const adminBootstrappedRef = useRef(false);

  useEffect(() => {
    userBootstrappedRef.current = false;
    adminBootstrappedRef.current = false;
  }, [email, token, isAdmin]);

  useEffect(() => {
    if (!initialized || !isAuthenticated || !token || !email) return undefined;

    let cancelled = false;

    const notify = ({ message, severity = "info" }) => {
      setSnack({
        open: true,
        severity,
        message,
        actionLabel: translate("Öppna", "Open"),
      });
    };

    const checkUserReplies = async () => {
      const res = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = await res.json().catch(() => ({}));
      const tickets = Array.isArray(payload?.tickets) ? payload.tickets : [];
      const replied = tickets.filter((t) => Boolean(t?.hasReply) && String(t?.status || "").toLowerCase() === "answered");
      const latestReplyAt = replied.reduce((max, t) => Math.max(max, toMs(t?.updatedAt)), 0);

      let seenAt = getNumberFromStorage(userReplyStorageKey);
      const isFirstPoll = !userBootstrappedRef.current;
      if (isFirstPoll) {
        userBootstrappedRef.current = true;
        // Avoid firing old replies on first mount.
        if (!seenAt && latestReplyAt > 0) {
          setNumberInStorage(userReplyStorageKey, latestReplyAt);
          return;
        }
      }

      if (!latestReplyAt) return;

      if (latestReplyAt <= seenAt) return;

      const newCount = replied.filter((t) => toMs(t?.updatedAt) > seenAt).length || 1;
      seenAt = latestReplyAt;
      setNumberInStorage(userReplyStorageKey, seenAt);
      notify({
        severity: "success",
        message:
          newCount > 1
            ? translate(
                `Du har ${newCount} nya svar på dina supportärenden.`,
                `You have ${newCount} new replies to your support tickets.`
              )
            : translate("Du har fått ett nytt svar på din support ticket.", "You received a new reply on your support ticket."),
      });
    };

    const checkAdminNewTickets = async () => {
      if (!isAdmin) return;
      const res = await fetch("/api/admin/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const payload = await res.json().catch(() => ({}));
      const tickets = Array.isArray(payload?.tickets) ? payload.tickets : [];
      const openUnanswered = tickets.filter(
        (t) => String(t?.status || "").toLowerCase() === "open" && !Boolean(t?.hasReply)
      );
      const latestCreatedAt = openUnanswered.reduce((max, t) => Math.max(max, toMs(t?.createdAt)), 0);

      let seenCreatedAt = getNumberFromStorage(adminTicketStorageKey);
      const isFirstPoll = !adminBootstrappedRef.current;
      if (isFirstPoll) {
        adminBootstrappedRef.current = true;
        // Avoid firing historical open tickets on first mount.
        if (!seenCreatedAt && latestCreatedAt > 0) {
          setNumberInStorage(adminTicketStorageKey, latestCreatedAt);
          return;
        }
      }

      if (!latestCreatedAt) return;

      if (latestCreatedAt <= seenCreatedAt) return;

      const newCount = openUnanswered.filter((t) => toMs(t?.createdAt) > seenCreatedAt).length || 1;
      seenCreatedAt = latestCreatedAt;
      setNumberInStorage(adminTicketStorageKey, seenCreatedAt);
      notify({
        severity: "info",
        message:
          newCount > 1
            ? translate(
                `Det kom in ${newCount} nya supportärenden.`,
                `${newCount} new support tickets came in.`
              )
            : translate("Nytt supportärende inkom.", "A new support ticket was received."),
      });
    };

    const run = async () => {
      try {
        await Promise.all([checkUserReplies(), checkAdminNewTickets()]);
      } catch {
        // silent background notifier
      }
    };

    run();
    const id = window.setInterval(() => {
      if (!cancelled) run();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    adminTicketStorageKey,
    email,
    initialized,
    isAdmin,
    isAuthenticated,
    token,
    translate,
    userReplyStorageKey,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onPreview = (event) => {
      const type = String(event?.detail?.type || "").toLowerCase();
      if (type === "admin") {
        setSnack({
          open: true,
          severity: "info",
          message: translate("Nytt supportärende inkom.", "A new support ticket was received."),
          actionLabel: translate("Öppna", "Open"),
        });
        return;
      }
      if (type === "user") {
        setSnack({
          open: true,
          severity: "success",
          message: translate("Du har fått ett nytt svar på din support ticket.", "You received a new reply on your support ticket."),
          actionLabel: translate("Öppna", "Open"),
        });
      }
    };

    window.addEventListener(PREVIEW_EVENT, onPreview);
    return () => window.removeEventListener(PREVIEW_EVENT, onPreview);
  }, [translate]);

  return (
    <Snackbar
      open={snack.open}
      autoHideDuration={7000}
      onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert
        severity={snack.severity}
        variant="filled"
        onClose={() => setSnack((prev) => ({ ...prev, open: false }))}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              setSnack((prev) => ({ ...prev, open: false }));
              router.push("/mina-sidor");
            }}
          >
            {snack.actionLabel}
          </Button>
        }
      >
        {snack.message}
      </Alert>
    </Snackbar>
  );
}
