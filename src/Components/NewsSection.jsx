"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Link,
  Card,
  Chip,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const FAKE_NEWS = [
  {
    title: "Evolution lanserar nytt spel i Live Casino-portföljen",
    url: "https://example.com/nyhet/evolution-nytt-spel",
    source: "ExempelMedia",
    publishedAt: new Date().toISOString(),
    snippet:
      "Det nya spelet breddar bolagets erbjudande och förstärker positionen på marknaden.",
  },
  {
    title: "Analytiker höjer riktkursen för Evolution",
    url: "https://example.com/nyhet/evolution-riktkurs",
    source: "AnalysHuset",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    snippet:
      "Stark tillväxt och robust marginalutveckling anges som skäl till höjningen.",
  },
  {
    title: "Evolution tecknar avtal med stor operatör i Nordamerika",
    url: "https://example.com/nyhet/evolution-nordamerika",
    source: "Spelbranschen Idag",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    snippet:
      "Avtalet stärker närvaron på den nordamerikanska marknaden och öppnar för nya intäktsströmmar.",
  },
];

const NewsSection = ({
  query = "Evolution AB OR Evolution Gaming OR EVO.ST",
  lang = "sv",
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [articles, setArticles] = useState([]);
  const [isTest, setIsTest] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState("ALL"); // ALL | PRESS | ANALYS | MEDIA

  const getDomain = (u) => {
    try {
      return new URL(u).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  };
  const classifyArticle = (a) => {
    const domain = getDomain(a.url || "");
    const title = (a.title || "").toLowerCase();
    const pressDomains = [
      "news.cision.com",
      "cision.com",
      "mfn.se",
      "globenewswire.com",
      "prnewswire.com",
      "bequoted.com",
    ];
    if (
      pressDomains.some((d) => domain.endsWith(d)) ||
      /press|release|mfn|ir\b/.test(title)
    )
      return "PRESS";
    const analysisDomains = [
      "di.se",
      "placera.se",
      "seekingalpha.com",
      "borskollen.se",
      "affarsvarlden.se",
      "introduce.se",
      "marketscreener.com",
    ];
    if (
      analysisDomains.some((d) => domain.endsWith(d)) ||
      /analys|riktkurs|rekommendation/.test(title)
    )
      return "ANALYS";
    return "MEDIA";
  };

  const byDateDesc = (a, b) =>
    new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `/api/news?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(
          lang
        )}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Kunde inte hämta nyheter");
      const data = await res.json();
      const list = (data.articles || []).map((a) => {
        const domain = getDomain(a.url);
        const type = classifyArticle(a);
        return { ...a, domain, type };
      });
      const usingFallback = list.length === 0;
      const finalList = usingFallback
        ? FAKE_NEWS.map((a) => ({
            ...a,
            domain: getDomain(a.url),
            type: classifyArticle(a),
          }))
        : list;

      const sorted = [...finalList].sort(byDateDesc);
      setArticles(sorted);
      setIsTest(
        usingFallback ||
          !!data.error ||
          sorted.every((a) => (a.url || "").includes("example.com"))
      );
      setLastUpdated(new Date());
    } catch (e) {
      setArticles(
        FAKE_NEWS.map((a) => ({
          ...a,
          domain: getDomain(a.url),
          type: classifyArticle(a),
        }))
      );
      setIsTest(true);
      setError("");
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [query, lang]);

  const displayed = useMemo(() => {
    const byDate = [...articles].sort(byDateDesc);
    const filtered =
      filter === "ALL" ? byDate : byDate.filter((a) => a.type === filter);
    return filtered.slice(0, 5);
  }, [articles, filter]);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: { xs: "92%", sm: "100%" },
        maxWidth: "1200px",
        margin: "16px auto",
        minHeight: "200px",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "relative", mb: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: "#ffffff", textAlign: "center" }}
          >
            Nyheter
          </Typography>
          {isTest && (
            <Chip
              label="TESTNYHETER"
              size="small"
              sx={{
                backgroundColor: "#402a2a",
                color: "#ff6f6f",
                border: "1px solid #5a3a3a",
              }}
            />
          )}
        </Box>
        <IconButton
          aria-label="Uppdatera"
          onClick={fetchNews}
          sx={{
            color: "#00e676",
            position: "absolute",
            right: 0,
            top: 0,
            animation: loading ? "spin 1s linear infinite" : "none",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" },
            },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* Filter & statusrad */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {[
            { key: "ALL", label: "Alla" },
            { key: "PRESS", label: "Pressmeddelanden" },
            { key: "ANALYS", label: "Analys" },
            { key: "MEDIA", label: "Media" },
          ].map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              clickable
              onClick={() => setFilter(f.key)}
              sx={{
                backgroundColor: filter === f.key ? "#00e676" : "#2a2a2a",
                color: filter === f.key ? "#0b0b0b" : "#b0b0b0",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </Box>
        <Typography
          variant="caption"
          sx={{ color: "#b0b0b0", textAlign: "center" }}
        >
          {lastUpdated
            ? `Senast uppdaterad: ${new Date(
                lastUpdated
              ).toLocaleString("sv-SE")}`
            : "—"}
        </Typography>
      </Box>

      {loading && (
        <CircularProgress size={24} sx={{ color: "#00e676", my: 2 }} />
      )}
      {error && (
        <Typography variant="body2" color="#ff1744" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ width: "100%" }}>
        {displayed.length === 0 && !loading ? (
          <Typography variant="body2" color="#b0b0b0">
            Inga nyheter hittades just nu.
          </Typography>
        ) : (
          displayed.map((a, idx) => (
            <Box
              key={`${a.url}-${idx}`}
              component={Link}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                backgroundColor: "#1f1f1f",
                border: "1px solid #2b2b2b",
                borderRadius: "10px",
                p: 2,
                mb: 1.5,
                cursor: "pointer",
                "&:hover": { backgroundColor: "#232323" },
                width: "100%",
                overflow: "hidden",
                textDecoration: "none",
                display: "block",
                boxSizing: "border-box",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  color: "#fff",
                  fontWeight: 700,
                  mb: 0.5,
                  textAlign: "center",
                  wordBreak: "break-word",
                  overflowWrap: "anywhere",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {a.title}
              </Typography>
              {a.publishedAt && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    color: "#b0b0b0",
                  }}
                >
                  {new Date(a.publishedAt).toLocaleDateString("sv-SE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Typography>
              )}
            </Box>
          ))
        )}
      </Box>
    </Card>
  );
};

export default NewsSection;
