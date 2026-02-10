"use client";

import NextLink from "next/link";
import { Box, Button, Link, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import Switch from "@mui/material/Switch";
import { LOCALE_OPTIONS, useLocale } from "@/context/LocaleContext";
import { liveDot, text } from "./styles";
import { formatPercent, formatSek } from "./utils";

export default function MinaSidorHeader({
  translate,
  totalLivePlayers,
  onManageHoldings,
  onOpenPasswordDialog,
  athEmailEnabled,
  dailyAvgEmailEnabled,
  notificationsSaving,
  onToggleAthEmail,
  onToggleDailyAvgEmail,
  greetingName,
  currentPrice,
  todaysChangePercent,
}) {
  const { locale, setLocale } = useLocale();
  const todayColor =
    Number.isFinite(todaysChangePercent) && todaysChangePercent < 0 ? "#fecaca" : "#bbf7d0";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 240, flex: "1 1 420px" }}>
        <Stack direction="row" spacing={0.8} alignItems="center" sx={{ color: text.muted }}>
          <Link
            component={NextLink}
            href="/"
            underline="none"
            sx={{
              color: "rgba(125,211,252,0.95)",
              fontSize: "0.82rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              transition: "all 140ms ease",
              "&:hover": { color: "#e0f2fe" },
            }}
          >
            <Box component="span" sx={{ display: "inline-flex", transform: "translateY(-0.5px)" }}>
              ←
            </Box>
            {translate("Hem", "Home")}
          </Link>
          <Typography sx={{ color: text.muted, fontSize: "0.8rem" }}>/</Typography>
          <Typography sx={{ color: text.muted, fontSize: "0.8rem", fontWeight: 600 }}>
            {translate("Min sida", "My page")}
          </Typography>
        </Stack>
        <Typography variant="overline" sx={{ color: text.overline, letterSpacing: 1.4 }}>
          {translate("Min sida", "My page")}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {translate("Dina innehav", "Your holdings")}
        </Typography>
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
              }}
            >
              <Typography sx={{ color: "#dbeafe", fontWeight: 700, fontSize: { xs: "0.9rem", md: "0.95rem" } }}>
                {translate(`Välkommen ${greetingName}`, `Welcome ${greetingName}`)}
              </Typography>
            </Box>
        ) : null}
        <Typography sx={{ color: text.body, maxWidth: 720 }}>
          {translate(
            "Samlad vy över ditt innehav, GAV, livevärde och kommande utdelningar.",
            "A consolidated view of your holdings, cost basis, live value, and upcoming dividends."
          )}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            onClick={onManageHoldings}
            sx={{
              fontWeight: 700,
              color: "#dbeafe",
              background: "linear-gradient(135deg, rgba(37,99,235,0.78), rgba(14,165,233,0.72))",
              border: "1px solid rgba(125,211,252,0.32)",
              boxShadow: "0 6px 16px rgba(14,116,144,0.18)",
              "&:hover": {
                background: "linear-gradient(135deg, rgba(59,130,246,0.82), rgba(34,211,238,0.76))",
                boxShadow: "0 8px 20px rgba(14,116,144,0.24)",
              },
            }}
          >
            {translate("Hantera innehav", "Manage holdings")}
          </Button>
          <Button
            variant="outlined"
            onClick={onOpenPasswordDialog}
            sx={{
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

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mt: 0.2, color: "rgba(226,232,240,0.75)" }}
        >
          <Typography sx={{ color: "rgba(226,232,240,0.75)", fontWeight: 700, fontSize: "0.92rem" }}>
            {translate("Mail vid nytt ATH", "Email on new ATH")}
          </Typography>
          <Switch
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

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: -0.2, color: "rgba(226,232,240,0.75)" }}>
          <Typography sx={{ color: "rgba(226,232,240,0.75)", fontWeight: 700, fontSize: "0.92rem" }}>
            {translate("Mail: Daily AVG", "Email: Daily AVG")}
          </Typography>
          <Switch
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
      </Stack>

      <Stack spacing={1.1} sx={{ alignItems: "flex-start", minWidth: 240 }}>
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

        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={liveDot} />
          <Typography sx={{ color: text.subtle }}>{translate("Live spelare", "Live players")}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: text.heading }}>
            {totalLivePlayers != null ? totalLivePlayers.toLocaleString("sv-SE") : "–"}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ justifyContent: "flex-start" }}>
          <Box
            sx={{
              px: 1.2,
              py: 0.55,
              borderRadius: "999px",
              border: "1px solid rgba(56,189,248,0.38)",
              background: "rgba(56,189,248,0.14)",
              color: "#e0f2fe",
              fontSize: "0.82rem",
              fontWeight: 700,
            }}
          >
            {translate(`Livekurs: ${formatSek(currentPrice)}`, `Live price: ${formatSek(currentPrice)}`)}
          </Box>
          {Number.isFinite(todaysChangePercent) && (
            <Box
              sx={{
                px: 1.2,
                py: 0.55,
                borderRadius: "999px",
                border: "1px solid rgba(34,197,94,0.35)",
                background:
                  todaysChangePercent < 0
                    ? "rgba(248,113,113,0.16)"
                    : "rgba(34,197,94,0.16)",
                color: todayColor,
                fontSize: "0.82rem",
                fontWeight: 700,
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
  );
}
