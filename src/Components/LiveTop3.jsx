"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
  useMediaQuery,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import LiveTop3PayoutChart from "./LiveTop3PayoutChart";
import {
  BOLT_ICON_COLOR,
  HISTORY_ARCHIVE_VISIBLE_LIMIT,
  HISTORY_DAYS,
  formatAmount,
  formatGameName,
  formatSettledLabel,
  getMultiplierStyle,
  TODAY_VISIBLE_LIMIT,
  useLiveTop3Model,
} from "./useLiveTop3Model";

const rankStyles = [
  {
    background: "linear-gradient(135deg, rgba(253,224,71,0.35), rgba(248,113,113,0.45))",
    color: "#fef9c3",
  },
  {
    background: "linear-gradient(135deg, rgba(96,165,250,0.3), rgba(14,165,233,0.45))",
    color: "#dbeafe",
  },
  {
    background: "linear-gradient(135deg, rgba(129,140,248,0.35), rgba(192,132,252,0.45))",
    color: "#ede9fe",
  },
];

const EntryCard = ({ entry, rank, numberLocale, locale, translate }) => {
  const settledCopy = formatSettledLabel(entry.settledAt, locale);
  const multiplierStyle = getMultiplierStyle(entry.multiplier);
  const badgeStyle = rankStyles[rank] ?? {
    background: "linear-gradient(135deg, rgba(51,65,85,0.55), rgba(30,41,59,0.75))",
    color: "#e2e8f0",
  };

  return (
    <Card
      sx={{
        height: "100%",
        background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,64,175,0.55))",
        borderRadius: 2.5,
        border: "1px solid rgba(59,130,246,0.35)",
        boxShadow: "0 12px 24px rgba(2,6,23,0.45)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.22), transparent 60%)",
          pointerEvents: "none",
        }}
      />
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, position: "relative", p: 2.25 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "14px",
              background: badgeStyle.background,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: badgeStyle.color,
              fontWeight: 700,
              fontSize: "1.1rem",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 6px 16px rgba(15,23,42,0.5)",
            }}
          >
            #{rank + 1}
          </Box>
          <Box sx={{ flex: 1, minWidth: 140 }}>
            <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1.4, fontWeight: 600 }}>
              {translate("Liveshow", "Live show")}
            </Typography>
            <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
              {formatGameName(entry.gameShow)}
            </Typography>
          </Box>
          <Chip
            icon={<BoltIcon sx={{ fontSize: "1rem" }} />}
            label={`${Number.isFinite(entry.multiplier) ? entry.multiplier : "—"}×`}
            size="small"
            sx={{
              color: multiplierStyle.color,
              background: multiplierStyle.background,
              border: `1px solid ${multiplierStyle.border}`,
              boxShadow: multiplierStyle.shadow,
              fontWeight: 600,
              "& .MuiChip-icon": {
                color: BOLT_ICON_COLOR,
              },
            }}
          />
        </Stack>

        <Box>
          <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.9rem", mb: 0.5 }}>
            {translate("Total utbetalning", "Total payout")}
          </Typography>
          <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 800, letterSpacing: 0.5 }}>
            {formatAmount(entry.totalAmount, numberLocale)}
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={2}
          flexWrap="wrap"
          sx={{
            borderTop: "1px solid rgba(148,163,184,0.2)",
            pt: 1.5,
            rowGap: 1.5,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 140 }}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)", textTransform: "uppercase" }}>
              {translate("Vinnare", "Winners")}
            </Typography>
            <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>
              {Number.isFinite(entry.winnersCount)
                ? translate(
                    `${entry.winnersCount.toLocaleString(numberLocale)} spelare`,
                    `${entry.winnersCount.toLocaleString(numberLocale)} players`
                  )
                : "—"}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.7)", textTransform: "uppercase" }}>
              {translate("Senaste", "Last settled")}
            </Typography>
            <Typography sx={{ color: "#e2e8f0", fontWeight: 600 }}>
              {settledCopy
                ? translate(`Kl ${settledCopy}`, `${settledCopy}`)
                : translate("Pågår", "In progress")}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
};

