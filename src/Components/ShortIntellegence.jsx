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
import {
} from "recharts";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { useTranslate } from "@/context/LocaleContext";
import {
  VIEW_OPTIONS,
  formatPercent,
  formatNumber,
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
    tradingRanges,
    tradingRange,
    setTradingRange,
    tradingError,
    aggregateShare,
    blankingSeries,
    blankingSummary,
    blankingDomain,
    blankingAxisInterval,
    tradingSeries,
    tradingAxisInterval,
    latestTradingSummary,
    activeLoading,
    refreshBlanking,
  } = useShortIntelligenceModel({ isMobile, translate });

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #1f2937)",
        borderRadius: "18px",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 45px rgba(15, 23, 42, 0.45)",
        color: "#f8fafc",
        padding: { xs: 3, md: 4 },
        width: "100%",
        maxWidth: "1200px",
        margin: "16px auto",
      }}
    >
      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={isMobile ? 2 : 3}
        alignItems={isMobile ? "flex-start" : "center"}
        justifyContent="space-between"
      >
        <Box>
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
              "Växla mellan blankningsgrad och handelsdata för att se hur kortsiktiga positioner utvecklas och påverkar likviditeten.",
              "Switch between short interest and trading data to see how short-term positions evolve and impact liquidity."
            )}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
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
