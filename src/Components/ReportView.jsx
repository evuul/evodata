"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography, Stack, Chip, Grid, Divider } from "@mui/material";
import { useTranslate } from "@/context/LocaleContext";
import reportCommentary from "@/app/data/reportCommentary.json";
import yearSummaries from "@/app/data/yearSummaries.json";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const quarterToIndex = (year, quarter) => {
  const idx = QUARTERS.indexOf(quarter);
  return idx === -1 ? null : year * 4 + idx;
};
const safeList = (value) => (Array.isArray(value) ? value : []);

const formatMillion = (value, fractionDigits = 1) =>
  Number.isFinite(value)
    ? value.toLocaleString("sv-SE", { maximumFractionDigits: fractionDigits })
    : "–";

const formatPercent = (value, fractionDigits = 1) =>
  Number.isFinite(value)
    ? `${value >= 0 ? "+" : ""}${value.toFixed(fractionDigits)}%`
    : "–";

const formatUnitValue = (value, unit) => {
  if (!Number.isFinite(value)) return "–";
  if (unit === "%") return `${value.toFixed(1)}%`;
  if (unit === "EUR") return `${value.toFixed(2)} EUR`;
  if (unit === "MEUR") return `${formatMillion(value, 1)} MEUR`;
  return `${value}`;
};

