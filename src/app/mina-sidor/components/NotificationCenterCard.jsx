// Presents personal messages, upcoming reports, and game releases in one inbox-style view.

import { useMemo, useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";

const CATEGORY_STYLES = {
  message: { color: "#93c5fd", labelSv: "Meddelande", labelEn: "Message" },
  report: { color: "#c4b5fd", labelSv: "Rapport", labelEn: "Report" },
  release: { color: "#6ee7b7", labelSv: "Spelsläpp", labelEn: "Game release" },
};

export default function NotificationCenterCard({
  privateMessages = [],
  unreadCount = 0,
  calendarEvents = [],
  gameReleases = [],
  todayYmd,
  locale,
  translate,
  onMarkRead,
  onDelete,
}) {
  const [filter, setFilter] = useState("all");
  const notifications = useMemo(() => {
    const messages = privateMessages.map((item) => ({
      id: `message-${item?.id || item?.createdAt}`,
      category: "message",
      title: item?.subject || translate("Meddelande från admin", "Message from admin"),
      description: item?.message || "—",
      date: item?.createdAt || null,
      unread: !item?.readAt,
    }));
    const events = calendarEvents
      .filter((event) => event?.date >= todayYmd)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 4)
      .map((event) => ({
        id: `report-${event.id}`,
        category: "report",
        title: locale === "en" ? event.titleEn : event.titleSv,
        description: locale === "en" ? event.descriptionEn : event.descriptionSv,
        date: event.date,
        unread: false,
      }));
    const releases = gameReleases
      .filter((release) => !release.releaseDate || release.releaseDate >= todayYmd)
      .slice(0, 3)
      .map((release) => ({
        id: `release-${release.id}`,
        category: "release",
        title: release.title,
        description: locale === "en" ? release.descriptionEn : release.descriptionSv,
        date: release.releaseDate || release.releaseWindow,
        unread: false,
      }));
    return [...messages, ...events, ...releases].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [calendarEvents, gameReleases, locale, privateMessages, todayYmd, translate]);

  const visible = filter === "all" ? notifications : notifications.filter((item) => item.category === filter);
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
            {unreadCount > 0 ? translate(`${unreadCount} olästa meddelanden`, `${unreadCount} unread messages`) : translate("Allt är läst", "Everything is read")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
          {["all", "message", "report", "release"].map((value) => (
            <Button key={value} size="small" onClick={() => setFilter(value)} sx={{ minWidth: "auto", px: 1, py: 0.35, textTransform: "none", borderRadius: "999px", color: filter === value ? "#f8fafc" : "rgba(226,232,240,0.62)", background: filter === value ? "rgba(56,189,248,0.22)" : "transparent" }}>
              {value === "all" ? translate("Alla", "All") : translate(CATEGORY_STYLES[value].labelSv, CATEGORY_STYLES[value].labelEn)}
            </Button>
          ))}
        </Stack>
      </Stack>
      <Stack spacing={0.7} sx={{ mt: 1.2 }}>
        {visible.length ? visible.map((item) => {
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
        }) : <Typography sx={{ color: "rgba(226,232,240,0.58)", py: 1 }}>{translate("Inga notiser i den här kategorin.", "No notifications in this category.")}</Typography>}
      </Stack>
      {privateMessages.length ? (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          {unreadCount > 0 ? <Button size="small" onClick={onMarkRead} sx={{ textTransform: "none", color: "#bfdbfe" }}>{translate("Markera som lästa", "Mark as read")}</Button> : null}
          <Button size="small" onClick={onDelete} sx={{ textTransform: "none", color: "rgba(226,232,240,0.62)" }}>{translate("Ta bort meddelanden", "Delete messages")}</Button>
        </Stack>
      ) : null}
    </Box>
  );
}
