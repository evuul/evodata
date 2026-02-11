
import { useState, useMemo, useEffect } from "react";

export function useAdminTools({ token, effectiveIsAdmin, locale, translate }) {
  const [adminMode, setAdminMode] = useState(false);
  const [adminPanel, setAdminPanel] = useState("tools");
  
  // Mail Test & Preview
  const [mailTestLoading, setMailTestLoading] = useState(false);
  const [mailTestMessage, setMailTestMessage] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");

  // Activity
  const [adminActivityLoading, setAdminActivityLoading] = useState(false);
  const [adminActivityError, setAdminActivityError] = useState("");
  const [adminActivityRows, setAdminActivityRows] = useState([]);

  // Users
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState("");
  const [adminUsersRows, setAdminUsersRows] = useState([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);

  // Support
  const [adminSupportLoading, setAdminSupportLoading] = useState(false);
  const [adminSupportError, setAdminSupportError] = useState("");
  const [adminSupportRows, setAdminSupportRows] = useState([]);
  const [adminSupportSelected, setAdminSupportSelected] = useState(null);
  const [adminSupportReply, setAdminSupportReply] = useState("");
  const [adminSupportDialogOpen, setAdminSupportDialogOpen] = useState(false);
  const [adminSupportReplyLoading, setAdminSupportReplyLoading] = useState(false);

  // Alerts Settings
  const [alertsSettingsLoading, setAlertsSettingsLoading] = useState(false);
  const [alertsSettingsError, setAlertsSettingsError] = useState("");
  const [alertsTestOnlyAdmin, setAlertsTestOnlyAdmin] = useState(false);
  const [alertsAthEnabled, setAlertsAthEnabled] = useState(true);
  const [alertsDailyAvgEnabled, setAlertsDailyAvgEnabled] = useState(true);

  // --- Methods ---

  const handleAdminMailTest = async (profileIdentity, email) => {
    if (!token) return;
    try {
      setMailTestLoading(true);
      setMailTestMessage("");
      const res = await fetch("/api/admin/mail-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toEmail: profileIdentity?.email || email || "alexander.ek@live.se",
          subject: "EvoTracker admin mail test",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMailTestMessage(payload?.error || translate("Mailtest misslyckades.", "Mail test failed."));
        return;
      }
      setMailTestMessage(
        translate(
          `Testmail skickat till ${payload?.toEmail || "din adress"}.`,
          `Test email sent to ${payload?.toEmail || "your address"}.`
        )
      );
    } catch {
      setMailTestMessage(translate("Kunde inte skicka testmail.", "Could not send test email."));
    } finally {
      setMailTestLoading(false);
    }
  };

  const handleAdminMailPreview = async (type) => {
    if (!token) return;
    try {
      setPreviewLoading(true);
      setMailTestMessage("");
      const res = await fetch(`/api/admin/mail-preview?type=${encodeURIComponent(type)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMailTestMessage(payload?.error || translate("Kunde inte hämta preview.", "Could not load preview."));
        return;
      }
      setPreviewTitle(payload?.subject || (type === "reset" ? "Reset preview" : "Welcome preview"));
      setPreviewHtml(payload?.html || "");
      setPreviewOpen(true);
    } catch {
      setMailTestMessage(translate("Kunde inte hämta preview.", "Could not load preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAdminAthPreview = async () => {
    if (!token) return;
    try {
      setPreviewLoading(true);
      setMailTestMessage("");
      const res = await fetch("/api/admin/ath-preview", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMailTestMessage(payload?.error || translate("Kunde inte hämta ATH-preview.", "Could not load ATH preview."));
        return;
      }
      setPreviewTitle(payload?.subject || "ATH preview");
      setPreviewHtml(payload?.html || "");
      setPreviewOpen(true);
    } catch {
      setMailTestMessage(translate("Kunde inte hämta ATH-preview.", "Could not load ATH preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAdminDailyAvgPreview = async () => {
    if (!token) return;
    try {
      setPreviewLoading(true);
      setMailTestMessage("");
      const res = await fetch("/api/admin/daily-avg-preview", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMailTestMessage(
          payload?.error || translate("Kunde inte hämta daily avg-preview.", "Could not load daily avg preview.")
        );
        return;
      }
      setPreviewTitle(payload?.subject || "Daily AVG preview");
      setPreviewHtml(payload?.html || "");
      setPreviewOpen(true);
    } catch {
      setMailTestMessage(translate("Kunde inte hämta daily avg-preview.", "Could not load daily avg preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAdminDailyAvgSendNow = async () => {
    if (!token) return;
    try {
      setMailTestLoading(true);
      setMailTestMessage("");
      const res = await fetch("/api/admin/daily-avg-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ force: true }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMailTestMessage(payload?.error || translate("Kunde inte skicka daily AVG.", "Could not send daily AVG."));
        return;
      }
      const sent = Number(payload?.result?.sent || 0);
      const targetYmd = payload?.result?.targetYmd || "";
      if (sent > 0) {
        setMailTestMessage(
          translate(
            `Daily AVG utskickat till ${sent} mottagare${targetYmd ? ` (${targetYmd})` : ""}.`,
            `Daily AVG sent to ${sent} recipients${targetYmd ? ` (${targetYmd})` : ""}.`
          )
        );
      } else {
        const reason = payload?.result?.reason || "";
        setMailTestMessage(
          translate(
            `Inget skickades${reason ? `: ${reason}` : "."}`,
            `Nothing was sent${reason ? `: ${reason}` : "."}`
          )
        );
      }
    } catch {
      setMailTestMessage(translate("Kunde inte skicka daily AVG.", "Could not send daily AVG."));
    } finally {
      setMailTestLoading(false);
    }
  };

  const loadAdminActivity = async () => {
    if (!token) return;
    try {
      setAdminActivityLoading(true);
      setAdminActivityError("");
      const res = await fetch("/api/admin/activity", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminActivityRows([]);
        setAdminActivityError(payload?.error || translate("Kunde inte läsa aktivitet.", "Could not load activity."));
        return;
      }
      setAdminActivityRows(Array.isArray(payload?.users) ? payload.users : []);
    } catch {
      setAdminActivityRows([]);
      setAdminActivityError(translate("Kunde inte läsa aktivitet.", "Could not load activity."));
    } finally {
      setAdminActivityLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    if (!token) return;
    try {
      setAdminUsersLoading(true);
      setAdminUsersError("");
      const res = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminUsersRows([]);
        setAdminUsersTotal(0);
        setAdminUsersError(payload?.error || translate("Kunde inte läsa användare.", "Could not load users."));
        return;
      }
      setAdminUsersRows(Array.isArray(payload?.users) ? payload.users : []);
      setAdminUsersTotal(Number(payload?.totalUsers) || 0);
    } catch {
      setAdminUsersRows([]);
      setAdminUsersTotal(0);
      setAdminUsersError(translate("Kunde inte läsa användare.", "Could not load users."));
    } finally {
      setAdminUsersLoading(false);
    }
  };

  const loadAdminSupport = async () => {
    if (!token) return;
    try {
      setAdminSupportLoading(true);
      setAdminSupportError("");
      const res = await fetch("/api/admin/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminSupportError(data?.error || translate("Kunde inte ladda support.", "Could not load support."));
        return;
      }
      setAdminSupportRows(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch {
      setAdminSupportError(translate("Kunde inte ladda support.", "Could not load support."));
    } finally {
      setAdminSupportLoading(false);
    }
  };

  const createDemoSupportTicket = async (mode) => {
    if (!token) return;
    try {
      setAdminSupportLoading(true);
      setAdminSupportError("");
      const res = await fetch("/api/admin/support/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminSupportError(data?.error || translate("Kunde inte skapa demo-ticket.", "Could not create demo ticket."));
        return;
      }
      await loadAdminSupport();
    } catch {
      setAdminSupportError(translate("Kunde inte skapa demo-ticket.", "Could not create demo ticket."));
    } finally {
      setAdminSupportLoading(false);
    }
  };

  const openAdminSupportTicket = async (id) => {
    if (!token || !id) return;
    try {
      setAdminSupportReply("");
      setAdminSupportSelected(null);
      setAdminSupportDialogOpen(true);
      setAdminSupportReplyLoading(true);
      const res = await fetch(`/api/admin/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminSupportError(data?.error || translate("Kunde inte ladda ticket.", "Could not load ticket."));
        return;
      }
      setAdminSupportSelected(data?.ticket || null);
      setAdminSupportReply(String(data?.ticket?.adminReply?.message || ""));
    } catch {
      setAdminSupportError(translate("Kunde inte ladda ticket.", "Could not load ticket."));
    } finally {
      setAdminSupportReplyLoading(false);
    }
  };

  const saveAdminSupportReply = async () => {
    if (!token || !adminSupportSelected?.id) return;
    const msg = String(adminSupportReply || "").trim();
    if (msg.length < 3) {
      setAdminSupportError(translate("Skriv ett svar.", "Write a reply."));
      return;
    }
    try {
      setAdminSupportReplyLoading(true);
      setAdminSupportError("");
      const res = await fetch(`/api/admin/support/tickets/${adminSupportSelected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "reply", message: msg }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminSupportError(data?.error || translate("Kunde inte spara svar.", "Could not save reply."));
        return;
      }
      setAdminSupportSelected(data?.ticket || null);
      await loadAdminSupport();
    } catch {
      setAdminSupportError(translate("Kunde inte spara svar.", "Could not save reply."));
    } finally {
      setAdminSupportReplyLoading(false);
    }
  };

  const closeAdminSupportTicket = async () => {
    if (!token || !adminSupportSelected?.id) return;
    try {
      setAdminSupportReplyLoading(true);
      setAdminSupportError("");
      const res = await fetch(`/api/admin/support/tickets/${adminSupportSelected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "close" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAdminSupportError(data?.error || translate("Kunde inte stänga ticket.", "Could not close ticket."));
        return;
      }
      setAdminSupportSelected(data?.ticket || null);
      await loadAdminSupport();
    } catch {
      setAdminSupportError(translate("Kunde inte stänga ticket.", "Could not close ticket."));
    } finally {
      setAdminSupportReplyLoading(false);
    }
  };

  const loadAlertsSettings = async () => {
    if (!token) return;
    try {
      setAlertsSettingsLoading(true);
      setAlertsSettingsError("");
      const res = await fetch("/api/admin/alerts-settings", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlertsSettingsError(payload?.error || translate("Kunde inte läsa settings.", "Could not load settings."));
        return;
      }
      setAlertsTestOnlyAdmin(Boolean(payload?.settings?.testOnlyAdmin));
      setAlertsAthEnabled(Boolean(payload?.settings?.athEnabled));
      setAlertsDailyAvgEnabled(Boolean(payload?.settings?.dailyAvgEnabled));
    } catch {
      setAlertsSettingsError(translate("Kunde inte läsa settings.", "Could not load settings."));
    } finally {
      setAlertsSettingsLoading(false);
    }
  };

  const saveAlertsSettings = async (next) => {
    if (!token) return;
    try {
      setAlertsSettingsLoading(true);
      setAlertsSettingsError("");
      const res = await fetch("/api/admin/alerts-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(next),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlertsSettingsError(payload?.error || translate("Kunde inte spara settings.", "Could not save settings."));
        return;
      }
      setAlertsTestOnlyAdmin(Boolean(payload?.settings?.testOnlyAdmin));
      setAlertsAthEnabled(Boolean(payload?.settings?.athEnabled));
      setAlertsDailyAvgEnabled(Boolean(payload?.settings?.dailyAvgEnabled));
    } catch {
      setAlertsSettingsError(translate("Kunde inte spara settings.", "Could not save settings."));
    } finally {
      setAlertsSettingsLoading(false);
    }
  };

  // --- Effects ---

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "activity") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminActivity();
    };
    load();
    const id = setInterval(load, 20 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "users") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminUsers();
    };
    load();
    const id = setInterval(load, 20 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "support") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminSupport();
    };
    load();
    const id = setInterval(load, 30 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "tools") return;
    loadAlertsSettings();
  }, [adminMode, adminPanel, effectiveIsAdmin, token]);

  return {
    adminMode, setAdminMode,
    adminPanel, setAdminPanel,
    mailTestLoading, mailTestMessage,
    previewLoading, previewOpen, setPreviewOpen, previewTitle, previewHtml,
    adminActivityLoading, adminActivityError, adminActivityRows, loadAdminActivity,
    adminUsersLoading, adminUsersError, adminUsersRows, adminUsersTotal, loadAdminUsers,
    adminSupportLoading, adminSupportError, adminSupportRows, adminSupportSelected, 
    adminSupportReply, setAdminSupportReply, adminSupportDialogOpen, setAdminSupportDialogOpen, 
    adminSupportReplyLoading, loadAdminSupport, createDemoSupportTicket, openAdminSupportTicket, 
    saveAdminSupportReply, closeAdminSupportTicket,
    alertsSettingsLoading, alertsSettingsError, alertsTestOnlyAdmin, 
    alertsAthEnabled, alertsDailyAvgEnabled, saveAlertsSettings,
    
    // Actions exposed
    handleAdminMailTest,
    handleAdminMailPreview,
    handleAdminAthPreview,
    handleAdminDailyAvgPreview,
    handleAdminDailyAvgSendNow
  };
}
