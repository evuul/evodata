// Presents personal messages without duplicating the calendar and release roadmap.

import { useMemo, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";

const CATEGORY_STYLES = {
  message: { color: "#93c5fd", labelSv: "Meddelande", labelEn: "Message" },
};

export default function NotificationCenterCard({
  privateMessages = [],
  unreadCount = 0,
  locale,
  translate,
  onMarkRead,
  onDelete,
}) {
  const [showAll, setShowAll] = useState(false);
  const notifications = useMemo(() => {
    const seen = new Set();
    const messages = privateMessages.reduce((items, item) => {
      const title = item?.subject || translate("Meddelande från admin", "Message from admin");
      const description = item?.message || "—";
      const identity = String(item?.id || `${title}|${description}|${item?.createdAt || ""}`);
      if (seen.has(identity)) return items;
      seen.add(identity);
      items.push({
        id: `message-${identity}`,
        category: "message",
        title,
        description,
        date: item?.createdAt || null,
        unread: !item?.readAt,
      });
      return items;
    }, []);
    return messages.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [privateMessages, translate]);

  const visibleNotifications = showAll ? notifications : notifications.slice(0, 3);

  const formatDate = (value) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}/.test(String(value))) return value || "—";
    return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : "sv-SE");
  };

  return (
    <Box sx={{ mt: 1.4, borderRadius: "16px", border: "1px solid rgba(148,163,184,0.2)", background: "rgba(15,23,42,0.42)", p: { xs: 1.3, md: 1.8 } }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} gap={1}>
        <Box>
          <Typography sx={{ color: "#f8fafc", fontWeight: 850, fontSize: "1.05rem" }}>
            {translate("Notiscenter", "Notification center")}
          </Typography>
          <Typography sx={{ color: "rgba(226,232,240,0.6)", fontSize: "0.78rem" }}>
            {unreadCount > 0 ? translate(`${unreadCount} olästa · ${notifications.length} totalt`, `${unreadCount} unread · ${notifications.length} total`) : translate(`${notifications.length} meddelanden`, `${notifications.length} messages`)}
          </Typography>
        </Box>
        <Chip size="small" label={translate("Meddelanden", "Messages")} sx={{ alignSelf: { xs: "flex-start", sm: "center" }, color: "#93c5fd", bgcolor: "rgba(59,130,246,0.12)", fontWeight: 750 }} />
      </Stack>
      <Stack spacing={0.7} sx={{ mt: 1.2 }}>
        {visibleNotifications.length ? visibleNotifications.map((item) => {
          const style = CATEGORY_STYLES[item.category];
          return (
            <Box key={item.id} sx={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 1, alignItems: "start", p: 1, borderRadius: "10px", background: item.unread ? "rgba(37,99,235,0.13)" : "rgba(15,23,42,0.28)", border: "1px solid rgba(148,163,184,0.12)" }}>
              <Chip size="small" label={translate(style.labelSv, style.labelEn)} sx={{ color: style.color, background: `${style.color}18`, fontWeight: 700, height: 24 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: "#f8fafc", fontWeight: 750, fontSize: "0.88rem" }}>{item.title}</Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.68)", fontSize: "0.78rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</Typography>
              </Box>
              <Typography sx={{ color: "rgba(148,163,184,0.72)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{formatDate(item.date)}</Typography>
            </Box>
          );
        }) : <Typography sx={{ color: "rgba(226,232,240,0.58)", py: 1 }}>{translate("Inga meddelanden just nu.", "No messages right now.")}</Typography>}
      </Stack>
      {notifications.length > 3 ? (
        <Button size="small" onClick={() => setShowAll((current) => !current)} sx={{ mt: 0.7, px: 0, textTransform: "none", color: "#93c5fd", fontWeight: 750 }}>
          {showAll ? translate("Visa färre", "Show less") : translate(`Visa alla (${notifications.length})`, `View all (${notifications.length})`)}
        </Button>
      ) : null}
      {privateMessages.length ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          {unreadCount > 0 ? <Button size="small" onClick={onMarkRead} sx={{ textTransform: "none", color: "#bfdbfe" }}>{translate("Markera som lästa", "Mark as read")}</Button> : null}
          <Button size="small" onClick={onDelete} sx={{ textTransform: "none", color: "rgba(226,232,240,0.62)" }}>{translate("Ta bort meddelanden", "Delete messages")}</Button>
        </Stack>
      ) : null}
    </Box>
  );
}
