"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Dialog, Divider, Stack, TextField, Typography } from "@mui/material";
import { actionCard, buttonStyles, statusColors, text } from "./styles";

export default function SupportModal({ open, onClose, translate, token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const hasTickets = tickets.length > 0;

  const loadTickets = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/support/tickets", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setTickets(Array.isArray(data?.tickets) ? data.tickets : []);
    } catch (e) {
      setError(e?.message || translate("Kunde inte ladda tickets.", "Could not load tickets."));
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (id) => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/support/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSelected(data?.ticket || null);
    } catch (e) {
      setError(e?.message || translate("Kunde inte ladda ticket.", "Could not load ticket."));
    } finally {
      setLoading(false);
    }
  };

  const closeTicket = async (id) => {
    if (!token || !id) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "close" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSelected(data?.ticket || null);
      await loadTickets();
    } catch (e) {
      setError(e?.message || translate("Kunde inte stänga ticket.", "Could not close ticket."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelected(null);
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const createTicket = async () => {
    if (!token) return;
    const s = subject.trim();
    const m = message.trim();
    if (s.length < 3 || m.length < 5) {
      setError(translate("Skriv en rubrik och ett meddelande.", "Add a subject and a message."));
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: s, message: m }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setSubject("");
      setMessage("");
      await loadTickets();
    } catch (e) {
      setError(e?.message || translate("Kunde inte skapa ticket.", "Could not create ticket."));
    } finally {
      setLoading(false);
    }
  };

  const formatWhen = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("sv-SE");
  };

  const statusLabel = (s) => {
    if (s === "answered") return translate("Besvarad", "Answered");
    if (s === "closed") return translate("Stängd", "Closed");
    return translate("Öppen", "Open");
  };

  const statusColor = (s) => {
    if (s === "answered") return "#86efac";
    if (s === "closed") return "rgba(226,232,240,0.7)";
    return "#fde68a";
  };

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }, [tickets]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          background: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(148,163,184,0.2)",
        },
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} flexWrap="wrap">
            <Typography sx={{ color: text.heading, fontWeight: 900, fontSize: "1.1rem" }}>
              {translate("Support", "Support")}
            </Typography>
            <Button
              variant="outlined"
              onClick={loadTickets}
              disabled={loading}
              sx={{
                textTransform: "none",
                borderColor: "rgba(148,163,184,0.35)",
                color: "#e2e8f0",
                "&:hover": { borderColor: "rgba(148,163,184,0.6)", backgroundColor: "rgba(148,163,184,0.08)" },
              }}
            >
              {translate("Ladda om", "Refresh")}
            </Button>
          </Stack>

          {error ? <Typography sx={{ color: statusColors.warning, fontWeight: 700 }}>{error}</Typography> : null}

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.1fr 1.4fr" }, gap: 2 }}>
            <Box sx={{ ...actionCard, p: 2 }}>
              <Typography sx={{ color: text.subtle, fontWeight: 900, mb: 1 }}>
                {translate("Skapa ticket", "Create ticket")}
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label={translate("Rubrik", "Subject")}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  fullWidth
                  InputLabelProps={{ sx: { color: "rgba(226,232,240,0.75)" } }}
                  InputProps={{ sx: { color: text.heading } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "rgba(2,6,23,0.15)",
                      borderRadius: "12px",
                      "& fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                      "&:hover fieldset": { borderColor: "rgba(148,163,184,0.4)" },
                      "&.Mui-focused fieldset": { borderColor: "rgba(56,189,248,0.65)" },
                    },
                  }}
                />
                <TextField
                  label={translate("Meddelande", "Message")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  fullWidth
                  multiline
                  minRows={4}
                  InputLabelProps={{ sx: { color: "rgba(226,232,240,0.75)" } }}
                  InputProps={{ sx: { color: text.heading } }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "rgba(2,6,23,0.15)",
                      borderRadius: "12px",
                      "& fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                      "&:hover fieldset": { borderColor: "rgba(148,163,184,0.4)" },
                      "&.Mui-focused fieldset": { borderColor: "rgba(56,189,248,0.65)" },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  disabled={loading}
                  onClick={createTicket}
                  sx={{ ...buttonStyles.primary, width: "100%" }}
                >
                  {translate("Skicka", "Send")}
                </Button>
              </Stack>
            </Box>

            <Box sx={{ ...actionCard, p: 2 }}>
              <Typography sx={{ color: text.subtle, fontWeight: 900, mb: 1 }}>
                {translate("Dina tickets", "Your tickets")}
              </Typography>
              {!hasTickets && !loading ? (
                <Typography sx={{ color: "rgba(226,232,240,0.7)" }}>
                  {translate("Inga tickets ännu.", "No tickets yet.")}
                </Typography>
              ) : null}
              <Stack spacing={1}>
                {sortedTickets.map((t) => (
                  <Button
                    key={t.id}
                    variant="outlined"
                    onClick={() => loadTicketDetail(t.id)}
                    sx={{
                      textTransform: "none",
                      justifyContent: "space-between",
                      borderColor: "rgba(148,163,184,0.22)",
                      color: "#e2e8f0",
                      borderRadius: "12px",
                      "&:hover": { borderColor: "rgba(148,163,184,0.38)", backgroundColor: "rgba(148,163,184,0.06)" },
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.2, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                        {t.subject}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.65)", fontSize: "0.8rem" }}>
                        {translate("Uppdaterad", "Updated")}: {formatWhen(t.updatedAt)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 900, color: statusColor(t.status) }}>{statusLabel(t.status)}</Typography>
                  </Button>
                ))}
              </Stack>
            </Box>
          </Box>

          {selected ? (
            <>
              <Divider sx={{ borderColor: "rgba(148,163,184,0.18)" }} />
              <Box sx={{ ...actionCard, p: 2 }}>
                <Stack spacing={1}>
                  <Typography sx={{ color: text.heading, fontWeight: 900 }}>{selected.subject}</Typography>
                  <Typography sx={{ color: "rgba(226,232,240,0.7)", fontWeight: 700, fontSize: "0.85rem" }}>
                    {translate("Skapad", "Created")}: {formatWhen(selected.createdAt)}
                    {" • "}
                    {translate("Status", "Status")}:{" "}
                    <Box component="span" sx={{ color: statusColor(selected.status) }}>
                      {statusLabel(selected.status)}
                    </Box>
                  </Typography>
                  <Typography sx={{ color: "rgba(226,232,240,0.85)", whiteSpace: "pre-wrap" }}>
                    {selected.message}
                  </Typography>

                  {selected.adminReply?.message ? (
                    <Box
                      sx={{
                        mt: 1,
                        borderRadius: "12px",
                        border: "1px solid rgba(34,197,94,0.25)",
                        background: "rgba(34,197,94,0.08)",
                        p: 1.4,
                      }}
                    >
                      <Typography sx={{ color: "#bbf7d0", fontWeight: 900, mb: 0.5 }}>
                        {translate("Svar", "Reply")}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.85)", whiteSpace: "pre-wrap" }}>
                        {selected.adminReply.message}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.65)", fontSize: "0.8rem", mt: 0.6 }}>
                        {translate("Svarad", "Replied")}: {formatWhen(selected.adminReply.repliedAt)}
                      </Typography>
                    </Box>
                  ) : null}

                  {selected.status !== "closed" ? (
                    <Button
                      variant="outlined"
                      disabled={loading}
                      onClick={() => closeTicket(selected.id)}
                      sx={{
                        mt: 1,
                        alignSelf: "flex-start",
                        textTransform: "none",
                        fontWeight: 800,
                        borderColor: "rgba(148,163,184,0.32)",
                        color: "rgba(226,232,240,0.9)",
                        "&:hover": {
                          borderColor: "rgba(148,163,184,0.55)",
                          backgroundColor: "rgba(148,163,184,0.08)",
                        },
                      }}
                    >
                      {translate("Markera som löst", "Mark as resolved")}
                    </Button>
                  ) : (
                    <Typography sx={{ color: "rgba(226,232,240,0.65)", fontWeight: 700, fontSize: "0.85rem", mt: 0.5 }}>
                      {translate("Ticketen är stängd.", "This ticket is closed.")}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </>
          ) : null}
        </Stack>
      </Box>
    </Dialog>
  );
}
