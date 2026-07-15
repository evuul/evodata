'use client';

import {
  Box,
  Typography,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  IconButton,
  LinearProgress,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { useTranslate } from "@/context/LocaleContext";
import {
  VIEW_OPTIONS,
  formatPercent,
  formatNumber,
  formatMillion,
  fullLabel,
  useShortIntelligenceModel,
} from "./useShortIntelligenceModel";
import ShortIntellegenceBlankingSection from "./ShortIntellegenceBlankingSection";
import ShortIntellegenceTradingSection from "./ShortIntellegenceTradingSection";

const ShortTooltip = ({ active, payload }) => {
  const translate = useTranslate();
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload ?? {};
  const change = datum.delta;
  return (
    <Box
      sx={{
        p: 1.5,
        background: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(96,165,250,0.25)",
        borderRadius: 1.5,
      }}
    >
      <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.8)" }}>
        {fullLabel(datum.date)}
      </Typography>
      <Typography variant="body2" sx={{ color: "#f8fafc", mt: 0.5 }}>
        {translate(
          `${formatPercent(datum.percent, 2)} blankade aktier`,
          `${formatPercent(datum.percent, 2)} shorted shares`
        )}
      </Typography>
      {change != null && (
        <Typography
          variant="body2"
          sx={{ color: change >= 0 ? "#f87171" : "#34d399" }}
        >
          {translate(
            `${change >= 0 ? "+" : ""}${change.toFixed(2)} pp mot föregående dag`,
            `${change >= 0 ? "+" : ""}${change.toFixed(2)} pp vs previous day`
          )}
        </Typography>
      )}
    </Box>
  );
};

const TradingTooltip = ({ active, payload }) => {
  const translate = useTranslate();
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload ?? {};
  return (
    <Box
      sx={{
        p: 1.5,
        background: "rgba(15,23,42,0.92)",
        border: "1px solid rgba(96,165,250,0.25)",
        borderRadius: 1.5,
      }}
    >
      <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.8)" }}>
        {fullLabel(datum.date)}
      </Typography>
      {Number.isFinite(datum.volumeM) && (
        <Typography variant="body2" sx={{ color: "#34d399", mt: 0.5 }}>
          {translate(
            `Volym: ${formatMillion(datum.volumeM, 1)} M aktier`,
            `Volume: ${formatMillion(datum.volumeM, 1)} M shares`
          )}
        </Typography>
      )}
      {Number.isFinite(datum.shortSharePct) && (
        <Typography variant="body2" sx={{ color: "#facc15" }}>
          {translate(
            `Blankarnas andel: ${formatPercent(datum.shortSharePct)}`,
            `Short share of volume: ${formatPercent(datum.shortSharePct)}`
          )}
        </Typography>
      )}
      {Number.isFinite(datum.shortChangeShares) &&
        datum.shortChangeShares !== 0 && (
          <Typography
            variant="body2"
            sx={{ color: datum.shortChangeShares > 0 ? "#f87171" : "#34d399" }}
          >
            {translate(
              `Netto: ${datum.shortChangeShares > 0 ? "+" : "-"}${formatNumber(
                Math.abs(datum.shortChangeShares)
              )} aktier`,
              `Net: ${datum.shortChangeShares > 0 ? "+" : "-"}${formatNumber(
                Math.abs(datum.shortChangeShares)
              )} shares`
            )}
          </Typography>
        )}
    </Box>
  );
};

