"use client";

// Shared live overview cards and top-three showcase for the header hero section.

import React from "react";
import { Box, Chip, Grid, Stack, Typography } from "@mui/material";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import ArrowBackIosNew from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIos from "@mui/icons-material/ArrowForwardIos";

const LIVE_HEADER_OVERVIEW_CARDS = 4;

const cardShellSx = {
  background: "rgba(15,23,42,0.35)",
  borderRadius: "18px",
  p: { xs: 1.6, sm: 1.9 },
  border: "none",
  boxShadow: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 0.9,
  width: "100%",
  maxWidth: { xs: "none", md: 320 },
};

function HeaderMetricCard({ title, dotColor, children }) {
  return (
    <Box
      sx={{
        flex: { xs: "0 0 100%", md: "0 1 320px" },
        scrollSnapAlign: { xs: "start", md: "none" },
        scrollSnapStop: { xs: "always", md: "normal" },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={cardShellSx}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <Typography
            variant="overline"
            sx={{ color: "rgba(226,232,240,0.85)", letterSpacing: 1.4, fontWeight: 600 }}
          >
            {title}
          </Typography>
          <Box sx={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: dotColor }} />
        </Stack>
        {children}
      </Box>
    </Box>
  );
}

function CompactMetric({ label, value, detail, color = "#f8fafc" }) {
  return (
    <Box sx={{ minWidth: 0, px: { xs: 1.1, sm: 1.5 }, py: 1, borderRadius: "12px", background: "rgba(15,23,42,0.42)", border: "1px solid rgba(148,163,184,0.14)" }}>
      <Typography variant="caption" sx={{ display: "block", color: "rgba(148,163,184,0.76)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>
        {label}
      </Typography>
      <Typography sx={{ color, fontWeight: 800, fontSize: { xs: "0.94rem", sm: "1.05rem" }, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {value}
      </Typography>
      {detail ? <Typography variant="caption" sx={{ display: { xs: "none", sm: "block" }, color: "rgba(148,163,184,0.62)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</Typography> : null}
    </Box>
  );
}

function TopThreeMobileItem({ item, index, translate, formatTime }) {
  const playersLabel = item.stuck
    ? translate(
        `Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim(),
        `Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim()
      )
    : Number.isFinite(item.players)
    ? item.players.toLocaleString("sv-SE")
    : "—";
  const updatedLabel = item.updated ? formatTime(item.updated) : null;
  const displayLabel = item.label === "Monopoly Big Baller" ? "Big Baller" : item.label;
  const rankBg =
    index === 0
      ? "rgba(250,204,21,0.22)"
      : index === 1
      ? "rgba(148,163,184,0.22)"
      : "rgba(251,146,60,0.2)";

  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: "14px",
        px: 1.4,
        py: 1.2,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 1.2,
        background: "linear-gradient(135deg, rgba(15,23,42,0.66), rgba(30,41,59,0.66))",
        border: `1px solid ${item.color}33`,
      }}
    >
      <Box
        sx={{
          minWidth: 34,
          height: 34,
          borderRadius: "999px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.9rem",
          color: "#f8fafc",
          backgroundColor: rankBg,
          border: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        #{index + 1}
      </Box>
      <Stack spacing={0.15} sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: "#f8fafc",
            fontWeight: 700,
            fontSize: "0.96rem",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {displayLabel}
        </Typography>
        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)", lineHeight: 1.2 }}>
          {updatedLabel ? translate(`Senast ${updatedLabel}`, `Latest ${updatedLabel}`) : translate("Ingen tidsstämpel", "No timestamp")}
        </Typography>
      </Stack>
      <Typography
        sx={{
          color: item.stuck ? "#fbbf24" : item.color,
          fontWeight: 800,
          fontSize: "1rem",
          lineHeight: 1,
          letterSpacing: 0.2,
          whiteSpace: "nowrap",
        }}
      >
        {playersLabel}
      </Typography>
    </Box>
  );
}

function formatCompactSek(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mdkr`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} mkr`;
  }
  return `${value.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr`;
}

function formatMandateEur(value) {
  if (!Number.isFinite(value)) return "—";
  return `${(value / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} M€`;
}

function formatCompactShares(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} M`;
  if (abs >= 100_000) return `${Math.floor(value / 1_000).toLocaleString("sv-SE")} k`;
  return value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
}

export default function LiveHeaderOverviewSection({
  translate,
  isMobileMenu,
  playerDataAttentionLabel,
  mobileCardsRef,
  mobileCardIndex,
  scrollToCard,
  playersValue,
  playersUpdatedLabel,
  loadingPlayers,
  hourlyComparisonMeta,
  maintenanceWarningLabel,
  stuckLiveGamesCount,
  liveTrackerOffline,
  liveTrackerOfflineNote,
  priceDisplay,
  loadingPrice,
  changeColor,
  changeDisplay,
  ytdLabel,
  gainsLossLabel,
  stockUpdatedLabel,
  fmtCap,
  marketCap,
  marketStatusChip,
  buybackSummary,
  latestTopWinLabelWithEmoji,
  top3,
  formatTime,
  compact = false,
}) {
  const buybackUpdatedLabel = buybackSummary?.updatedAt ? formatTime(buybackSummary.updatedAt) : null;
  if (compact) {
    return (
      <Box
        aria-label={translate("Marknadsöversikt", "Market overview")}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
          gap: 0.8,
          maxWidth: 1180,
          width: "100%",
          alignSelf: "center",
          mx: "auto",
        }}
      >
        <CompactMetric
          label={translate("Live spelare", "Live players")}
          value={Number.isFinite(playersValue) ? playersValue.toLocaleString("sv-SE") : "—"}
          detail={playersUpdatedLabel ? translate(`Uppdaterad ${playersUpdatedLabel}`, `Updated ${playersUpdatedLabel}`) : null}
        />
        <CompactMetric
          label={translate("Aktiekurs", "Stock price")}
          value={loadingPrice ? "—" : priceDisplay}
          detail={changeDisplay}
          color={changeColor}
        />
        <CompactMetric
          label={translate("Marknadsvärde", "Market cap")}
          value={fmtCap(marketCap)}
          detail={marketStatusChip.label}
        />
        <CompactMetric
          label={translate("Återköpta aktier", "Shares repurchased")}
          value={formatCompactShares(buybackSummary?.sharesRepurchased)}
          detail={buybackSummary?.remainingLabel ? `${translate("Kvar", "Remaining")}: ${buybackSummary.remainingLabel}` : null}
        />
      </Box>
    );
  }
  return (
    <>
      {playerDataAttentionLabel ? (
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            mb: 0.8,
          }}
        >
          <Box
            role="status"
            aria-live="polite"
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "flex-start",
              maxWidth: 980,
              width: "100%",
              px: { xs: 1.2, sm: 2 },
              py: 1.1,
              borderRadius: "16px",
              border: "1px solid rgba(245,158,11,0.36)",
              background: "linear-gradient(135deg, rgba(120,53,15,0.35), rgba(30,41,59,0.28))",
              boxShadow: "0 12px 36px rgba(15,23,42,0.22)",
            }}
          >
            <WarningAmberRounded
              sx={{
                color: "#fbbf24",
                fontSize: 22,
                flexShrink: 0,
                mt: { xs: 0.1, sm: 0 },
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: "#fef3c7",
                fontWeight: 700,
                lineHeight: 1.55,
                textAlign: "left",
              }}
            >
              {playerDataAttentionLabel}
            </Typography>
          </Box>
        </Box>
      ) : null}

      <Box sx={{ position: "relative" }}>
        <Box
          ref={mobileCardsRef}
          sx={{
            width: "100%",
            maxWidth: { xs: "100%", lg: "1400px" },
            mx: "auto",
            display: "flex",
            flexDirection: { xs: "row", md: "row" },
            alignItems: { xs: "stretch", md: "stretch" },
            justifyContent: { xs: "flex-start", md: "space-between" },
            gap: { xs: 0, md: 2.8 },
            mt: { xs: 0.2, sm: 0.6 },
            px: { xs: 0, md: 0 },
            overflowX: { xs: "auto", md: "visible" },
            scrollSnapType: { xs: "x mandatory", md: "none" },
            scrollPaddingInline: { xs: 0, md: 0 },
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: { xs: "none", md: "auto" },
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <HeaderMetricCard
            title={translate("Live · spelare", "Live · players")}
            dotColor={liveTrackerOffline ? "#ef4444" : "#22c55e"}
          >
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "2.1rem", md: "2.5rem" },
                color: "#f8fafc",
              }}
            >
              {Number.isFinite(playersValue) ? playersValue.toLocaleString("sv-SE") : "—"}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {playersUpdatedLabel
                ? translate(`Senast ${playersUpdatedLabel}`, `Latest ${playersUpdatedLabel}`)
                : loadingPlayers
                ? translate("Hämtar live-data…", "Fetching live data…")
                : translate("Ingen uppdatering ännu", "No update yet")}
            </Typography>
            {hourlyComparisonMeta ? (
              <Typography variant="caption" sx={{ color: hourlyComparisonMeta.color }}>
                {hourlyComparisonMeta.text}
              </Typography>
            ) : null}
            {stuckLiveGamesCount > 0 ? (
              <Typography
                variant="caption"
                sx={{
                  color: "#fbbf24",
                  border: "1px solid rgba(251,191,36,0.35)",
                  backgroundColor: "rgba(120,53,15,0.2)",
                  borderRadius: "8px",
                  px: 1,
                  py: 0.4,
                  fontWeight: 600,
                }}
              >
                {translate(
                  `${stuckLiveGamesCount} spel döljs som stuck tills de uppdateras.`,
                  `${stuckLiveGamesCount} games are hidden as stuck until they update.`
                )}
              </Typography>
            ) : null}
            {maintenanceWarningLabel ? (
              <Typography
                variant="caption"
                sx={{
                  color: "#fecaca",
                  border: "1px solid rgba(248,113,113,0.4)",
                  backgroundColor: "rgba(127,29,29,0.28)",
                  borderRadius: "8px",
                  px: 1.1,
                  py: 0.45,
                  textAlign: "center",
                  fontWeight: 600,
                  letterSpacing: 0.2,
                }}
              >
                {maintenanceWarningLabel}
              </Typography>
            ) : null}
            {liveTrackerOffline ? (
              <Typography
                variant="caption"
                sx={{
                  color: "#fecaca",
                  border: "1px solid rgba(248,113,113,0.4)",
                  backgroundColor: "rgba(127,29,29,0.28)",
                  borderRadius: "8px",
                  px: 1.1,
                  py: 0.45,
                  fontWeight: 600,
                  letterSpacing: 0.2,
                }}
              >
                {translate("Live-tracker tillfälligt offline. Fix pågår.", liveTrackerOfflineNote)}
              </Typography>
            ) : null}
          </HeaderMetricCard>

          <HeaderMetricCard title={translate("Aktiekurs", "Stock price")} dotColor="#38bdf8">
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "2.1rem", md: "2.5rem" },
                color: "#f8fafc",
                whiteSpace: "nowrap",
              }}
            >
              {loadingPrice ? "—" : priceDisplay}
            </Typography>
            <Typography sx={{ color: changeColor, fontWeight: 700 }}>{changeDisplay}</Typography>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {ytdLabel || translate("YTD saknas", "YTD missing")}
              {gainsLossLabel ? ` · ${gainsLossLabel}` : ""}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
              {stockUpdatedLabel
                ? translate(`Uppdaterad ${stockUpdatedLabel}`, `Updated ${stockUpdatedLabel}`)
                : translate("Senaste kurs saknas", "Latest quote missing")}
            </Typography>
          </HeaderMetricCard>

          <HeaderMetricCard title={translate("Marknadsvärde", "Market cap")} dotColor="#c084fc">
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "2.1rem", md: "2.5rem" },
                color: "#f8fafc",
                whiteSpace: "nowrap",
              }}
            >
              {fmtCap(marketCap)}
            </Typography>
            <Typography sx={{ color: marketStatusChip.color, fontWeight: 700 }}>{marketStatusChip.label}</Typography>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
              {translate("Uppdateras tillsammans med kursdata.", "Updates alongside price data.")}
            </Typography>
          </HeaderMetricCard>

          <HeaderMetricCard title={translate("Återköp", "Buybacks")} dotColor="#34d399">
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: "2.1rem", md: "2.5rem" },
                color: "#f8fafc",
                whiteSpace: "nowrap",
              }}
            >
              {formatCompactShares(buybackSummary?.sharesRepurchased)}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Återköpta aktier", "Shares repurchased")}
            </Typography>
            <Stack direction="row" spacing={0.8} flexWrap="wrap" justifyContent="center" sx={{ mt: 0.2 }}>
              <Chip
                size="small"
                label={`${translate("Använt", "Used")}: ${buybackSummary?.usedLabel ?? formatCompactSek(buybackSummary?.usedSek)}`}
                sx={{
                  backgroundColor: "rgba(56,189,248,0.14)",
                  color: "#dbeafe",
                  borderRadius: "999px",
                  border: "1px solid rgba(56,189,248,0.28)",
                }}
              />
              <Chip
                size="small"
                label={`${translate("Kvar", "Remaining")}: ${buybackSummary?.remainingLabel ?? formatCompactSek(buybackSummary?.remainingSek)}`}
                sx={{
                  backgroundColor: "rgba(52,211,153,0.14)",
                  color: "#d1fae5",
                  borderRadius: "999px",
                  border: "1px solid rgba(52,211,153,0.28)",
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.6)" }}>
              {translate(
                `Mandat ${formatMandateEur(buybackSummary?.mandateEur)}${buybackUpdatedLabel ? ` · uppdaterat ${buybackUpdatedLabel}` : ""}`,
                `Mandate ${formatMandateEur(buybackSummary?.mandateEur)}${buybackUpdatedLabel ? ` · updated ${buybackUpdatedLabel}` : ""}`
              )}
            </Typography>
          </HeaderMetricCard>
        </Box>

        {isMobileMenu ? (
          <>
            <Stack direction="row" spacing={0.7} justifyContent="center" sx={{ mt: 1.1 }}>
              {Array.from({ length: LIVE_HEADER_OVERVIEW_CARDS }, (_, dot) => (
                <Box
                  key={dot}
                  sx={{
                    width: dot === mobileCardIndex ? 16 : 7,
                    height: 7,
                    borderRadius: "999px",
                    backgroundColor: dot === mobileCardIndex ? "rgba(56,189,248,0.9)" : "rgba(148,163,184,0.38)",
                    transition: "all 140ms ease",
                  }}
                />
              ))}
            </Stack>
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "999px",
                background: "rgba(15,23,42,0.7)",
                border: "1px solid rgba(148,163,184,0.35)",
                display: mobileCardIndex > 0 ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
              onClick={() => scrollToCard(Math.max(0, mobileCardIndex - 1))}
            >
              <ArrowBackIosNew sx={{ fontSize: "0.75rem" }} />
            </Box>
            <Box
              sx={{
                position: "absolute",
                right: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 28,
                height: 28,
                borderRadius: "999px",
                background: "rgba(15,23,42,0.7)",
                border: "1px solid rgba(148,163,184,0.35)",
                display: mobileCardIndex < LIVE_HEADER_OVERVIEW_CARDS - 1 ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
              onClick={() => scrollToCard(Math.min(LIVE_HEADER_OVERVIEW_CARDS - 1, mobileCardIndex + 1))}
            >
              <ArrowForwardIos sx={{ fontSize: "0.75rem" }} />
            </Box>
          </>
        ) : null}
      </Box>

      <Box
        sx={{
          background: "rgba(15,23,42,0.45)",
          borderRadius: "20px",
          p: { xs: 1.4, sm: 1.7 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: { xs: 0.8, sm: 1 },
          mt: { xs: -0.6, sm: -1, md: -1.3 },
        }}
      >
        <Chip
          size="small"
          label={latestTopWinLabelWithEmoji}
          sx={{
            background: "transparent",
            color: "#f1f5f9",
            border: "none",
            borderRadius: "999px",
            fontWeight: 600,
            px: 0,
            py: 0,
            height: "auto",
            maxWidth: "100%",
            "& .MuiChip-label": {
              whiteSpace: "normal",
              lineHeight: 1.35,
              textAlign: "center",
              fontSize: { xs: "0.92rem", sm: "1rem" },
              px: 0,
              py: 0,
            },
          }}
        />
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            fontSize: { xs: "1.8rem", sm: "2rem" },
            color: "#f8fafc",
            textAlign: "center",
          }}
        >
          {translate("Topp 3 liveshower just nu", "Top 3 live shows right now")}
        </Typography>
        {top3.length ? (
          isMobileMenu ? (
            <Stack spacing={1.1} sx={{ width: "100%", maxWidth: 640, mx: "auto" }}>
              {top3.map((item, index) => (
                <TopThreeMobileItem key={item.id ?? index} item={item} index={index} translate={translate} formatTime={formatTime} />
              ))}
            </Stack>
          ) : (
            <Grid
              container
              spacing={{ xs: 1.2, sm: 1.8 }}
              sx={{ width: "100%", maxWidth: { xs: "100%", md: 960 }, mx: "auto" }}
              justifyContent="center"
              alignItems="stretch"
            >
            {top3.map((item, index) => {
                const playersLabel = item.stuck
                  ? translate(
                      `Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim(),
                      `Stuck ${Number.isFinite(item.stuckDays) ? `${item.stuckDays}d` : ""}`.trim()
                    )
                  : Number.isFinite(item.players)
                  ? item.players.toLocaleString("sv-SE")
                  : "—";
                const updatedLabel = item.updated ? formatTime(item.updated) : null;
                const displayLabel = item.label === "Monopoly Big Baller" ? "Big Baller" : item.label;
                return (
                  <Grid
                    key={item.id ?? index}
                    item
                    xs={12}
                    sm="auto"
                    sx={{ display: "flex", justifyContent: "center", px: { md: 1 }, maxWidth: 320 }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        borderRadius: "18px",
                        p: { xs: 2.4, sm: 2.8 },
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 0.9,
                        width: "100%",
                        maxWidth: 320,
                      }}
                    >
                      <Stack spacing={0.6} alignItems="center">
                        <Typography
                          variant="overline"
                          sx={{
                            color: "rgba(226,232,240,0.85)",
                            letterSpacing: 1.5,
                            fontWeight: 600,
                          }}
                        >
                          #{index + 1}
                        </Typography>
                        <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700, textAlign: "center" }}>
                          {displayLabel}
                        </Typography>
                        <Typography
                          variant="h3"
                          sx={{ color: item.stuck ? "#fbbf24" : item.color, fontWeight: 700, textAlign: "center" }}
                        >
                          {playersLabel}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="caption"
                        sx={{ color: item.stuck ? "#fbbf24" : "rgba(148,163,184,0.7)" }}
                      >
                        {item.stuck
                          ? translate(
                              item.stuckSince
                                ? `Stuck sedan ${formatTime(item.stuckSince)}`
                                : "Ingen ny mätdata ännu",
                              item.stuckSince
                                ? `Stuck since ${formatTime(item.stuckSince)}`
                                : "No fresh datapoints yet"
                            )
                          : updatedLabel
                          ? translate(`Senast ${updatedLabel}`, `Latest ${updatedLabel}`)
                          : translate("Ingen tidsstämpel", "No timestamp")}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )
        ) : (
          <Typography sx={{ color: "rgba(148,163,184,0.75)", textAlign: "center" }}>
            {translate("Ingen live-data tillgänglig just nu.", "No live data available right now.")}
          </Typography>
        )}
      </Box>
    </>
  );
}
