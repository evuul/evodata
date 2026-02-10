"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Box, Button, Link, Stack, ToggleButton, ToggleButtonGroup, Typography, IconButton, Menu, MenuItem } from "@mui/material";
import Switch from "@mui/material/Switch";
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import { LOCALE_OPTIONS, useLocale } from "@/context/LocaleContext";
import { liveDot, text } from "./styles";
import { formatPercent, formatSek } from "./utils";

export default function MinaSidorHeader({
  translate,
  totalLivePlayers,
  onManageHoldings,
  onOpenPasswordDialog,
  onOpenSupport,
  supportIndicator,
  athEmailEnabled,
  dailyAvgEmailEnabled,
  notificationsSaving,
  onToggleAthEmail,
  onToggleDailyAvgEmail,
  greetingName,
  currentPrice,
  todaysChangePercent,
  isTraderMode,
  onToggleTraderMode,
}) {
  const { locale, setLocale } = useLocale();
  const todayColor = // eslint-disable-line no-unused-vars
    Number.isFinite(todaysChangePercent) && todaysChangePercent < 0 ? "#fecaca" : "#bbf7d0";

  // Notification Menu State
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const openNotif = Boolean(notifAnchorEl);
  const handleNotifClick = (event) => setNotifAnchorEl(event.currentTarget);
  const handleNotifClose = () => setNotifAnchorEl(null);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Top Row: Back to Start + Language Selector */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: { xs: 1.5, md: 3 },
        }}
      >
        <Link
          component={NextLink}
          href="/"
          underline="none"
          sx={{
            color: "rgba(125,211,252,0.95)",
            fontSize: "0.9rem",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.8,
            transition: "all 140ms ease",
            "&:hover": { color: "#e0f2fe", transform: "translateX(-2px)" },
          }}
        >
          <Box component="span" sx={{ display: "inline-flex", fontSize: "1.1rem" }}>
            ←
          </Box>
          {translate("Tillbaka till startsidan", "Back to start")}
        </Link>

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Notification Menu Button (Mobile & Desktop) */}
          <IconButton
            onClick={handleNotifClick}
            size="small"
            sx={{
              color: "rgba(226,232,240,0.75)",
              "&:hover": { color: "#fff", backgroundColor: "rgba(255,255,255,0.05)" }
            }}
          >
            <NotificationsRoundedIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={notifAnchorEl}
            open={openNotif}
            onClose={handleNotifClose}
            MenuListProps={{
              'aria-labelledby': 'notifications-button',
            }}
            PaperProps={{
              sx: {
                backgroundColor: "#1e293b",
                border: "1px solid rgba(148,163,184,0.15)",
                color: "#e2e8f0",
                mt: 1
              }
            }}
          >
            <MenuItem disableRipple sx={{ "&:hover": { backgroundColor: "transparent" }, cursor: "default" }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{ width: "100%", minWidth: 200 }}
              >
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {translate("Notis: Nytt ATH", "Notify: New ATH")}
                </Typography>
                <Switch
                  size="small"
                  checked={Boolean(athEmailEnabled)}
                  disabled={Boolean(notificationsSaving)}
                  onChange={(event) => onToggleAthEmail?.(Boolean(event.target.checked))}
                  sx={{
                    "& .MuiSwitch-thumb": { backgroundColor: "#f8fafc" },
                    "& .MuiSwitch-track": { backgroundColor: "rgba(148,163,184,0.25)" },
                    "& .Mui-checked + .MuiSwitch-track": { backgroundColor: "rgba(34,197,94,0.35)!important" },
                  }}
                />
              </Stack>
            </MenuItem>
            <MenuItem disableRipple sx={{ "&:hover": { backgroundColor: "transparent" }, cursor: "default" }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{ width: "100%" }}
              >
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {translate("Notis: Dagligt GAV", "Notify: Daily AVG")}
                </Typography>
                <Switch
                  size="small"
                  checked={Boolean(dailyAvgEmailEnabled)}
                  disabled={Boolean(notificationsSaving)}
                  onChange={(event) => onToggleDailyAvgEmail?.(Boolean(event.target.checked))}
                  sx={{
                    "& .MuiSwitch-thumb": { backgroundColor: "#f8fafc" },
                    "& .MuiSwitch-track": { backgroundColor: "rgba(148,163,184,0.25)" },
                    "& .Mui-checked + .MuiSwitch-track": { backgroundColor: "rgba(59,130,246,0.35)!important" },
                  }}
                />
              </Stack>
            </MenuItem>

            <MenuItem disableRipple sx={{ "&:hover": { backgroundColor: "transparent" }, cursor: "default", pt: 1.5, borderTop: "1px solid rgba(148,163,184,0.15)" }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="space-between"
                sx={{ width: "100%" }}
              >
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {translate("Trader vy (P/L)", "Trader view (P/L)")}
                </Typography>
                <Switch
                  size="small"
                  checked={Boolean(isTraderMode)}
                  onChange={(event) => onToggleTraderMode?.(Boolean(event.target.checked))}
                  sx={{
                    "& .MuiSwitch-thumb": { backgroundColor: "#f8fafc" },
                    "& .MuiSwitch-track": { backgroundColor: "rgba(148,163,184,0.25)" },
                    "& .Mui-checked + .MuiSwitch-track": { backgroundColor: "rgba(16,185,129,0.35)!important" },
                  }}
                />
              </Stack>
            </MenuItem>
          </Menu>

          <ToggleButtonGroup
            exclusive
            size="small"
            value={locale}
            onChange={(_, value) => value && setLocale(value)}
            sx={{
              backgroundColor: "rgba(15,23,42,0.45)",
              borderRadius: "999px",
              p: 0.3,
            }}
          >
            {LOCALE_OPTIONS.map((option) => (
              <ToggleButton
                key={option.value}
                value={option.value}
                sx={{
                  textTransform: "none",
                  border: 0,
                  borderRadius: "999px!important",
                  color: "rgba(226,232,240,0.75)",
                  fontSize: "0.75rem",
                  minHeight: 28,
                  px: 1.1,
                  "&.Mui-selected": {
                    color: "#0f172a",
                    backgroundColor: "#f8fafc",
                    fontWeight: 700,
                  },
                }}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {/* Main Content Area */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "flex-start" },
          justifyContent: "space-between",
          gap: { xs: 0.5, md: 4 }, // REDUCED GAP for mobile
        }}
      >
        {/* Left Column: Title, Greeting, Description, Actions */}
        <Stack spacing={1.5} sx={{ flex: "1 1 auto", width: "100%", maxWidth: { md: 720 } }}>
          <Box>
            {greetingName ? (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 1.25,
                  py: 0.45,
                  borderRadius: "999px",
                  border: "1px solid rgba(125,211,252,0.35)",
                  background:
                    "linear-gradient(135deg, rgba(56,189,248,0.16), rgba(59,130,246,0.14))",
                  boxShadow: "0 10px 24px rgba(14,116,144,0.2)",
                  width: "fit-content",
                  mb: 1
                }}
              >
                <Typography sx={{ color: "#dbeafe", fontWeight: 700, fontSize: { xs: "0.9rem", md: "0.95rem" } }}>
                  {translate(`Välkommen ${greetingName}`, `Welcome ${greetingName}`)}
                </Typography>
              </Box>
            ) : null}

            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: "1.75rem", md: "2.125rem" } }}>
              {translate("Dina innehav", "Your holdings")}
            </Typography>
          </Box>

          <Typography sx={{ color: text.body, maxWidth: 680, fontSize: { xs: "0.95rem", md: "1rem" }, lineHeight: 1.6 }}>
            {translate(
              "Samlad vy över ditt innehav, GAV, livevärde och kommande utdelningar.",
              "A consolidated view of your holdings, cost basis, live value, and upcoming dividends."
            )}
          </Typography>

          {/* Action Buttons */}
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={onManageHoldings}
              sx={{
                py: 1.2,
                fontWeight: 700,
                fontSize: "1rem",
                color: "#dbeafe",
                background: "linear-gradient(135deg, rgba(37,99,235,0.78), rgba(14,165,233,0.72))",
                border: "1px solid rgba(125,211,252,0.32)",
                boxShadow: "0 6px 16px rgba(14,116,144,0.18)",
                "&:hover": {
                  background: "linear-gradient(135deg, rgba(59,130,246,0.82), rgba(34,211,238,0.76))",
                  boxShadow: "0 8px 20px rgba(14,116,144,0.24)",
                },
                maxWidth: { xs: "100%", sm: 380, md: "fit-content" }
              }}
            >
              {translate("Hantera innehav", "Manage holdings")}
            </Button>

            <Stack
              direction="row"
              spacing={1.5}
              flexWrap="wrap"
              sx={{
                "& > button": { flex: { xs: "1 1 calc(50% - 12px)", sm: "0 1 auto" } } // fluid on mobile
              }}
            >
              <Button
                variant="outlined"
                onClick={onOpenSupport}
                sx={{
                  py: 1,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#e2e8f0",
                  borderColor: "rgba(148,163,184,0.35)",
                  position: "relative",
                  "&:hover": {
                    borderColor: "rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(148,163,184,0.08)",
                  },
                }}
              >
                {translate("Support", "Support")}
                {supportIndicator ? (
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      width: 8,
                      height: 8,
                      borderRadius: "999px",
                      backgroundColor: supportIndicator === "reply" ? "#34d399" : "#fde68a",
                      boxShadow:
                        supportIndicator === "reply"
                          ? "0 0 12px rgba(34,197,94,0.35)"
                          : "0 0 12px rgba(245,158,11,0.25)",
                      display: "inline-block",
                    }}
                  />
                ) : null}
              </Button>
              <Button
                variant="outlined"
                onClick={onOpenPasswordDialog}
                sx={{
                  py: 1,
                  px: 2,
                  textTransform: "none",
                  fontWeight: 700,
                  color: "#dbeafe",
                  borderColor: "rgba(125,211,252,0.35)",
                  "&:hover": {
                    borderColor: "rgba(125,211,252,0.65)",
                    backgroundColor: "rgba(56,189,248,0.08)",
                  },
                }}
              >
                {translate("Byt lösenord", "Change password")}
              </Button>
            </Stack>
          </Stack>
        </Stack>

        {/* Right Column: Live Data (Stacks below on mobile but positioned here for desktop) */}
        <Stack
          direction={{ xs: "column", md: "column" }}
          spacing={1.5}
          sx={{
            minWidth: 240,
            alignItems: { xs: "center", md: "flex-end" }, // Center on mobile, Right on Desktop
            justifyContent: { xs: "flex-start", md: "flex-start" },
            flexWrap: "wrap",
            mt: { xs: 1.5, md: 0 }, // REDUCED MT for mobile
            mb: { xs: 0.5, md: 0 }, // Reduced bottom margin on mobile
            width: { xs: "100%", md: "auto" },
            flexShrink: 0
          }}
        >
          {/* Centered Live Players - Increased Sizes */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: { xs: 1.5, md: 0 } }}>
            <Box sx={liveDot} />
            <Typography sx={{ color: text.subtle, fontSize: { xs: "0.95rem", md: "0.85rem" } }}>
              {translate("Live spelare", "Live players")}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: text.heading, fontSize: { xs: "1.5rem", md: "1.25rem" } }}>
              {totalLivePlayers != null ? totalLivePlayers.toLocaleString("sv-SE") : "–"}
            </Typography>
          </Stack>

          {/* Live Price & Today's Change - Increased Sizes */}
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            sx={{ justifyContent: { xs: "center", md: "flex-end" } }}
          >
            <Box
              sx={{
                px: 1.4,
                py: 0.65,
                borderRadius: "999px",
                border: "1px solid rgba(56,189,248,0.38)",
                background: "rgba(56,189,248,0.14)",
                color: "#e0f2fe",
                fontSize: { xs: "0.95rem", md: "0.82rem" },
                fontWeight: 700,
                mb: 0.5
              }}
            >
              {translate(`Livekurs: ${formatSek(currentPrice)}`, `Live price: ${formatSek(currentPrice)}`)}
            </Box>

            {Number.isFinite(todaysChangePercent) && (
              <Box
                sx={{
                  px: 1.4,
                  py: 0.65,
                  borderRadius: "999px",
                  border: "1px solid rgba(34,197,94,0.35)",
                  background:
                    todaysChangePercent < 0
                      ? "rgba(248,113,113,0.16)"
                      : "rgba(34,197,94,0.16)",
                  color: todayColor,
                  fontSize: { xs: "0.95rem", md: "0.82rem" },
                  fontWeight: 700,
                  mb: 0.5
                }}
              >
                {translate(
                  `Dagens rörelse: ${formatPercent(todaysChangePercent)}`,
                  `Today: ${formatPercent(todaysChangePercent)}`
                )}
              </Box>
            )}
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}
