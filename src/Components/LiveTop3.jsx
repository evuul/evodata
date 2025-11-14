"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Chip, Grid, Skeleton, Stack, Tab, Tabs, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import LiveTop3PayoutChart from "./LiveTop3PayoutChart";

const LIVE_TOP3_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_TOP3_ENDPOINT ?? "/api/live-top3";
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // hourly refresh is enough
const HISTORY_DAYS = 30;
const HISTORY_PER_DAY = 3;
const NUMBER_LOCALE_MAP = { sv: "sv-SE", en: "en-US" };
const MULTIPLIER_STYLES = [
  {
    limit: 500,
    color: "#ccfbf1",
    background: "linear-gradient(135deg, rgba(16,185,129,0.35), rgba(6,182,212,0.35))",
    border: "rgba(13,148,136,0.5)",
    shadow: "0 0 18px rgba(13,148,136,0.35)",
  },
  {
    limit: 1000,
    color: "#f3e8ff",
    background: "linear-gradient(135deg, rgba(109,40,217,0.45), rgba(192,132,252,0.4))",
    border: "rgba(147,51,234,0.55)",
    shadow: "0 0 20px rgba(147,51,234,0.35)",
  },
  {
    limit: 1500,
    color: "#fee2e2",
    background: "linear-gradient(135deg, rgba(220,38,38,0.4), rgba(248,113,113,0.35))",
    border: "rgba(248,113,113,0.55)",
    shadow: "0 0 18px rgba(220,38,38,0.3)",
  },
  {
    limit: 2000,
    color: "#ffedd5",
    background: "linear-gradient(135deg, rgba(251,146,60,0.4), rgba(249,115,22,0.35))",
    border: "rgba(251,146,60,0.55)",
    shadow: "0 0 18px rgba(251,146,60,0.35)",
  },
  {
    limit: 2500,
    color: "#fef9c3",
    background: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(251,191,36,0.35))",
    border: "rgba(245,158,11,0.55)",
    shadow: "0 0 18px rgba(245,158,11,0.35)",
  },
  {
    limit: 3000,
    color: "#ffe4e6",
    background: "linear-gradient(135deg, rgba(244,63,94,0.4), rgba(251,113,133,0.35))",
    border: "rgba(244,63,94,0.5)",
    shadow: "0 0 18px rgba(244,63,94,0.3)",
  },
  {
    limit: 3500,
    color: "#ede9fe",
    background: "linear-gradient(135deg, rgba(125,211,252,0.35), rgba(192,132,252,0.4))",
    border: "rgba(96,165,250,0.5)",
    shadow: "0 0 18px rgba(96,165,250,0.3)",
  },
  {
    limit: 4000,
    color: "#dbeafe",
    background: "linear-gradient(135deg, rgba(37,99,235,0.4), rgba(14,165,233,0.35))",
    border: "rgba(37,99,235,0.5)",
    shadow: "0 0 18px rgba(37,99,235,0.35)",
  },
  {
    limit: 4500,
    color: "#d9f99d",
    background: "linear-gradient(135deg, rgba(101,163,13,0.35), rgba(34,197,94,0.35))",
    border: "rgba(101,163,13,0.5)",
    shadow: "0 0 18px rgba(101,163,13,0.3)",
  },
  {
    limit: 5000,
    color: "#e0f2fe",
    background: "linear-gradient(135deg, rgba(8,145,178,0.4), rgba(14,165,233,0.35))",
    border: "rgba(8,145,178,0.55)",
    shadow: "0 0 18px rgba(8,145,178,0.35)",
  },
];
const BOLT_ICON_COLOR = "#fef08a";

const stockholmDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getStockholmTodayYmd = () => {
  try {
    return stockholmDateFormatter.format(new Date()).replace(/\//g, "-");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};
const getMultiplierStyle = (value) => {
  if (!Number.isFinite(value)) {
    return {
      color: "#f8fafc",
      background: "linear-gradient(135deg, rgba(148,163,184,0.25), rgba(71,85,105,0.25))",
      border: "rgba(148,163,184,0.4)",
      shadow: "0 0 12px rgba(100,116,139,0.25)",
    };
  }
  const match = MULTIPLIER_STYLES.find((entry) => value <= entry.limit);
  return match ?? MULTIPLIER_STYLES[MULTIPLIER_STYLES.length - 1];
};

const normalizeEntries = (data) => {
  if (!Array.isArray(data)) return [];
  const parseTs = (value) => {
    if (!value) return 0;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? ts : 0;
  };

  return data
    .map((item) => {
      const winnersCountValue =
        item?.winnersCount ?? item?.totalWinners ?? (Array.isArray(item?.winners) ? item.winners.length : null);

      return {
        id:
          item?.id ??
          item?.gameShowEventId ??
          item?.settledAt ??
          item?.startedAt ??
          `${item?.gameShow ?? "game"}-${item?.multiplier ?? "x"}-${Math.random().toString(36).slice(2)}`,
        gameShow: item?.gameShow ?? "",
        multiplier: Number(item?.multiplier),
        totalAmount: Number(item?.totalAmount),
        settledAt: item?.settledAt ?? item?.startedAt ?? null,
        winnersCount: Number.isFinite(Number(winnersCountValue)) ? Number(winnersCountValue) : null,
      };
    })
    .filter((entry) => entry.gameShow && Number.isFinite(entry.totalAmount))
    .sort((a, b) => parseTs(b.settledAt) - parseTs(a.settledAt));
};

const formatAmount = (value, locale) => {
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString(locale, {
    maximumFractionDigits: value >= 10_000 ? 0 : 1,
    minimumFractionDigits: value >= 10_000 ? 0 : 1,
  })} €`;
};

const formatGameName = (slug) =>
  slug
    ?.toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ") ?? "—";

const formatSettledLabel = (value, locale) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toLocaleString(locale === "en" ? "en-GB" : "sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

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
  const topWinnerName =
    entry.topWinner?.name ??
    (locale === "en" ? "Unknown player" : "Okänd spelare");

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

const parseEntryTimestamp = (value) => {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
};

const dedupeEntriesFromSnapshots = (snapshots = []) => {
  const seen = new Set();
  const dayEntries = [];
  snapshots.forEach((snapshot) => {
    const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
    entries.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const key =
        entry.id ??
        [
          entry.gameShow ?? "game",
          entry.settledAt ?? entry.startedAt ?? entry.createdAt ?? "",
          entry.multiplier ?? "",
          entry.totalAmount ?? "",
        ].join("|");
      if (seen.has(key)) return;
      seen.add(key);
      dayEntries.push({
        ...entry,
        fetchedAt: snapshot?.fetchedAt ?? entry?.fetchedAt ?? null,
      });
    });
  });
  dayEntries.sort(
    (a, b) =>
      parseEntryTimestamp(b.settledAt ?? b.fetchedAt) - parseEntryTimestamp(a.settledAt ?? a.fetchedAt)
  );
  return dayEntries;
};

const LiveTop3 = ({ variant = "standalone" }) => {
  const translate = useTranslate();
  const { locale } = useLocale();
  const numberLocale = NUMBER_LOCALE_MAP[locale] ?? NUMBER_LOCALE_MAP.sv;
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState("loading");
  const [meta, setMeta] = useState({ fetchedAt: null, source: null });
  const [historyBuckets, setHistoryBuckets] = useState([]);
  const [activeTab, setActiveTab] = useState("cards");

  useEffect(() => {
    let active = true;

    const fetchTopWins = async () => {
      try {
        const params = new URLSearchParams({
          historyDays: String(HISTORY_DAYS),
          historyPerDay: String(HISTORY_PER_DAY),
        });
        const response = await fetch(`${LIVE_TOP3_ENDPOINT}?${params.toString()}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        const payload = await response.json();
        if (!active) return;
        const normalized = normalizeEntries(payload?.todayEntries ?? payload?.entries ?? payload);
        setEntries(normalized);
        setMeta({
          fetchedAt: payload?.fetchedAt ?? payload?.updatedAt ?? null,
          source: payload?.source ?? null,
          todayYmd: payload?.todayYmd ?? null,
        });
        setHistoryBuckets(Array.isArray(payload?.history) ? payload.history : []);
        setStatus("success");
      } catch {
        if (!active) return;
        setStatus((prev) => (prev === "success" ? prev : "error"));
      }
    };

    fetchTopWins();
    const id = setInterval(fetchTopWins, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const isLoading = status === "loading" && entries.length === 0;
  const showError = status === "error" && entries.length === 0;
  const lastUpdatedLabel = meta?.fetchedAt
    ? new Date(meta.fetchedAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const isStandalone = variant !== "embedded";
  const historyDayEntries = useMemo(() => {
    return (historyBuckets || []).map((bucket) => ({
      ymd: bucket?.ymd ?? null,
      entries: dedupeEntriesFromSnapshots(bucket?.snapshots ?? []),
    }));
  }, [historyBuckets]);

  const filteredHistoryDays = useMemo(() => {
    const todayYmd = meta?.todayYmd ?? getStockholmTodayYmd();
    return historyDayEntries.filter((bucket) => {
      if (!bucket?.ymd || !Array.isArray(bucket.entries)) return false;
      if (!bucket.entries.length) return false;
      return bucket.ymd !== todayYmd;
    });
  }, [historyDayEntries, meta?.todayYmd]);

  const chartDayOptions = useMemo(() => {
    const todayYmd = meta?.todayYmd ?? getStockholmTodayYmd();
    const options = [];
    if (entries.length) {
      options.push({
        id: todayYmd,
        ymd: todayYmd,
        entries,
        isToday: true,
      });
    }
    historyDayEntries.forEach((bucket) => {
      if (!bucket?.ymd || !bucket.entries.length) return;
      if (bucket.ymd === todayYmd) {
        if (!entries.length) {
          options.push({ id: bucket.ymd, ymd: bucket.ymd, entries: bucket.entries, isToday: true });
        }
        return;
      }
      options.push({ id: bucket.ymd, ymd: bucket.ymd, entries: bucket.entries, isToday: false });
    });
    return options;
  }, [entries, historyDayEntries, meta?.todayYmd]);

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
            {translate("Största vinster senaste timmarna", "Biggest wins from the last hours")}
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
          <Tab value="cards" label={translate("Dagens vinster", "Today's wins")} />
          <Tab value="chart" label={translate("Payout-graf", "Payout chart")} />
        </Tabs>
      </Box>

      {activeTab === "cards" && (
        <>
          <Grid container spacing={2} sx={{ justifyContent: "center" }}>
            {isLoading &&
              ["first", "second", "third"].map((key) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Skeleton variant="rounded" height={140} sx={{ backgroundColor: "rgba(15,23,42,0.5)" }} />
                </Grid>
              ))}

            {!isLoading &&
              entries.map((entry, index) => (
                <Grid item xs={12} sm={6} md={4} key={entry.id ?? `${entry.gameShow}-${index}`}>
                  <EntryCard entry={entry} rank={index} numberLocale={numberLocale} locale={locale} translate={translate} />
                </Grid>
              ))}
          </Grid>

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

      {activeTab === "cards" && filteredHistoryDays.length > 0 && (
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

          <Stack spacing={3} sx={{ mt: 3 }}>
            {filteredHistoryDays.map((bucket) => {
              const topDayEntries = bucket.entries.slice(0, 3);
              if (!topDayEntries.length) return null;
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
                    {topDayEntries.map((entry, idx) => (
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
                </Box>
              );
            })}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default LiveTop3;
