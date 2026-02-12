"use client";

import { Box, Button, Dialog, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";

export function AdminSupportInboxDialog({
  open,
  onClose,
  translate,
  locale,
  loading,
  error,
  rows,
  onRefresh,
  onOpenTicket,
}) {
  const statusLabel = (status) => {
    if (status === "answered") return translate("Besvarad", "Answered");
    if (status === "closed") return translate("Stängd", "Closed");
    return translate("Öppen", "Open");
  };

  const statusColor = (status) => {
    if (status === "answered") return "#86efac";
    if (status === "closed") return "rgba(226,232,240,0.7)";
    return "#fde68a";
  };

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
      <DialogTitle sx={{ color: "#f8fafc", fontWeight: 900 }}>
        {translate("Support inbox", "Support inbox")}
      </DialogTitle>
      <DialogContent sx={{ pt: 0.5 }}>
        <Stack spacing={1.2}>
          <Stack direction="row" justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={onRefresh}
              disabled={loading}
              sx={{
                textTransform: "none",
                borderColor: "rgba(148,163,184,0.35)",
                color: "#e2e8f0",
                "&:hover": {
                  borderColor: "rgba(148,163,184,0.55)",
                  backgroundColor: "rgba(148,163,184,0.08)",
                },
              }}
            >
              {loading ? translate("Laddar...", "Loading...") : translate("Ladda om", "Refresh")}
            </Button>
          </Stack>

          {error ? (
            <Typography sx={{ color: "#fca5a5", fontWeight: 700, textAlign: "center" }}>{error}</Typography>
          ) : null}

          {rows?.length ? (
            <Stack spacing={1}>
              {rows.map((row) => {
                const name = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
                const email = String(row?.email || "").trim();
                const identity = name || (email ? email.split("@")[0] : "") || "unknown";
                const whenLabel = row?.updatedAt
                  ? new Date(row.updatedAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE")
                  : "—";
                return (
                  <Button
                    key={row?.id}
                    variant="outlined"
                    onClick={() => onOpenTicket?.(row?.id)}
                    sx={{
                      textTransform: "none",
                      justifyContent: "space-between",
                      borderColor: "rgba(148,163,184,0.22)",
                      color: "#e2e8f0",
                      borderRadius: "12px",
                      py: 1.1,
                      px: 1.4,
                      "&:hover": {
                        borderColor: "rgba(148,163,184,0.38)",
                        backgroundColor: "rgba(148,163,184,0.06)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.2, minWidth: 0 }}>
                      <Typography sx={{ color: "#f8fafc", fontWeight: 900 }}>
                        {row?.subject || translate("Support ticket", "Support ticket")}
                      </Typography>
                      <Typography sx={{ color: "rgba(226,232,240,0.65)", fontSize: "0.82rem" }}>
                        {identity}
                        {" • "}
                        {translate("Uppdaterad", "Updated")}: {whenLabel}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 900, color: statusColor(row?.status) }}>
                      {statusLabel(row?.status)}
                    </Typography>
                  </Button>
                );
              })}
            </Stack>
          ) : (
            <Typography sx={{ color: "rgba(226,232,240,0.7)", textAlign: "center" }}>
              {loading
                ? translate("Laddar support tickets...", "Loading support tickets...")
                : translate("Inga support tickets ännu.", "No support tickets yet.")}
            </Typography>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

