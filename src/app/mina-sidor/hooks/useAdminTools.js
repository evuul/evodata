
import { useState, useMemo, useEffect, useCallback } from "react";
import { fetchAuthJson } from "@/lib/clientApi";

const ADMIN_ACTIVITY_REFRESH_MS = 5 * 60 * 1000;
const ADMIN_USERS_REFRESH_MS = 5 * 60 * 1000;
const ADMIN_SUPPORT_REFRESH_MS = 60 * 60 * 1000;
const ADMIN_COST_REFRESH_MS = 5 * 60 * 1000;

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
  const [adminActivityGeoSummary, setAdminActivityGeoSummary] = useState(null);

  // Users
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [adminUsersError, setAdminUsersError] = useState("");
  const [adminUsersRows, setAdminUsersRows] = useState([]);
  const [adminUsersTotal, setAdminUsersTotal] = useState(0);
  const [adminPmDialogOpen, setAdminPmDialogOpen] = useState(false);
  const [adminPmRecipient, setAdminPmRecipient] = useState(null);
  const [adminPmToEmail, setAdminPmToEmail] = useState("");
  const [adminPmSubject, setAdminPmSubject] = useState("");
  const [adminPmMessage, setAdminPmMessage] = useState("");
  const [adminPmSending, setAdminPmSending] = useState(false);
  const [adminPmStatus, setAdminPmStatus] = useState("");

  // Support
  const [adminSupportLoading, setAdminSupportLoading] = useState(false);
  const [adminSupportError, setAdminSupportError] = useState("");
  const [adminSupportRows, setAdminSupportRows] = useState([]);
  const [adminSupportSelected, setAdminSupportSelected] = useState(null);
  const [adminSupportReply, setAdminSupportReply] = useState("");
  const [adminSupportDialogOpen, setAdminSupportDialogOpen] = useState(false);
  const [adminSupportReplyLoading, setAdminSupportReplyLoading] = useState(false);

  // Cost / Usage
  const [adminCostLoading, setAdminCostLoading] = useState(false);
  const [adminCostError, setAdminCostError] = useState("");
  const [adminCostData, setAdminCostData] = useState(null);

  // Alerts Settings
  const [alertsSettingsLoading, setAlertsSettingsLoading] = useState(false);
  const [alertsSettingsError, setAlertsSettingsError] = useState("");
  const [alertsTestOnlyAdmin, setAlertsTestOnlyAdmin] = useState(false);
  const [alertsAthEnabled, setAlertsAthEnabled] = useState(true);
  const [alertsDailyAvgEnabled, setAlertsDailyAvgEnabled] = useState(true);
  const authFetchJson = useCallback((input, init = {}) => fetchAuthJson(token, input, init), [token]);

  // --- Methods ---

  const handleAdminMailTest = async (profileIdentity, email) => {
    if (!token) return;
    try {
      setMailTestLoading(true);
      setMailTestMessage("");
      const payload = await authFetchJson("/api/admin/mail-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: profileIdentity?.email || email || "alexander.ek@live.se",
          subject: "EvoTracker admin mail test",
        }),
      });
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
      const payload = await authFetchJson(`/api/admin/mail-preview?type=${encodeURIComponent(type)}`, {
        method: "GET",
      });
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
      const payload = await authFetchJson("/api/admin/ath-preview", {
        method: "GET",
        cache: "no-store",
      });
      const liveEvents = Array.isArray(payload?.events) ? payload.events : [];
      const recipients = Array.isArray(payload?.recipients) ? payload.recipients : [];
      setMailTestMessage(
        translate(
          `ATH preview (live): ${liveEvents.length} event • ${recipients.length} mottagare.`,
          `ATH preview (live): ${liveEvents.length} event • ${recipients.length} recipients.`
        )
      );
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
      const payload = await authFetchJson("/api/admin/daily-avg-preview", {
        method: "GET",
        cache: "no-store",
      });
      setPreviewTitle(payload?.subject || "Daily AVG preview");
      setPreviewHtml(payload?.html || "");
      setPreviewOpen(true);
    } catch {
      setMailTestMessage(translate("Kunde inte hämta daily avg-preview.", "Could not load daily avg preview."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleAdminAthSendNow = async () => {
    if (!token) return;
    try {
      setMailTestLoading(true);
      setMailTestMessage("");
      const payload = await authFetchJson("/api/admin/ath-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      });
      const sent = Number(payload?.result?.sent || 0);
      const events = Array.isArray(payload?.result?.events) ? payload.result.events : [];
      const attempted = Array.isArray(payload?.result?.recipients) ? payload.result.recipients.length : 0;
      const errors = Array.isArray(payload?.result?.errors) ? payload.result.errors : [];
      const failed = errors.length;
      if (sent > 0) {
        setMailTestMessage(
          translate(
            `ATH skickat: ${sent}/${attempted || sent} mottagare • ${events.length} event • fel: ${failed}.`,
            `ATH sent: ${sent}/${attempted || sent} recipients • ${events.length} events • failed: ${failed}.`
          )
        );
        if (failed > 0) {
          const firstError = String(errors[0]?.error || "").trim();
          if (firstError) {
            setMailTestMessage((prev) => `${prev} ${translate(`Första fel: ${firstError}`, `First error: ${firstError}`)}`);
          }
        }
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
      setMailTestMessage(translate("Kunde inte skicka ATH.", "Could not send ATH."));
    } finally {
      setMailTestLoading(false);
    }
  };

  const handleAdminDailyAvgSendNow = async () => {
    if (!token) return;
    try {
      setMailTestLoading(true);
      setMailTestMessage("");
      const payload = await authFetchJson("/api/admin/daily-avg-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
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

  const loadAdminActivity = useCallback(async () => {
    if (!token) return;
    try {
      setAdminActivityLoading(true);
      setAdminActivityError("");
      const payload = await authFetchJson("/api/admin/activity", {
        method: "GET",
        cache: "no-store",
      });
      setAdminActivityRows(Array.isArray(payload?.users) ? payload.users : []);
      setAdminActivityGeoSummary(payload?.geoSummary || null);
    } catch {
      setAdminActivityRows([]);
      setAdminActivityGeoSummary(null);
      setAdminActivityError(translate("Kunde inte läsa aktivitet.", "Could not load activity."));
    } finally {
      setAdminActivityLoading(false);
    }
  }, [authFetchJson, token, translate]);

  const loadAdminUsers = useCallback(async () => {
    if (!token) return;
    try {
      setAdminUsersLoading(true);
      setAdminUsersError("");
      const payload = await authFetchJson("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });
      setAdminUsersRows(Array.isArray(payload?.users) ? payload.users : []);
      setAdminUsersTotal(Number(payload?.totalUsers) || 0);
    } catch {
      setAdminUsersRows([]);
      setAdminUsersTotal(0);
      setAdminUsersError(translate("Kunde inte läsa användare.", "Could not load users."));
    } finally {
      setAdminUsersLoading(false);
    }
  }, [authFetchJson, token, translate]);

  const applyAdminDonationTemplate = useCallback(() => {
    setAdminPmSubject(translate("Tack för din donation till EvoTracker", "Thank you for your donation to EvoTracker"));
    setAdminPmMessage(
      translate(
        "Hej!\n\nStort tack för din donation via Buy Me a Coffee. Ditt stöd hjälper mig att fortsätta förbättra EvoTracker med bättre data, nya funktioner och stabilare drift.\n\nOm du har idéer eller feedback får du gärna svara på detta meddelande.\n\nTack igen!\n\n/Alex",
        "Hi,\n\nThank you for your donation via Buy Me a Coffee. Your support helps me keep improving EvoTracker with better data, new features, and more reliable uptime.\n\nIf you have ideas or feedback, feel free to reply to this message.\n\nThanks again!\n\n/Alex"
      )
    );
  }, [translate]);

  const openAdminPmDialog = (row) => {
    const nextRecipient = row || null;
    const nextEmail = String(nextRecipient?.email || "").trim().toLowerCase();
    setAdminPmRecipient(nextRecipient);
    setAdminPmToEmail(nextEmail);
    applyAdminDonationTemplate();
    setAdminPmStatus("");
    setAdminPmDialogOpen(true);
  };

  const sendAdminPm = async () => {
    if (!token) return;
    const toEmail = String(adminPmToEmail || adminPmRecipient?.email || "").trim().toLowerCase();
    const subject = String(adminPmSubject || "").trim();
    const message = String(adminPmMessage || "").trim();
    if (!toEmail || !toEmail.includes("@")) {
      setAdminPmStatus(translate("Ange en giltig e-post.", "Enter a valid email."));
      return;
    }
    if (subject.length < 2 || message.length < 3) {
      setAdminPmStatus(translate("Skriv ämne och meddelande.", "Add subject and message."));
      return;
    }
    try {
      setAdminPmSending(true);
      setAdminPmStatus("");
      const payload = await authFetchJson("/api/admin/users/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail,
          subject,
          message,
        }),
      });
      setAdminPmStatus(
        translate(
          "Meddelande skickat.",
          "Message sent."
        )
      );
      await loadAdminUsers();
    } catch {
      setAdminPmStatus(translate("Kunde inte skicka meddelande.", "Could not send message."));
    } finally {
      setAdminPmSending(false);
    }
  };

  const loadAdminSupport = useCallback(async () => {
    if (!token) return;
    try {
      setAdminSupportLoading(true);
      setAdminSupportError("");
      const payload = await authFetchJson("/api/admin/support/tickets", {
        cache: "no-store",
      });
      setAdminSupportRows(Array.isArray(payload?.tickets) ? payload.tickets : []);
    } catch {
      setAdminSupportError(translate("Kunde inte ladda support.", "Could not load support."));
    } finally {
      setAdminSupportLoading(false);
    }
  }, [authFetchJson, token, translate]);

  const createDemoSupportTicket = async (mode) => {
    if (!token) return;
    try {
      setAdminSupportLoading(true);
      setAdminSupportError("");
      await authFetchJson("/api/admin/support/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
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
      const data = await authFetchJson(`/api/admin/support/tickets/${id}`, {
        cache: "no-store",
      });
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
      const data = await authFetchJson(`/api/admin/support/tickets/${adminSupportSelected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", message: msg }),
      });
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
      const data = await authFetchJson(`/api/admin/support/tickets/${adminSupportSelected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });
      setAdminSupportSelected(data?.ticket || null);
      await loadAdminSupport();
    } catch {
      setAdminSupportError(translate("Kunde inte stänga ticket.", "Could not close ticket."));
    } finally {
      setAdminSupportReplyLoading(false);
    }
  };

  const loadAlertsSettings = useCallback(async () => {
    if (!token) return;
    try {
      setAlertsSettingsLoading(true);
      setAlertsSettingsError("");
      const payload = await authFetchJson("/api/admin/alerts-settings", {
        method: "GET",
        cache: "no-store",
      });
      setAlertsTestOnlyAdmin(Boolean(payload?.settings?.testOnlyAdmin));
      setAlertsAthEnabled(Boolean(payload?.settings?.athEnabled));
      setAlertsDailyAvgEnabled(Boolean(payload?.settings?.dailyAvgEnabled));
    } catch {
      setAlertsSettingsError(translate("Kunde inte läsa settings.", "Could not load settings."));
    } finally {
      setAlertsSettingsLoading(false);
    }
  }, [authFetchJson, token, translate]);

  const loadAdminCost = useCallback(async () => {
    if (!token) return;
    try {
      setAdminCostLoading(true);
      setAdminCostError("");
      const payload = await authFetchJson("/api/admin/cost?hours=72", {
        method: "GET",
        cache: "no-store",
      });
      setAdminCostData(payload || null);
    } catch {
      setAdminCostData(null);
      setAdminCostError(translate("Kunde inte läsa kostnadsdata.", "Could not load cost data."));
    } finally {
      setAdminCostLoading(false);
    }
  }, [authFetchJson, token, translate]);

  const saveAlertsSettings = async (next) => {
    if (!token) return;
    try {
      setAlertsSettingsLoading(true);
      setAlertsSettingsError("");
      const payload = await authFetchJson("/api/admin/alerts-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
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
    const id = setInterval(load, ADMIN_ACTIVITY_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, loadAdminActivity, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "users") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminUsers();
    };
    load();
    const id = setInterval(load, ADMIN_USERS_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, loadAdminUsers, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "support") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminSupport();
    };
    load();
    const id = setInterval(load, ADMIN_SUPPORT_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, loadAdminSupport, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "tools") return;
    loadAlertsSettings();
  }, [adminMode, adminPanel, effectiveIsAdmin, loadAlertsSettings, token]);

  useEffect(() => {
    if (!effectiveIsAdmin || !adminMode || !token || adminPanel !== "cost") return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      await loadAdminCost();
    };
    load();
    const id = setInterval(load, ADMIN_COST_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [adminMode, adminPanel, effectiveIsAdmin, token, loadAdminCost]);

  return {
    adminMode, setAdminMode,
    adminPanel, setAdminPanel,
    mailTestLoading, mailTestMessage,
    previewLoading, previewOpen, setPreviewOpen, previewTitle, previewHtml,
    adminActivityLoading, adminActivityError, adminActivityRows, adminActivityGeoSummary, loadAdminActivity,
    adminUsersLoading, adminUsersError, adminUsersRows, adminUsersTotal, loadAdminUsers,
    adminPmDialogOpen, setAdminPmDialogOpen,
    adminPmRecipient,
    adminPmToEmail, setAdminPmToEmail,
    adminPmSubject, setAdminPmSubject,
    adminPmMessage, setAdminPmMessage,
    adminPmSending,
    adminPmStatus,
    openAdminPmDialog, sendAdminPm, applyAdminDonationTemplate,
    adminSupportLoading, adminSupportError, adminSupportRows, adminSupportSelected, 
    adminSupportReply, setAdminSupportReply, adminSupportDialogOpen, setAdminSupportDialogOpen, 
    adminSupportReplyLoading, loadAdminSupport, createDemoSupportTicket, openAdminSupportTicket, 
    saveAdminSupportReply, closeAdminSupportTicket,
    adminCostLoading, adminCostError, adminCostData, loadAdminCost,
    alertsSettingsLoading, alertsSettingsError, alertsTestOnlyAdmin, 
    alertsAthEnabled, alertsDailyAvgEnabled, saveAlertsSettings,
    
    // Actions exposed
    handleAdminMailTest,
    handleAdminMailPreview,
    handleAdminAthPreview,
    handleAdminAthSendNow,
    handleAdminDailyAvgPreview,
    handleAdminDailyAvgSendNow
  };
}