const ShortIntellegence = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const translate = useTranslate();
  const {
    view,
    setView,
    blankingRange,
    setBlankingRange,
    blankingUpdatedAt,
    shortSnapshot,
    shortSnapshotLoading,
    tradingRanges,
    tradingRange,
    setTradingRange,
    tradingError,
    aggregateShare,
    blankingSeries,
    blankingSummary,
    blankingDomain,
    blankingAxisInterval,
    publicPositions,
    publicPositionsError,
    tradingSeries,
    tradingAxisInterval,
    latestTradingSummary,
    activeLoading,
    refreshBlanking,
  } = useShortIntelligenceModel({ isMobile, translate });

  return (
    <Box
      sx={{
        background: "rgba(15,23,42,0.55)",
        borderRadius: "18px",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.45)",
        color: "#f8fafc",
        padding: { xs: 3, md: 4 },
        width: "100%",
        maxWidth: "1700px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2.5, md: 3 },
      }}
    >
      <Stack
        spacing={1.2}
        alignItems="center"
        textAlign="center"
      >
        <Box sx={{ maxWidth: 680 }}>
          <Typography
            variant="overline"
            sx={{ letterSpacing: 1, color: "rgba(148,163,184,0.65)" }}
          >
            {translate("Short Intelligence", "Short Intelligence")}
          </Typography>
          <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 700 }}>
            {translate("Blankning & daglig handel", "Short interest & daily trading")}
          </Typography>
          <Typography
            sx={{ color: "rgba(226,232,240,0.7)", mt: 1, maxWidth: 520 }}
          >
            {translate(
              "Blankningsvyn visar den offentliga positionen över tid. Handelsvyn visar hur blankare har handlat i den valda perioden.",
              "The short view shows the public short position over time. The trading view shows how shorts have traded in the selected period."
            )}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" justifyContent="center">
          {blankingUpdatedAt && (
            <Chip
              label={translate(
                `Blankning uppdaterad ${new Date(blankingUpdatedAt).toLocaleTimeString("sv-SE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`,
                `Short data updated ${new Date(blankingUpdatedAt).toLocaleTimeString("sv-SE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              )}
              size="small"
              sx={{
                backgroundColor: "rgba(59,130,246,0.15)",
                color: "#93c5fd",
                fontWeight: 500,
              }}
            />
          )}
          {shortSnapshot?.observedDate && (
            <Chip
              label={translate(
                `FI live ${shortSnapshot.observedDate}`,
                `FI live ${shortSnapshot.observedDate}`
              )}
              size="small"
              sx={{
                backgroundColor: "rgba(45,212,191,0.15)",
                color: "#5eead4",
                fontWeight: 500,
              }}
            />
          )}
          {aggregateShare != null && (
            <Chip
              label={translate(
                `Blankare stod för ${formatPercent(aggregateShare, 1)} av handeln`,
                `Shorts accounted for ${formatPercent(aggregateShare, 1)} of trading`
              )}
              size="small"
              sx={{
                backgroundColor: "rgba(250,204,21,0.15)",
                color: "#facc15",
                fontWeight: 500,
              }}
            />
          )}
          <IconButton
            aria-label={translate("Uppdatera blankningsdata", "Refresh short data")}
            onClick={refreshBlanking}
            size="small"
            sx={{
              backgroundColor: "rgba(148,163,184,0.18)",
              color: "#f8fafc",
              "&:hover": { backgroundColor: "rgba(148,163,184,0.28)" },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          maxWidth: 940,
          width: "100%",
          mx: "auto",
          p: { xs: 1.5, md: 2 },
          borderRadius: "16px",
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.48)",
        }}
      >
        <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.78)", letterSpacing: 1.2 }}>
          {translate("Snabb översikt", "Quick brief")}
        </Typography>
        <Typography sx={{ color: "rgba(226,232,240,0.78)", lineHeight: 1.6, mt: 0.5 }}>
          {translate(
            "Två siffror räcker ofta: senaste FI-blankningen och senaste rörelsen.",
            "Two numbers usually tell the story: the latest FI short interest and the latest move."
          )}
        </Typography>
        <Box
          sx={{
            mt: 1.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
            gap: { xs: 1.2, md: 1.6 },
          }}
        >
          <Box
            sx={{
              background: "linear-gradient(135deg, rgba(248,113,113,0.14), rgba(15,23,42,0.56))",
              border: "1px solid rgba(248,113,113,0.24)",
              borderRadius: "14px",
              p: 1.6,
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.72)" }}>
              {translate("Förändring senaste dag", "Change since last day")}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.4 }}>
              {blankingSummary?.deltaPP != null
                ? `${blankingSummary.deltaPP >= 0 ? "+" : ""}${blankingSummary.deltaPP.toFixed(2)} pp`
                : "–"}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.72)", mt: 0.3 }}>
              {blankingSummary?.deltaShares != null
                ? translate(
                    `${formatNumber(Math.abs(blankingSummary.deltaShares))} aktier`,
                    `${formatNumber(Math.abs(blankingSummary.deltaShares))} shares`
                  )
                : "–"}
            </Typography>
          </Box>
          <Box
            sx={{
              background: "linear-gradient(135deg, rgba(45,212,191,0.14), rgba(15,23,42,0.56))",
              border: "1px solid rgba(45,212,191,0.24)",
              borderRadius: "14px",
              p: 1.6,
            }}
          >
            <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.72)" }}>
              {translate("Senaste FI-blankning", "Latest FI short interest")}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.4 }}>
              {blankingSummary?.latestPercent != null
                ? formatPercent(blankingSummary.latestPercent, 2)
                : "–"}
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.72)", mt: 0.3 }}>
              {blankingSummary?.latestDate ? fullLabel(blankingSummary.latestDate) : translate("Kräver shortdata", "Needs short data")}
            </Typography>
          </Box>
        </Box>
      </Box>

      <ToggleButtonGroup
        value={view}
        exclusive
        onChange={(_event, next) => next && setView(next)}
        sx={{
          mt: { xs: 3, md: 4 },
          backgroundColor: "rgba(148,163,184,0.12)",
          borderRadius: "999px",
          p: 0.5,
          flexWrap: "wrap",
          alignSelf: "center",
        }}
      >
        {VIEW_OPTIONS.map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            sx={{
              textTransform: "none",
              color: "rgba(226,232,240,0.75)",
              border: 0,
              borderRadius: "999px!important",
              px: { xs: 1.75, md: 3 },
              py: 0.75,
              "&.Mui-selected": {
                color: "#f8fafc",
                backgroundColor:
                  option.value === "blanking"
                    ? "rgba(96,165,250,0.3)"
                    : "rgba(250,204,21,0.28)",
              },
                }}
              >
                {translate(option.labelSv, option.labelEn)}
              </ToggleButton>
            ))}
      </ToggleButtonGroup>

      <Box sx={{ position: "relative", mt: { xs: 3, md: 4 } }}>
        {activeLoading && (
          <LinearProgress
            sx={{
              position: "absolute",
              top: -12,
              left: 0,
              right: 0,
              borderRadius: 999,
              backgroundColor: "rgba(148,163,184,0.12)",
              "& .MuiLinearProgress-bar": {
                background: "linear-gradient(90deg, #38bdf8, #818cf8)",
              },
            }}
          />
        )}

        {view === "blanking" ? (
          <ShortIntellegenceBlankingSection
            isMobile={isMobile}
            translate={translate}
            blankingRange={blankingRange}
            setBlankingRange={setBlankingRange}
            blankingSeries={blankingSeries}
            blankingAxisInterval={blankingAxisInterval}
            blankingDomain={blankingDomain}
            blankingSummary={blankingSummary}
            publicPositions={publicPositions}
            publicPositionsError={publicPositionsError}
            shortSnapshotLoading={shortSnapshotLoading}
            blankingTooltip={<ShortTooltip />}
          />
        ) : (
          <ShortIntellegenceTradingSection
            isMobile={isMobile}
            translate={translate}
            tradingRanges={tradingRanges}
            tradingRange={tradingRange}
            setTradingRange={setTradingRange}
            tradingError={tradingError}
            tradingSeries={tradingSeries}
            tradingAxisInterval={tradingAxisInterval}
            latestTradingSummary={latestTradingSummary}
            aggregateShare={aggregateShare}
            tradingTooltip={<TradingTooltip />}
          />
        )}
      </Box>
    </Box>
  );
};

export default ShortIntellegence;
