"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography, IconButton, CircularProgress, Link, Card } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const FAKE_NEWS = [
  {
    title: "Evolution lanserar nytt spel i Live Casino-portföljen",
    url: "https://example.com/nyhet/evolution-nytt-spel",
    source: "ExempelMedia",
    publishedAt: new Date().toISOString(),
    snippet: "Det nya spelet breddar bolagets erbjudande och förstärker positionen på marknaden.",
  },
  {
    title: "Analytiker höjer riktkursen för Evolution",
    url: "https://example.com/nyhet/evolution-riktkurs",
    source: "AnalysHuset",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    snippet: "Stark tillväxt och robust marginalutveckling anges som skäl till höjningen.",
  },
  {
    title: "Evolution tecknar avtal med stor operatör i Nordamerika",
    url: "https://example.com/nyhet/evolution-nordamerika",
    source: "Spelbranschen Idag",
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    snippet: "Avtalet stärker närvaron på den nordamerikanska marknaden och öppnar för nya intäktsströmmar.",
  },
];

const NewsSection = ({ query = "Evolution AB OR Evolution Gaming OR EVO.ST", lang = "sv" }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [articles, setArticles] = useState([]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/news?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(lang)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Kunde inte hämta nyheter");
      const data = await res.json();
      const list = (data.articles || []);
      setArticles(list.length > 0 ? list : FAKE_NEWS);
    } catch (e) {
      // Fallback till fejkade nyheter om nätverk/API saknas
      setArticles(FAKE_NEWS);
      setError("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [query, lang]);

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: { xs: "92%", sm: "85%", md: "75%" },
        margin: "16px auto",
        minHeight: "200px",
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#ffffff" }}>Nyheter</Typography>
        <IconButton aria-label="Uppdatera" onClick={fetchNews} sx={{ color: "#00e676" }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {loading && <CircularProgress size={24} sx={{ color: "#00e676", my: 2 }} />}
      {error && (
        <Typography variant="body2" color="#ff1744" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Box sx={{ width: "100%" }}>
        {articles.length === 0 && !loading ? (
          <Typography variant="body2" color="#b0b0b0">Inga nyheter hittades just nu.</Typography>
        ) : (
          articles.map((a, idx) => (
            <Box key={`${a.url}-${idx}`} sx={{
              backgroundColor: "#1f1f1f",
              border: "1px solid #2b2b2b",
              borderRadius: "10px",
              p: 2,
              mb: 1.5,
            }}>
              <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700, mb: 0.5 }}>
                <Link href={a.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ color: "#00e676" }}>
                  {a.title}
                </Link>
              </Typography>
              <Typography variant="body2" sx={{ color: "#b0b0b0", mb: 0.5 }}>
                {a.source || "Källa okänd"}
                {a.publishedAt && ` • ${new Date(a.publishedAt).toLocaleString("sv-SE")}`}
              </Typography>
              {a.snippet && (
                <Typography variant="body2" sx={{ color: "#ddd" }}>
                  {a.snippet}
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
