"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography, IconButton, CircularProgress, Link, Card, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
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
  const [isTest, setIsTest] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/news?q=${encodeURIComponent(query)}&lang=${encodeURIComponent(lang)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Kunde inte hämta nyheter");
      const data = await res.json();
      const list = (data.articles || []);
      const usingFallback = list.length === 0;
      const finalList = usingFallback ? FAKE_NEWS : list;
      setArticles(finalList);
      setIsTest(usingFallback || !!data.error || finalList.every(a => (a.url || '').includes('example.com')));
    } catch (e) {
      // Fallback till fejkade nyheter om nätverk/API saknas
      setArticles(FAKE_NEWS);
      setIsTest(true);
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
      <Box sx={{ position: 'relative', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#ffffff", textAlign: 'center' }}>Nyheter</Typography>
          {isTest && (
            <Chip label="TESTNYHETER" size="small" sx={{ backgroundColor: '#402a2a', color: '#ff6f6f', border: '1px solid #5a3a3a' }} />
          )}
        </Box>
        <IconButton aria-label="Uppdatera" onClick={fetchNews} sx={{ color: "#00e676", position: 'absolute', right: 0, top: 0 }}>
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
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#232323' },
            }}
            onClick={() => { setSelected(a); setOpen(true); }}
            >
              <Typography variant="subtitle1" sx={{ color: "#fff", fontWeight: 700, mb: 0.5 }}>
                {a.title}
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

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{selected?.title || 'Nyhet'}</Typography>
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box>
              <Typography variant="body2" sx={{ color: '#888', mb: 1 }}>
                {(selected.source || 'Källa okänd')}{selected.publishedAt ? ` • ${new Date(selected.publishedAt).toLocaleString('sv-SE')}` : ''}
              </Typography>
              {selected.snippet && (
                <Typography variant="body1" sx={{ color: '#ddd', whiteSpace: 'pre-wrap' }}>
                  {selected.snippet}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selected?.url && (
            <Button component={Link} href={selected.url} target="_blank" rel="noopener noreferrer" sx={{ color: '#00e676' }}>
              Öppna källa
            </Button>
          )}
          <Button onClick={() => setOpen(false)} sx={{ color: '#ff6f6f' }}>Stäng</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default NewsSection;