const LiveTop3 = ({ variant = "standalone" }) => {
  const translate = useTranslate();
  const { locale } = useLocale();
  const {
    numberLocale,
    meta,
    activeTab,
    setActiveTab,
    showAllTodayEntries,
    setShowAllTodayEntries,
    selectedGame,
    setSelectedGame,
    expandedDays,
    toggleDayExpanded,
    isLoading,
    showError,
    lastUpdatedLabel,
    summaryStats,
    entriesByGame,
    gameOptions,
    filteredHistoryDays,
    chartDayOptions,
    visibleTodayEntries,
    canExpandTodayList,
  } = useLiveTop3Model({ locale });
  const isSmallScreen = useMediaQuery("(max-width:600px)");

  const isStandalone = variant !== "embedded";

  const biggestEntry = summaryStats.biggestEntry;
  const biggestSettledCopy = formatSettledLabel(biggestEntry?.settledAt, locale);
  const summaryCardItems = [
    {
      id: "total",
      label: translate("Totalt utbetalt idag", "Total payout today"),
      value: formatAmount(summaryStats.totalAmount, numberLocale),
      helper: summaryStats.winsCount
        ? translate(
            `${summaryStats.winsCount.toLocaleString(numberLocale)} vinster`,
            `${summaryStats.winsCount.toLocaleString(numberLocale)} wins`
          )
        : translate("Inga vinster registrerade", "No wins recorded"),
    },
    {
      id: "biggest",
      label: translate("Största vinst", "Biggest win"),
      value: formatAmount(biggestEntry?.totalAmount, numberLocale),
      helper: biggestEntry
        ? translate(
            `${formatGameName(biggestEntry.gameShow)} · ${
              biggestSettledCopy ? `Kl ${biggestSettledCopy}` : "Pågår"
            }`,
            `${formatGameName(biggestEntry.gameShow)} · ${biggestSettledCopy ?? "Live"}`
          )
        : translate("Avvaktar data", "Awaiting data"),
    },
    {
      id: "count",
      label: translate("Antal vinster", "Number of wins"),
      value: summaryStats.winsCount.toLocaleString(numberLocale),
      helper: summaryStats.winsCount
        ? translate(
            `Snitt ${formatAmount(summaryStats.avgAmount, numberLocale)}`,
            `Avg ${formatAmount(summaryStats.avgAmount, numberLocale)}`
          )
        : translate("Snitt saknas", "Average unavailable"),
    },
    {
      id: "games",
      label: translate("Spel med vinster", "Games with wins"),
      value: summaryStats.uniqueGamesCount.toLocaleString(numberLocale),
      helper: summaryStats.totalWinners
        ? translate(
            `Unika spel med vinster · ${summaryStats.totalWinners.toLocaleString(numberLocale)} vinnare`,
            `Unique games with wins · ${summaryStats.totalWinners.toLocaleString(numberLocale)} winners`
          )
        : translate(
            "Unika spel med vinster · vinnare ej rapporterade",
            "Unique games with wins · winners not reported"
          ),
    },
  ];

  const perGameSelectorLabel = translate("Välj spel", "Select game");

  const tabOptions = [
    { value: "today", label: translate("Dagens läge", "Today's view") },
    { value: "history", label: translate("Historik", "History") },
    { value: "perGame", label: translate("Vinster per spel", "Wins per game") },
    { value: "chart", label: translate("Payout-graf", "Payout chart") },
  ];

  return (
    <Box
      sx={{
        mt: isStandalone ? { xs: 3, sm: 4 } : 0,
        mb: isStandalone ? { xs: 3, sm: 4 } : 0,
        maxWidth: isStandalone ? 1100 : "100%",
        mx: "auto",
        p: isStandalone ? { xs: 2.5, sm: 3 } : { xs: 2, sm: 2.5 },
        borderRadius: isStandalone ? 3 : 2.5,
        background: isStandalone
          ? "linear-gradient(120deg, rgba(2,6,23,0.85), rgba(30,64,175,0.35))"
          : "rgba(15,23,42,0.65)",
        border: isStandalone ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(59,130,246,0.2)",
        boxShadow: isStandalone ? "0 25px 45px rgba(2,6,23,0.55)" : "0 15px 30px rgba(2,6,23,0.35)",
      }}
    >
      <Stack
        direction="column"
        spacing={2}
        alignItems="center"
        justifyContent="center"
        sx={{ mb: 2.5, textAlign: "center" }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700, textTransform: "uppercase" }}>
            {translate("Live vinster & utbetalningar", "Live wins & payouts")}
          </Typography>
        </Box>
        <Chip
          icon={<MilitaryTechIcon sx={{ fontSize: "1.1rem" }} />}
          label={translate("Direktdata · Live-feed", "Live feed · internal")}
          sx={{
            color: "#e0f2fe",
            borderColor: "rgba(191,219,254,0.35)",
            background: "linear-gradient(135deg, rgba(15,23,42,0.75), rgba(37,99,235,0.4))",
            borderWidth: 1,
            fontWeight: 600,
          }}
        />
        {lastUpdatedLabel && (
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.85)" }}>
            {translate(`Senast uppdaterad ${lastUpdatedLabel}`, `Last updated ${lastUpdatedLabel}`)}
          </Typography>
        )}
        {meta?.todayYmd && (
          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)" }}>
            {translate(`Dagens vinster (${meta.todayYmd})`, `Today's wins (${meta.todayYmd})`)}
          </Typography>
        )}
      </Stack>

      <Box
        sx={{
          height: 1,
          width: "100%",
          background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.35), transparent)",
          mb: 2.5,
        }}
      />

      <Box sx={{ width: "100%", mt: 2 }}>
        {isSmallScreen ? (
          <FormControl fullWidth>
            <InputLabel
              id="live-top3-tab-select-label"
              sx={{
                color: "#cbd5f5",
                "&.Mui-focused": { color: "#38bdf8" },
              }}
            >
              {translate("Välj vy", "Select view")}
            </InputLabel>
            <Select
              labelId="live-top3-tab-select-label"
              label={translate("Välj vy", "Select view")}
              value={activeTab}
              onChange={(event) => setActiveTab(event.target.value)}
              sx={{
                borderRadius: 2,
                color: "#e2e8f0",
                "& .MuiSvgIcon-root": { color: "#e2e8f0" },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: "#0f172a",
                    color: "#f8fafc",
                  },
                },
              }}
            >
              {tabOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <Tabs
            value={activeTab}
            onChange={(event, value) => setActiveTab(value)}
            centered
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "#38bdf8" } }}
            sx={{
              "& .MuiTab-root": {
                color: "rgba(226,232,240,0.6)",
                textTransform: "none",
                fontWeight: 600,
              },
              "& .Mui-selected": {
                color: "#f8fafc",
              },
            }}
          >
            {tabOptions.map((option) => (
              <Tab key={option.value} value={option.value} label={option.label} />
            ))}
          </Tabs>
        )}
      </Box>

      {activeTab === "today" && (
        <>
          <Grid container spacing={2} justifyContent="center">
            {summaryCardItems.map((item) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                key={item.id}
                sx={{ display: "flex", justifyContent: "center" }}
              >
                <Card
                  sx={{
                    width: "100%",
                    maxWidth: 260,
                    background: "linear-gradient(135deg, rgba(30,41,59,0.85), rgba(59,130,246,0.25))",
                    border: "1px solid rgba(148,163,184,0.25)",
                  }}
                >
                  <CardContent>
                    <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700, mt: 0.5 }}>
                      {item.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.9)", mt: 0.5 }}>
                      {item.helper}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Stack spacing={1.5} sx={{ mt: 3 }}>
            {isLoading &&
              Array.from({ length: TODAY_VISIBLE_LIMIT }).map((_, index) => (
                <Skeleton
                  key={`today-skeleton-${index}`}
                  variant="rounded"
                  height={90}
                  sx={{ backgroundColor: "rgba(15,23,42,0.5)" }}
                />
              ))}

            {!isLoading &&
              visibleTodayEntries.map((entry, index) => {
                const settledCopy = formatSettledLabel(entry.settledAt, locale);
                const multiplierStyle = getMultiplierStyle(entry.multiplier);
                const winnersCopy = Number.isFinite(entry.winnersCount)
                  ? translate(
                      `${entry.winnersCount.toLocaleString(numberLocale)} vinnare`,
                      `${entry.winnersCount.toLocaleString(numberLocale)} winners`
                    )
                  : translate("Okänt antal vinnare", "Unknown number of winners");

                return (
                  <Card
                    key={entry.id ?? `today-${index}`}
                    sx={{
                      background: "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(37,99,235,0.35))",
                      border: "1px solid rgba(59,130,246,0.25)",
                    }}
                  >
                    <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                      >
                        <Box>
                          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.8)", letterSpacing: 1 }}>
                            {translate("Spel", "Game")}
                          </Typography>
                          <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                            {formatGameName(entry.gameShow)}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                          <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.8)" }}>
                            {translate("Vinst", "Win")}
                          </Typography>
                          <Typography variant="h5" sx={{ color: "#f8fafc", fontWeight: 700 }}>
                            {formatAmount(entry.totalAmount, numberLocale)}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Chip
                          icon={<BoltIcon sx={{ fontSize: "1rem" }} />}
                          label={`${Number.isFinite(entry.multiplier) ? entry.multiplier : "—"}×`}
                          size="small"
                          sx={{
                            color: multiplierStyle.color,
                            background: multiplierStyle.background,
                            border: `1px solid ${multiplierStyle.border}`,
                            boxShadow: multiplierStyle.shadow,
                            fontWeight: 600,
                            "& .MuiChip-icon": {
                              color: BOLT_ICON_COLOR,
                            },
                          }}
                        />
                        <Typography sx={{ color: "#e2e8f0", fontWeight: 500 }}>
                          {settledCopy
                            ? translate(`Kl ${settledCopy}`, `${settledCopy}`)
                            : translate("Pågår", "In progress")}
                        </Typography>
                        <Typography sx={{ color: "#94a3b8", fontWeight: 500 }}>{winnersCopy}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
          </Stack>

          {canExpandTodayList && !isLoading && (
            <Button
              onClick={() => setShowAllTodayEntries((prev) => !prev)}
              sx={{
                mt: 2,
                color: "#38bdf8",
                fontWeight: 600,
                textTransform: "none",
                width: { xs: "100%", sm: "auto" },
              }}
            >
              {showAllTodayEntries
                ? translate("Visa färre rader", "Show fewer rows")
                : translate("Visa alla vinster", "Show all wins")}
            </Button>
          )}

          {showError && (
            <Card
              sx={{
                backgroundColor: "rgba(153,27,27,0.15)",
                border: "1px solid rgba(248,113,113,0.35)",
                mt: 2,
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ color: "#fecaca" }}>
                  {translate(
                    "Kunde inte hämta live-topplistan just nu. Försök igen om en liten stund.",
                    "We could not reach the live leaderboard right now. Please try again in a bit."
                  )}
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === "history" && (
        <Box
          sx={{
            mt: 4,
            pt: 3,
            borderTop: "1px solid rgba(148,163,184,0.25)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="overline"
            sx={{ color: "rgba(148,163,184,0.85)", letterSpacing: 1.5, fontWeight: 600 }}
          >
            {translate("Historiska vinster", "Historic wins")}
          </Typography>
          <Typography variant="h6" sx={{ color: "#f8fafc", fontWeight: 700, mt: 1 }}>
            {translate(
              `Arkiv senaste ${HISTORY_DAYS} dagar`,
              `Archive last ${HISTORY_DAYS} days`
            )}
          </Typography>

          {filteredHistoryDays.length === 0 ? (
            <Typography sx={{ color: "#e2e8f0", mt: 2 }}>
              {translate("Ingen historik att visa ännu.", "No history to display yet.")}
            </Typography>
          ) : (
            <Stack spacing={3} sx={{ mt: 3 }}>
              {filteredHistoryDays.map((bucket) => {
                const dayEntries = bucket.entries;
                if (!dayEntries.length) return null;
                const isExpanded = expandedDays.has(bucket.ymd);
                const visibleEntries = isExpanded ? dayEntries : dayEntries.slice(0, HISTORY_ARCHIVE_VISIBLE_LIMIT);
                const canToggle = dayEntries.length > HISTORY_ARCHIVE_VISIBLE_LIMIT;
                const formattedDate = new Date(bucket.ymd).toLocaleDateString(locale === "en" ? "en-GB" : "sv-SE", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <Box key={bucket.ymd}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: "#e2e8f0",
                        fontWeight: 600,
                        mb: 1.5,
                        textAlign: "center",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      {formattedDate}
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      sx={{
                        justifyContent: "center",
                      }}
                    >
                      {visibleEntries.map((entry, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={`${bucket.ymd}-${entry.id}-${idx}`}>
                          <EntryCard
                            entry={entry}
                            rank={idx}
                            numberLocale={numberLocale}
                            locale={locale}
                            translate={translate}
                          />
                        </Grid>
                      ))}
                    </Grid>
                    {canToggle && (
                      <Button
                        onClick={() => toggleDayExpanded(bucket.ymd)}
                        sx={{
                          mt: 2,
                          color: "#38bdf8",
                          fontWeight: 600,
                          textTransform: "none",
                          width: { xs: "100%", sm: "auto" },
                        }}
                      >
                        {isExpanded
                          ? translate("Dölj vinster", "Show less")
                          : translate("Visa fler vinster", "Show more")}
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>
      )}

      {activeTab === "perGame" && (
        <Box sx={{ mt: 3 }}>
          {gameOptions.length === 0 ? (
            <Typography sx={{ color: "#e2e8f0" }}>
              {isLoading
                ? translate("Laddar vinster per spel ...", "Loading wins per game...")
                : translate("Inga vinster per spel att visa ännu.", "No wins per game to display yet.")}
            </Typography>
          ) : (
            <>
              <Typography sx={{ color: "#e2e8f0", textAlign: "center", mb: 2 }}>
                {translate(
                  "Välj spel för att se största vinsterna",
                  "Pick a game to explore its biggest wins"
                )}
              </Typography>
              {isSmallScreen ? (
                <FormControl
                  fullWidth
                  sx={{
                    maxWidth: 420,
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  <InputLabel
                    id="per-game-select-label"
                    sx={{
                      color: "#cbd5f5",
                      "&.Mui-focused": { color: "#38bdf8" },
                    }}
                  >
                    {perGameSelectorLabel}
                  </InputLabel>
                  <Select
                    labelId="per-game-select-label"
                    label={perGameSelectorLabel}
                    value={selectedGame ?? ""}
                    onChange={(event) => setSelectedGame(event.target.value)}
                    sx={{
                      borderRadius: 2,
                      color: "#e2e8f0",
                      "& .MuiSvgIcon-root": { color: "#e2e8f0" },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: "#0f172a",
                          color: "#f8fafc",
                        },
                      },
                    }}
                  >
                    {gameOptions.map((game) => (
                      <MenuItem value={game.gameShow} key={game.gameShow}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: game.color,
                              border: "1px solid rgba(15,23,42,0.4)",
                            }}
                          />
                          <Box component="span">{`${game.displayName} (${game.winsCount})`}</Box>
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <Box
                  sx={{
                    overflowX: "auto",
                    pb: 1,
                    mb: 2,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ minWidth: "fit-content" }}>
                    {gameOptions.map((game) => {
                      const isActive = game.gameShow === selectedGame;
                      return (
                        <Button
                          key={game.gameShow}
                          onClick={() => setSelectedGame(game.gameShow)}
                          variant={isActive ? "contained" : "outlined"}
                          size="small"
                          startIcon={
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                backgroundColor: game.color,
                                border: "1px solid rgba(15,23,42,0.4)",
                              }}
                            />
                          }
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            borderRadius: 999,
                            borderColor: "rgba(148,163,184,0.35)",
                            color: isActive ? "#0f172a" : "#e2e8f0",
                            backgroundColor: isActive ? "#38bdf8" : "transparent",
                            "&:hover": {
                              borderColor: "rgba(148,163,184,0.7)",
                            },
                          }}
                        >
                          {`${game.displayName} (${game.winsCount})`}
                        </Button>
                      );
                    })}
                  </Stack>
                </Box>
              )}

              {selectedGame && entriesByGame.has(selectedGame) ? (
                <Grid
                  container
                  spacing={2}
                  sx={{
                    justifyContent: "center",
                  }}
                >
                  {entriesByGame.get(selectedGame).map((entry, idx) => (
                    <Grid item xs={12} sm={6} md={4} key={`${selectedGame}-${entry.id}-${idx}`}>
                      <EntryCard
                        entry={entry}
                        rank={idx}
                        numberLocale={numberLocale}
                        locale={locale}
                        translate={translate}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography sx={{ color: "#e2e8f0", textAlign: "center" }}>
                  {translate("Inga vinster från det här spelet ännu.", "No wins from this game yet.")}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}

      {activeTab === "chart" && (
        <Box sx={{ width: "100%", mt: 3 }}>
          <LiveTop3PayoutChart
            dayOptions={chartDayOptions}
            locale={locale}
            translate={translate}
            isLoading={isLoading}
          />
        </Box>
      )}
    </Box>
  );
};

export default LiveTop3;
