import { useCallback, useEffect, useState } from "react";
import { fetchAuthJson } from "@/lib/clientApi";

// Owns support status and private message polling for Mina sidor.
export function useMinaSidorInbox({ token, isAuthenticated, effectiveIsAdmin, translate }) {
  const [supportIndicator, setSupportIndicator] = useState(null); // null | "open" | "reply"
  const [privateMessages, setPrivateMessages] = useState([]);
  const [privateMessagesLoading, setPrivateMessagesLoading] = useState(false);
  const [privateMessagesError, setPrivateMessagesError] = useState("");
  const [privateMessagesUnread, setPrivateMessagesUnread] = useState(0);

  const loadSupportIndicator = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      if (effectiveIsAdmin) {
        const data = await fetchAuthJson(token, "/api/admin/support/tickets", {
          cache: "no-store",
        });
        const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
        const hasOpenUnanswered = tickets.some(
          (t) => String(t?.status || "").toLowerCase() === "open" && !Boolean(t?.hasReply)
        );
        setSupportIndicator(hasOpenUnanswered ? "open" : null);
        return;
      }

      const data = await fetchAuthJson(token, "/api/support/tickets", {
        cache: "no-store",
      });
      const tickets = Array.isArray(data?.tickets) ? data.tickets : [];
      const hasReply = tickets.some((t) => t?.hasReply && t?.status === "answered");
      const hasOpen = tickets.some((t) => t?.status === "open");
      setSupportIndicator(hasReply ? "reply" : hasOpen ? "open" : null);
    } catch {
      setSupportIndicator(null);
    }
  }, [effectiveIsAdmin, isAuthenticated, token]);

  const loadPrivateMessages = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setPrivateMessages([]);
      setPrivateMessagesUnread(0);
      return;
    }
    try {
      setPrivateMessagesLoading(true);
      setPrivateMessagesError("");
      const data = await fetchAuthJson(token, "/api/user/messages", {
        cache: "no-store",
      });
      const rows = Array.isArray(data?.messages) ? data.messages : [];
      const unreadCount = Number(data?.unreadCount) || 0;
      setPrivateMessages(rows);
      setPrivateMessagesUnread(unreadCount);

      if (unreadCount > 0) {
        const markData = await fetchAuthJson(token, "/api/user/messages", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "markRead" }),
        });
        setPrivateMessages(Array.isArray(markData?.messages) ? markData.messages : rows);
        setPrivateMessagesUnread(Number(markData?.unreadCount) || 0);
      }
    } catch {
      setPrivateMessages([]);
      setPrivateMessagesUnread(0);
      setPrivateMessagesError(translate("Kunde inte ladda PM.", "Could not load PM."));
    } finally {
      setPrivateMessagesLoading(false);
    }
  }, [isAuthenticated, token, translate]);

  const dismissPrivateMessages = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      const data = await fetchAuthJson(token, "/api/user/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      setPrivateMessages(Array.isArray(data?.messages) ? data.messages : []);
      setPrivateMessagesUnread(Number(data?.unreadCount) || 0);
    } catch {
      setPrivateMessagesError(translate("Kunde inte ta bort meddelanden.", "Could not delete messages."));
    }
  }, [isAuthenticated, token, translate]);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      setSupportIndicator(null);
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadSupportIndicator();
    };
    run();
    const id = setInterval(run, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isAuthenticated, loadSupportIndicator, token]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await loadPrivateMessages();
    };
    run();
    const id = setInterval(run, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
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
    dismissPrivateMessages,
  };
}