const formatPublishDate = (value, locale = "sv-SE") => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const toSortedReports = (reports) =>
  safeList(reports)
    .map((report) => {
      const index = quarterToIndex(report.year, report.quarter);
      return index == null ? null : { ...report, index };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

export default function ReportView({ financialReports }) {
  const translate = useTranslate();
  const reports = useMemo(
    () => toSortedReports(financialReports?.financialReports),
    [financialReports]
  );
  const latest = reports.at(-1) ?? null;
  const prev = latest ? reports.find((r) => r.index === latest.index - 1) ?? null : null;
  const yoy = latest ? reports.find((r) => r.index === latest.index - 4) ?? null : null;
  const [votes, setVotes] = useState({});
  const topEntryRef = useRef(null);

  const kpiCards = useMemo(() => {
    const revenue = latest?.operatingRevenues ?? null;
    const margin = latest?.adjustedOperatingMargin ?? null;
    const eps = latest?.adjustedEarningsPerShare ?? null;
    const profit = latest?.adjustedProfitForPeriod ?? null;
    const cash = latest?.cashAndCashEquivalents ?? latest?.cashEnd ?? null;
    const prevCash = prev?.cashAndCashEquivalents ?? prev?.cashEnd ?? null;

    const qoqRevenue = prev?.operatingRevenues != null && revenue != null
      ? ((revenue - prev.operatingRevenues) / prev.operatingRevenues) * 100
      : null;
    const yoyRevenue = yoy?.operatingRevenues != null && revenue != null
      ? ((revenue - yoy.operatingRevenues) / yoy.operatingRevenues) * 100
      : null;

    const qoqMargin = prev?.adjustedOperatingMargin != null && margin != null
      ? margin - prev.adjustedOperatingMargin
      : null;
    const yoyMargin = yoy?.adjustedOperatingMargin != null && margin != null
      ? margin - yoy.adjustedOperatingMargin
      : null;

    const qoqEps = prev?.adjustedEarningsPerShare != null && eps != null
      ? ((eps - prev.adjustedEarningsPerShare) / prev.adjustedEarningsPerShare) * 100
      : null;
    const yoyEps = yoy?.adjustedEarningsPerShare != null && eps != null
      ? ((eps - yoy.adjustedEarningsPerShare) / yoy.adjustedEarningsPerShare) * 100
      : null;
    const qoqCash = prevCash != null && cash != null
      ? ((cash - prevCash) / prevCash) * 100
      : null;

    return [
      {
        label: translate("Nettoomsättning", "Net revenue"),
        value: revenue != null ? `${formatMillion(revenue, 1)} €M` : "–",
        qoq: qoqRevenue,
        yoy: yoyRevenue,
      },
      {
        label: translate("Rörelsemarginal (justerad)", "Operating margin (adjusted)"),
        value: margin != null ? `${margin.toFixed(1)}%` : "–",
        qoq: qoqMargin,
        yoy: yoyMargin,
        points: true,
      },
      {
        label: translate("EPS", "EPS"),
        value: eps != null ? `${eps.toFixed(2)} €` : "–",
        qoq: qoqEps,
        yoy: yoyEps,
      },
      {
        label: translate("Vinst (justerad)", "Adjusted profit"),
        value: profit != null ? `${formatMillion(profit, 1)} €M` : "–",
        qoq: null,
        yoy: null,
      },
      {
        label: translate("Likvida medel", "Cash"),
        value: cash != null ? `${formatMillion(cash, 1)} €M` : "–",
        qoq: qoqCash,
        yoy: null,
      },
    ];
  }, [latest, prev, yoy, translate]);

  const commentaryKey = latest ? `${latest.quarter}-${latest.year}` : null;
  const commentary = commentaryKey ? reportCommentary?.[commentaryKey] : null;
  const summaryYear = latest?.year != null ? String(latest.year) : null;
  const yearSummary = summaryYear ? yearSummaries?.[summaryYear] : null;
  const commentaryDate = formatPublishDate(commentary?.publishedAt);
  const yearSummaryDate = formatPublishDate(yearSummary?.publishedAt);
  const yearKpis = yearSummary?.kpis ?? [];
  const annualAggregates = useMemo(() => {
    const map = new Map();
    reports.forEach((report) => {
      const year = report?.year;
      if (!Number.isFinite(year)) return;
      if (!map.has(year)) {
        map.set(year, {
          revenue: 0,
          ebitda: 0,
          profit: 0,
          eps: 0,
        });
      }
      const entry = map.get(year);
      if (Number.isFinite(report.operatingRevenues)) entry.revenue += report.operatingRevenues;
      if (Number.isFinite(report.adjustedEBITDA)) entry.ebitda += report.adjustedEBITDA;
      if (Number.isFinite(report.adjustedProfitForPeriod)) entry.profit += report.adjustedProfitForPeriod;
      if (Number.isFinite(report.adjustedEarningsPerShare)) entry.eps += report.adjustedEarningsPerShare;
    });
    Array.from(map.values()).forEach((entry) => {
      entry.ebitdaMargin =
        Number.isFinite(entry.revenue) && entry.revenue > 0
          ? (entry.ebitda / entry.revenue) * 100
          : null;
    });
    return map;
  }, [reports]);

  const yearKpisWithYoY = useMemo(() => {
    const yearNumber = summaryYear ? Number(summaryYear) : null;
    if (!yearNumber) return yearKpis;
    const current = annualAggregates.get(yearNumber);
    const previous = annualAggregates.get(yearNumber - 1);
    return yearKpis.map((kpi) => {
      if (!kpi?.dataKey || !current || !previous) {
        return kpi;
      }
      const currentValue = current[kpi.dataKey];
      const previousValue = previous[kpi.dataKey];
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
        return kpi;
      }
      const yoy = kpi.points
        ? currentValue - previousValue
        : ((currentValue - previousValue) / previousValue) * 100;
      return {
        ...kpi,
        yoy,
      };
    });
  }, [annualAggregates, summaryYear, yearKpis]);
  const opinion = {
    positives: translate(
      commentary?.positives ?? [],
      commentary?.positivesEn ?? commentary?.positives ?? []
    ),
    negatives: translate(
      commentary?.negatives ?? [],
      commentary?.negativesEn ?? commentary?.negatives ?? []
    ),
    outlook: translate(
      commentary?.outlook ?? "Skriv dina tankar framåt här (t.ex. tillväxt, marginal, guidance).",
      commentary?.outlookEn ?? "Write your forward-looking view here (growth, margins, guidance)."
    ),
    buybacks: translate(
      commentary?.buybacks ?? "Skriv dina tankar om återköp framåt här.",
      commentary?.buybacksEn ?? "Write your buyback outlook here."
    ),
  };

  const supportMessage = {
    title: translate("Gillar du sidan?", "Enjoy the site?"),
    body: translate(
      "Jag driver sidan på min fritid vid sidan av studierna. Målet är att hålla all statistik och live-tracking gratis för alla. Vill du bidra till serverkostnaderna och bjuda på en kopp kaffe som tack? Det uppskattas enormt!",
      "I run the site in my spare time alongside my studies. The goal is to keep all statistics and live tracking free for everyone. Would you like to help cover server costs and buy a coffee as a thank you? It’s greatly appreciated!"
    ),
    cta: translate("☕ Bjud på en kaffe här", "☕ Buy me a coffee here"),
    href: "https://buymeacoffee.com/evuul",
  };

  const yearVoteId = summaryYear ? `year-${summaryYear}` : null;
  const quarterVoteId = latest ? `q-${latest.quarter}-${latest.year}` : null;

  const loadVotes = async (id) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/report-votes?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setVotes((prevState) => ({
        ...prevState,
        [id]: {
          up: data?.up ?? 0,
          down: data?.down ?? 0,
          userVote: prevState[id]?.userVote ?? null,
        },
      }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ids = [yearVoteId, quarterVoteId].filter(Boolean);
    ids.forEach((id) => {
      const saved = window.localStorage.getItem(`reportVote:${id}`);
      if (saved) {
        setVotes((prevState) => ({
          ...prevState,
          [id]: { ...prevState[id], userVote: saved },
        }));
      }
      loadVotes(id);
    });
  }, [yearVoteId, quarterVoteId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("panel") !== "report") return;
    if (!topEntryRef.current) return;
    const handle = window.setTimeout(() => {
      topEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(handle);
  }, []);

  const handleVote = async (id, type) => {
    if (!id || !["up", "down"].includes(type)) return;
    const existing = votes[id]?.userVote;
    if (existing) return;
    setVotes((prevState) => ({
      ...prevState,
      [id]: {
        up: (prevState[id]?.up ?? 0) + (type === "up" ? 1 : 0),
        down: (prevState[id]?.down ?? 0) + (type === "down" ? 1 : 0),
        userVote: type,
      },
    }));
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`reportVote:${id}`, type);
    }
    try {
      const res = await fetch("/api/report-votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      });
      if (!res.ok) throw new Error("vote failed");
    } catch {
      setVotes((prevState) => ({
        ...prevState,
        [id]: {
          up: (prevState[id]?.up ?? 0) - (type === "up" ? 1 : 0),
          down: (prevState[id]?.down ?? 0) - (type === "down" ? 1 : 0),
          userVote: null,
        },
      }));
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(`reportVote:${id}`);
      }
    }
  };

  const VoteBar = ({ id }) => {
    const data = votes[id] ?? { up: 0, down: 0, userVote: null };
    const voted = Boolean(data.userVote);
    return (
      <Box
        sx={{
          mt: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.2,
        }}
      >
        <Stack direction="row" spacing={1}>
          <Chip
            label={`👍 ${data.up ?? 0}`}
            onClick={() => handleVote(id, "up")}
            clickable={!voted}
            sx={{
              cursor: voted ? "default" : "pointer",
              backgroundColor: data.userVote === "up" ? "rgba(34,197,94,0.25)" : "rgba(148,163,184,0.12)",
              color: data.userVote === "up" ? "#bbf7d0" : "#e2e8f0",
              fontWeight: 600,
            }}
          />
          <Chip
            label={`👎 ${data.down ?? 0}`}
            onClick={() => handleVote(id, "down")}
            clickable={!voted}
            sx={{
              cursor: voted ? "default" : "pointer",
              backgroundColor: data.userVote === "down" ? "rgba(248,113,113,0.25)" : "rgba(148,163,184,0.12)",
              color: data.userVote === "down" ? "#fecaca" : "#e2e8f0",
              fontWeight: 600,
            }}
          />
        </Stack>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #0f172a, #111c2f)",
        borderRadius: "20px",
        border: "1px solid rgba(148,163,184,0.18)",
        boxShadow: "0 20px 45px rgba(15,23,42,0.45)",
        p: { xs: 2, md: 3 },
        color: "#f8fafc",
      }}
    >
      <Stack spacing={{ xs: 2, md: 3 }} alignItems="center" textAlign="center">
        <Box>
          <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.7)", letterSpacing: 1.2 }}>
            {translate("Rapportkommentar", "Report commentary")}
          </Typography>
        </Box>

        <Box sx={{ width: "100%", maxWidth: 1120 }}>
          <Stack spacing={3}>
            {yearSummary ? (
              <>
                <Box sx={{ textAlign: "center" }} ref={topEntryRef}>
                  <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {summaryYear
                      ? translate(
                          `Summering av helåret ${summaryYear}`,
                          `Full-year ${summaryYear} summary`
                        )
                      : translate("Kommentar", "Commentary")}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    background: "rgba(15,23,42,0.55)",
                    borderRadius: "20px",
                    border: "1px solid rgba(148,163,184,0.2)",
                    p: { xs: 2, md: 3 },
                    textAlign: "left",
                  }}
                >
                  <Stack spacing={0.6}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.7)", letterSpacing: 1.1 }}>
                        {translate("Helårssummering", "Full-year summary")}
                      </Typography>
                      {yearSummaryDate ? (
                        <Chip
                          size="small"
                          label={translate(`Publicerad ${yearSummaryDate}`, `Published ${yearSummaryDate}`)}
                          sx={{
                            backgroundColor: "rgba(99,102,241,0.18)",
                            color: "#c7d2fe",
                            fontWeight: 600,
                          }}
                        />
                      ) : null}
                    </Stack>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                      <Typography variant="h5" sx={{ fontWeight: 800 }}>
                        {translate(
                          `Summering av helåret ${summaryYear}: ${yearSummary.title}`,
                          yearSummary.titleEn
                            ? yearSummary.titleEn
                            : `Full-year ${summaryYear} summary: ${yearSummary.title}`
                        )}
                      </Typography>
                    </Stack>
                  </Stack>

                  {yearKpisWithYoY.length ? (
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      {yearKpisWithYoY.map((kpi, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={`year-kpi-${idx}`}>
                          <Box
                            sx={{
                              background: "rgba(15,23,42,0.45)",
                              borderRadius: "16px",
                              border: "1px solid rgba(148,163,184,0.2)",
                              p: 2,
                              height: "100%",
                              textAlign: "center",
                            }}
                          >
                            <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                              {kpi.label}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>
                              {formatUnitValue(kpi.value, kpi.unit)}
                            </Typography>
                            {kpi?.yoy != null ? (
                              <Stack direction="row" spacing={1} sx={{ mt: 0.8, justifyContent: "center" }}>
                                <Chip
                                  size="small"
                                  label={
                                    kpi.points
                                      ? `${kpi.yoy.toFixed(1)} pp YoY`
                                      : `${formatPercent(kpi.yoy, 1)} YoY`
                                  }
                                  sx={{
                                    backgroundColor: kpi.yoy >= 0 ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.2)",
                                    color: kpi.yoy >= 0 ? "#bbf7d0" : "#fecaca",
                                  }}
                                />
                              </Stack>
                            ) : null}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  ) : null}

                  <Stack spacing={1.6} sx={{ mt: 2 }}>
                    {(yearSummary.sections ?? []).map((section, idx) => (
                      <Box key={`year-${idx}`}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {translate(section.heading, section.headingEn || section.heading)}
                        </Typography>
                        <Typography sx={{ color: "rgba(226,232,240,0.82)", mt: 0.6, lineHeight: 1.7 }}>
                          {translate(section.body, section.bodyEn || section.body)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                  {yearVoteId ? <VoteBar id={yearVoteId} /> : null}
                </Box>
                <Box
                  sx={{
                    mt: 2.5,
                    p: { xs: 2, md: 2.5 },
                    borderRadius: "16px",
                    border: "1px dashed rgba(148,163,184,0.25)",
                    background: "rgba(15,23,42,0.35)",
                    textAlign: "left",
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {supportMessage.title}
                  </Typography>
                  <Typography sx={{ color: "rgba(226,232,240,0.8)", mt: 0.6, lineHeight: 1.6 }}>
                    {supportMessage.body}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Typography
                      component="a"
                      href={supportMessage.href}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        color: "#7dd3fc",
                        fontWeight: 700,
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {supportMessage.cta}
                    </Typography>
                  </Box>
                </Box>
              </>
            ) : null}

            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {latest
                  ? translate(
                      `Kommentar för ${latest.quarter} ${latest.year}`,
                      `Commentary for ${latest.quarter} ${latest.year}`
                    )
                  : translate("Kommentar", "Commentary")}
              </Typography>
            </Box>

            <Box
              sx={{
                background: "rgba(15,23,42,0.55)",
                borderRadius: "20px",
                border: "1px solid rgba(148,163,184,0.2)",
                p: { xs: 2, md: 3 },
                textAlign: "left",
              }}
            >
              <Stack spacing={0.6}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="overline" sx={{ color: "rgba(148,163,184,0.7)", letterSpacing: 1.1 }}>
                    {translate("Kommentar", "Commentary")}
                  </Typography>
                  {commentaryDate ? (
                    <Chip
                      size="small"
                      label={translate(`Publicerad ${commentaryDate}`, `Published ${commentaryDate}`)}
                      sx={{
                        backgroundColor: "rgba(59,130,246,0.18)",
                        color: "#bfdbfe",
                        fontWeight: 600,
                      }}
                    />
                  ) : null}
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>
                    {latest
                      ? translate(`Kommentar för ${latest.quarter} ${latest.year}`, `Commentary for ${latest.quarter} ${latest.year}`)
                      : translate("Kommentar", "Commentary")}
                  </Typography>
                </Stack>
              </Stack>

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                {kpiCards.map((card) => (
                  <Grid item xs={12} sm={6} md={3} key={card.label}>
                    <Box
                      sx={{
                        background: "rgba(15,23,42,0.45)",
                        borderRadius: "16px",
                        border: "1px solid rgba(148,163,184,0.2)",
                        p: 2,
                        height: "100%",
                        textAlign: "center",
                      }}
                    >
                      <Typography sx={{ color: "rgba(148,163,184,0.75)", fontSize: "0.85rem" }}>
                        {card.label}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {card.value}
                      </Typography>
                      {(card.qoq != null || card.yoy != null) && (
                        <Stack direction="row" spacing={1} sx={{ mt: 0.8, justifyContent: "center" }}>
                          {card.qoq != null && (
                            <Chip
                              size="small"
                              label={card.points ? `${card.qoq.toFixed(1)} pp QoQ` : `${formatPercent(card.qoq, 1)} QoQ`}
                              sx={{
                                backgroundColor: card.qoq >= 0 ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.2)",
                                color: card.qoq >= 0 ? "#bbf7d0" : "#fecaca",
                              }}
                            />
                          )}
                          {card.yoy != null && (
                            <Chip
                              size="small"
                              label={card.points ? `${card.yoy.toFixed(1)} pp YoY` : `${formatPercent(card.yoy, 1)} YoY`}
                              sx={{
                                backgroundColor: card.yoy >= 0 ? "rgba(34,197,94,0.2)" : "rgba(248,113,113,0.2)",
                                color: card.yoy >= 0 ? "#bbf7d0" : "#fecaca",
                              }}
                            />
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ borderColor: "rgba(148,163,184,0.2)", my: 2 }} />

              <Box
                sx={{
                  background: "rgba(15,23,42,0.45)",
                  borderRadius: "18px",
                  border: "1px solid rgba(148,163,184,0.2)",
                  p: { xs: 2, md: 2.8 },
                  textAlign: "left",
                }}
              >
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#bbf7d0" }}>
                      {translate("Positivt", "Positives")}
                    </Typography>
                    {opinion.positives.length ? (
                      <Stack component="ul" spacing={0.8} sx={{ mt: 1, pl: 2, m: 0 }}>
                        {opinion.positives.map((item, idx) => (
                          <Typography
                            component="li"
                            key={`pos-${idx}`}
                            sx={{ color: "rgba(226,232,240,0.86)", lineHeight: 1.6 }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Stack>
                    ) : (
                      <Typography sx={{ color: "rgba(226,232,240,0.65)", mt: 1 }}>
                        {translate("Ingen text angiven.", "No text provided.")}
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#fecaca" }}>
                      {translate("Negativt", "Negatives")}
                    </Typography>
                    {opinion.negatives.length ? (
                      <Stack component="ul" spacing={0.8} sx={{ mt: 1, pl: 2, m: 0 }}>
                        {opinion.negatives.map((item, idx) => (
                          <Typography
                            component="li"
                            key={`neg-${idx}`}
                            sx={{ color: "rgba(226,232,240,0.86)", lineHeight: 1.6 }}
                          >
                            {item}
                          </Typography>
                        ))}
                      </Stack>
                    ) : (
                      <Typography sx={{ color: "rgba(226,232,240,0.65)", mt: 1 }}>
                        {translate("Ingen text angiven.", "No text provided.")}
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {translate("Tankar framåt", "Outlook")}
                    </Typography>
                    <Typography sx={{ color: "rgba(226,232,240,0.8)", mt: 0.8, lineHeight: 1.7 }}>
                      {opinion.outlook}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {translate("Aktieåterköp framåt", "Buybacks outlook")}
                    </Typography>
                    <Typography sx={{ color: "rgba(226,232,240,0.8)", mt: 0.8, lineHeight: 1.7 }}>
                      {opinion.buybacks}
                    </Typography>
                  </Box>
                </Stack>
              </Box>

              {quarterVoteId ? <VoteBar id={quarterVoteId} /> : null}

              <Box
                sx={{
                  mt: 2.5,
                  p: { xs: 2, md: 2.5 },
                  borderRadius: "16px",
                  border: "1px dashed rgba(148,163,184,0.25)",
                  background: "rgba(15,23,42,0.35)",
                  textAlign: "left",
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {supportMessage.title}
                </Typography>
                <Typography sx={{ color: "rgba(226,232,240,0.8)", mt: 0.6, lineHeight: 1.6 }}>
                  {supportMessage.body}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography
                    component="a"
                    href={supportMessage.href}
                    target="_blank"
                    rel="noreferrer"
                    sx={{
                      color: "#7dd3fc",
                      fontWeight: 700,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {supportMessage.cta}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
