// Owns cached support status and private-message state for Mina sidor.

import { useCallback, useEffect, useState } from "react";
import { inboxResourceClient } from "@/lib/inboxResourceClient";

const isPageVisible = () => typeof document === "undefined" || document.visibilityState !== "hidden";

export function useMinaSidorInbox({ token, identity, isAuthenticated, effectiveIsAdmin, translate }) {
  const [supportIndicator, setSupportIndicator] = useState(null); // null | "open" | "reply"
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateMessagesLoading, setPrivateMessagesLoading] = useState(false);
  const [privateMessagesError, setPrivateMessagesError] = useState("");
  const [privateMessagesUnread, setPrivateMessagesUnread] = useState(0);

  const loadSupportIndicator = useCallback(async ({ force = false } = {}) => {
    if (!token || !identity || !isAuthenticated) return;
    try {
      const data = await inboxResourceClient.loadSupport({
        identity,
        token,
        isAdmin: effectiveIsAdmin,
        force,
      });
      if (effectiveIsAdmin) {
        const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
        const hasOpenUnanswered = tickets.some(
          (t) => String(t?.status || "").toLowerCase() === "open" && !Boolean(t?.hasReply)
        );
        setSupportIndicator(hasOpenUnanswered ? "open" : null);
        return;
      }

      const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
      const hasReply = tickets.some((t) => t?.hasReply && t?.status === "answered");
      const hasOpen = tickets.some((t) => t?.status === "open");
      setSupportIndicator(hasReply ? "reply" : hasOpen ? "open" : null);
    } catch {
      setSupportIndicator(null);
    }
  }, [effectiveIsAdmin, identity, isAuthenticated, token]);

  const loadPrivateMessages = useCallback(async ({ force = false } = {}) => {
    if (!token || !identity || !isAuthenticated) {
      setPrivateMessages([]);
      setPrivateMessagesUnread(0);
      return;
    }
    try {
      setPrivateMessagesLoading(true);
      setPrivateMessagesError("");
      const data = await inboxResourceClient.loadMessages({ identity, token, force });
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      const unreadCount = Number(data?.unreadCount) || 0;
      setPrivateMessages(rows);
      setPrivateMessagesUnread(unreadCount);
    } catch {
      setPrivateMessages([]);
      setPrivateMessagesUnread(0);
      setPrivateMessagesError(translate("Kunde inte ladda PM.", "Could not load PM."));
    } finally {
      setPrivateMessagesLoading(false);
    }
  }, [identity, isAuthenticated, token, translate]);

  const markPrivateMessagesRead = useCallback(async () => {
    if (!token || !identity || !isAuthenticated || privateMessagesUnread <= 0) return;
    const ids = privateMessages.filter((item) => !item?.readAt).map((item) => item?.id).filter(Boolean);
    if (!ids.length) return;
    try {
      const data = await inboxResourceClient.markMessagesRead({ identity, token, ids });
      setPrivateMessages(Array.isArray(data?.messages) ? data.messages : privateMessages);
      setPrivateMessagesUnread(Number(data?.unreadCount) || 0);
    } catch {
      setPrivateMessagesError(translate("Kunde inte markera meddelanden som lästa.", "Could not mark messages as read."));
    }
  }, [identity, isAuthenticated, privateMessages, privateMessagesUnread, token, translate]);

  const dismissPrivateMessages = useCallback(async () => {
    if (!token || !identity || !isAuthenticated) return;
    try {
      const ids = privateMessages.map((item) => item?.id).filter(Boolean);
      const data = await inboxResourceClient.deleteMessages({ identity, token, ids });
      setPrivateMessages(Array.isArray(data?.messages) ? data.messages : []);
      setPrivateMessagesUnread(Number(data?.unreadCount) || 0);
    } catch {
      setPrivateMessagesError(translate("Kunde inte ta bort meddelanden.", "Could not delete messages."));
    }
  }, [identity, isAuthenticated, privateMessages, token, translate]);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      setSupportIndicator(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (cancelled || !isPageVisible()) return;
      await loadSupportIndicator();
    };
    run();
    const id = setInterval(run, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, [isAuthenticated, loadSupportIndicator, token]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled || !isPageVisible()) return;
      await loadPrivateMessages();
    };
    run();
    const id = setInterval(run, 30 * 60 * 1000);
    document.addEventListener("visibilitychange", run);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", run);
    };
  }, [isAuthenticated, loadPrivateMessages, token]);

  return {
    supportIndicator,
    privateMessages,
    privateMessagesLoading,
    privateMessagesError,
    privateMessagesUnread,
    loadSupportIndicator,
    loadPrivateMessages,
    markPrivateMessagesRead,
    dismissPrivateMessages,
  };
}
