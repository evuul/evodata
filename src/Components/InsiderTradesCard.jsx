"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Divider,
  Link as MuiLink,
  Button,
  TextField,
  MenuItem,
} from "@mui/material";
import { formatSek } from "@/utils/formatters";

const DEFAULT_PAGES = 17;
const ITEMS_PER_PAGE = 4;

const formatDate = (value) => {
  if (!value) return "-";
  try {
    return new Date(`${value}T00:00:00Z`).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
};

const directionColor = (direction) => {
  if (direction === "buy") return "#00e676";
  if (direction === "sell") return "#ff6f6f";
  return "#b0b0b0";
};

export default function InsiderTradesCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async (pages = DEFAULT_PAGES) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/insiders?pages=${pages}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Kunde inte hämta insynsdata (${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Okänt fel";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(DEFAULT_PAGES);
  }, [fetchData]);

  const totals = data?.totals || null;
  const fetchedAt = data?.fetchedAt || null;
  const items = data?.items || [];

  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const pageItems = useMemo(() => {
    if (!items.length) return [];
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, page]);

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, idx) => idx + 1),
    [totalPages],
  );

  return (
    <Card
      sx={{
        background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
        padding: { xs: "12px", sm: "16px" },
        width: { xs: "100%", sm: "100%" },
        maxWidth: "1200px",
        margin: "16px auto",
        textAlign: "center",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
          Insynshandel – köp & sälj
        </Typography>
      </Box>

      {loading && !data ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, color: "#FFCA28", mt: 3 }}>
          <CircularProgress size={20} sx={{ color: "#FFCA28" }} />
          <Typography variant="body2" sx={{ color: "#FFCA28" }}>
            Hämtar insynshandel…
          </Typography>
        </Box>
      ) : error ? (
        <Typography variant="body2" sx={{ color: "#ff6f6f", mt: 2 }}>
          {error}
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 2,
              mt: 2,
              justifyContent: "center",
              alignItems: "stretch",
            }}
          >
            <SummaryBox
              title="Totalt köpt"
              value={totals?.buyValueSek != null ? formatSek(totals.buyValueSek) : "—"}
              count={totals?.buyCount}
              color="#00e676"
            />
            <SummaryBox
              title="Totalt sålt"
              value={totals?.sellValueSek != null ? formatSek(totals.sellValueSek) : "—"}
              count={totals?.sellCount}
              color="#ff6f6f"
            />
            <SummaryBox
              title="Nettoköp"
              value={totals?.netValueSek != null ? formatSek(totals.netValueSek) : "—"}
              count={totals?.totalCount}
              color={totals?.netValueSek >= 0 ? "#00e676" : "#ff6f6f"}
              secondary="(köp − sälj)"
            />
          </Box>

          <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", my: 2 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, alignItems: "center" }}>
            {pageItems.length === 0 ? (
              <Typography variant="body2" sx={{ color: "#b0b0b0" }}>
                Ingen insynshandel hittades.
              </Typography>
            ) : (
              pageItems.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    padding: "12px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    width: "100%",
                    maxWidth: 720,
                    alignItems: "center",
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.25 }}>
                    <Typography variant="subtitle2" sx={{ color: "#fff", fontWeight: 600 }}>
                      {item.person || "Okänd"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#b0b0b0" }}>
                      {item.position || "—"}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={item.type || "—"}
                    sx={{
                      backgroundColor: "#2a2a2a",
                      color: directionColor(item.direction),
                      border: `1px solid ${directionColor(item.direction)}33`,
                    }}
                  />

                  <Typography variant="body2" sx={{ color: "#d0d0d0" }}>
                    {`Transaktionsdatum: ${formatDate(item.transactionDate || item.transactionAt || item.publishedDate)}`}
                    {item.instrumentName && ` • ${item.instrumentName}`}
                  </Typography>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, color: "#b0b0b0", justifyContent: "center" }}>
                    {item.volumeText && (
                      <Typography variant="caption">
                        Volym: {item.volumeText}{item.volumeUnit ? ` ${item.volumeUnit}` : ""}
                      </Typography>
                    )}
                    {item.currency === "SEK" && Number.isFinite(item.price) ? (
                      <Typography variant="caption">
                        Pris/aktie: {item.price.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kr
                      </Typography>
                    ) : item.priceText ? (
                      <Typography variant="caption">
                        Pris: {item.priceText}{item.currency ? ` ${item.currency}` : ""}
                      </Typography>
                    ) : null}
                    {item.valueSek != null && (
                      <Typography variant="caption" sx={{ color: directionColor(item.direction) }}>
                        Totalt belopp: {formatSek(item.valueSek)}
                      </Typography>
                    )}
                    {item.status && (
                      <Typography variant="caption" sx={{ color: "#ffca28" }}>
                        Status: {item.status}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "center" }}>
                    {item.detailsUrl && (
                      <MuiLink
                        href={item.detailsUrl}
                        target="_blank"
                        rel="noopener"
                        underline="hover"
                        sx={{ color: "#FFCA28", fontSize: "0.75rem" }}
                      >
                        Visa anmälan
                      </MuiLink>
                    )}
                    {item.issuer && (
                      <Typography variant="caption" sx={{ color: "#808080" }}>
                        {item.issuer}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))
            )}
          </Box>

          {totalPages > 1 && (
            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
              <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  sx={{ textTransform: "none" }}
                >
                  Föregående
                </Button>
                <TextField
                  select
                  size="small"
                  value={page}
                  onChange={(event) => setPage(Number(event.target.value))}
                  sx={{
                    minWidth: 140,
                    '& .MuiInputBase-root': {
                      backgroundColor: '#2a2a2a',
                      color: '#fff',
                      borderRadius: '8px',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255,255,255,0.2)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#FFCA28',
                    },
                    '& .MuiSvgIcon-root': {
                      color: '#FFCA28',
                    },
                  }}
                >
                  {pageNumbers.map((num) => (
                    <MenuItem
                      key={num}
                      value={num}
                      sx={{
                        backgroundColor: '#1f1f1f',
                        color: '#fff',
                        '&.Mui-selected': {
                          backgroundColor: '#2a2a2a',
                          color: '#FFCA28',
                        },
                        '&.Mui-selected:hover': {
                          backgroundColor: '#333333',
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255,202,40,0.15)',
                        },
                      }}
                    >
                      Sida {num}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page === totalPages}
                  sx={{ textTransform: "none" }}
                >
                  Nästa
                </Button>
              </Box>
              <Typography variant="caption" sx={{ color: "#808080" }}>
                Sida {page} av {totalPages}
              </Typography>
            </Box>
          )}

        </>
      )}

      <Typography variant="caption" sx={{ color: "#808080", display: "block", mt: 2 }}>
        Källa: <MuiLink href="https://marknadssok.fi.se/publiceringsklient/sv-SE/Search/Search?SearchFunctionType=Insyn&Utgivare=evolution%20gaming&button=search" target="_blank" rel="noopener" underline="hover" sx={{ color: "#FFCA28" }}>Finansinspektionen – Insynsregister</MuiLink>
      </Typography>
      {fetchedAt && (
        <Typography variant="caption" sx={{ color: "#808080", display: "block" }}>
          Senast uppdaterad: {new Date(fetchedAt).toLocaleString("sv-SE")}
        </Typography>
      )}
    </Card>
  );
}

function SummaryBox({ title, value, count, color, secondary }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 180,
        backgroundColor: "#2a2a2a",
        borderRadius: "10px",
        padding: "12px",
        border: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      <Typography variant="caption" sx={{ color: "#b0b0b0" }}>
        {title}
        {secondary ? ` ${secondary}` : ""}
      </Typography>
      <Typography variant="h6" sx={{ color, fontWeight: 700 }}>
        {value ?? "—"}
      </Typography>
      <Typography variant="caption" sx={{ color: "#808080" }}>
        Poster: {Number.isFinite(count) ? count : "—"}
      </Typography>
    </Box>
  );
}
