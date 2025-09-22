"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Card, Box, Typography, Chip, CircularProgress, Link } from "@mui/material";
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const ShortTrend = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [range, setRange] = useState('30'); // '7' | '30'

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/short/history', { cache: 'no-store' });
      if (!res.ok) throw new Error('Kunde inte hämta historik');
      const data = await res.json();
      const arr = Array.isArray(data.items) ? data.items : [];
      setItems(arr);
      setUpdatedAt(data.updatedAt || null);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);
  // Om historiken är tom: försök seed:a med ett snapshot en gång
  useEffect(() => {
    const maybeSeed = async () => {
      try {
        if (typeof window === 'undefined') return;
        if (items && items.length > 0) return;
        const seededKey = 'short_history_seeded';
        if (localStorage.getItem(seededKey) === '1') return;
        const r = await fetch('/api/short/snapshot', { method: 'GET', cache: 'no-store' });
        if (r.ok) {
          localStorage.setItem(seededKey, '1');
          fetchHistory();
          try { window.dispatchEvent(new CustomEvent('shortSnapshot')); } catch {}
        }
      } catch {}
    };
    maybeSeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items && items.length]);
  useEffect(() => {
    const handler = () => fetchHistory();
    try { window.addEventListener('shortSnapshot', handler); } catch {}
    return () => { try { window.removeEventListener('shortSnapshot', handler); } catch {} };
  }, []);

  const data = useMemo(() => {
    const n = range === '7' ? 7 : 30;
    return items.slice(-n).map(x => ({ date: x.date, percent: Number(x.percent) }));
  }, [items, range]);

  // Tight, nice Y‑domain and 0.1pp ticks
  const yStats = useMemo(() => {
    if (!data.length) return { min: 0, max: 1, ticks: [0, 0.5, 1] };
    let min = Math.min(...data.map(d => d.percent));
    let max = Math.max(...data.map(d => d.percent));
    if (min === max) { min -= 0.1; max += 0.1; }
    const pad = 0.1; // 0.1pp padding
    min = Math.floor((min - pad) * 10) / 10;
    max = Math.ceil((max + pad) * 10) / 10;
    const ticks = [];
    for (let v = min; v <= max + 1e-9; v = +(v + 0.1).toFixed(1)) {
      ticks.push(+v.toFixed(1));
    }
    return { min, max, ticks };
  }, [data]);

  const formatDateLabel = (s) => {
    try {
      const d = new Date(s + 'T00:00:00Z');
      return d.toLocaleDateString('sv-SE', { month: '2-digit', day: '2-digit' });
    } catch { return s; }
  };

  const latest = data.length ? data[data.length - 1].percent : null;
  const prev = data.length > 1 ? data[data.length - 2].percent : null;
  const delta = latest != null && prev != null ? +(latest - prev).toFixed(2) : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const val = Number(payload[0].value || 0);
    const dateLabel = label;
    const dStr = (() => {
      try { return new Date(dateLabel + 'T00:00:00Z').toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return dateLabel; }
    })();
    const idx = data.findIndex(p => p.date === label);
    const prevVal = idx > 0 ? data[idx-1].percent : null;
    const d = prevVal != null ? +(val - prevVal).toFixed(2) : null;
    const sign = d != null && d !== 0 ? (d > 0 ? '+' : '') : '';
    const color = d == null ? '#b0b0b0' : d > 0 ? '#00e676' : d < 0 ? '#ff6f6f' : '#b0b0b0';
    return (
      <Box sx={{ p: 1, backgroundColor: '#1f1f1f', border: '1px solid #2b2b2b', borderRadius: 1 }}>
        <Typography variant="caption" sx={{ color: '#b0b0b0' }}>{dStr}</Typography>
        <Typography variant="subtitle2" sx={{ color: '#FFCA28', fontWeight: 700 }}>
          {val.toFixed(2)}%
        </Typography>
        {d != null && (
          <Typography variant="caption" sx={{ color, display: 'block' }}>
            {sign}{d.toFixed(2)}pp sedan igår
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Card sx={{
      background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
      padding: { xs: "12px", sm: "16px" },
      width: { xs: "92%", sm: "85%", md: "75%" },
      margin: "16px auto",
      minHeight: 260,
    }}>
      {/* Header: centered title with latest chip */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', textAlign: 'center' }}>
          Blankning – trend
        </Typography>
        {latest != null && (
          <Chip
            size="small"
            label={`Senaste: ${latest.toFixed(2)}%${delta!=null && delta!==0 ? (delta>0?` (↑ ${delta.toFixed(2)}pp)`:` (↓ ${Math.abs(delta).toFixed(2)}pp)`) : ''}`}
            sx={{ backgroundColor: '#2a2a2a', color: '#b0b0b0' }}
          />
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip size="small" label="7D" clickable onClick={() => setRange('7')} sx={{ backgroundColor: range==='7' ? '#00e676' : '#2a2a2a', color: range==='7' ? '#0b0b0b' : '#b0b0b0' }} />
          <Chip size="small" label="30D" clickable onClick={() => setRange('30')} sx={{ backgroundColor: range==='30' ? '#00e676' : '#2a2a2a', color: range==='30' ? '#0b0b0b' : '#b0b0b0' }} />
        </Box>
      </Box>
      {loading ? (
        <CircularProgress size={24} sx={{ color: '#00e676' }} />
      ) : (
        <Box sx={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="shortFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFCA28" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#FFCA28" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2b2b2b" strokeDasharray="3 3" />
              <XAxis dataKey="date" stroke="#b0b0b0" tick={{ fontSize: 12 }} minTickGap={16} tickFormatter={formatDateLabel} />
              <YAxis stroke="#b0b0b0" domain={[yStats.min, yStats.max]} ticks={yStats.ticks} tickFormatter={(v)=>`${v.toFixed(1)}%`} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="percent" fill="url(#shortFill)" stroke="none" />
              <Line type="monotone" dataKey="percent" stroke="#FFCA28" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} strokeLinecap="round" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      )}
      {/* Source and updated info */}
      <Typography variant="caption" sx={{ color: '#808080', display: 'block', mt: 1, textAlign: 'center' }}>
        Källa: <Link href="https://www.fi.se/sv/vara-register/blankningsregistret/emittent/?id=549300SUH6ZR1RF6TA88" target="_blank" rel="noopener" underline="hover" sx={{ color: '#FFCA28' }}>Finansinspektionen (FI) – blankningsregistret</Link>
      </Typography>
      {updatedAt && (
        <Typography variant="caption" sx={{ color: '#808080', display: 'block', textAlign: 'center' }}>
          Senast uppdaterad: {new Date(updatedAt).toLocaleString('sv-SE')}
        </Typography>
      )}
    </Card>
  );
};

export default ShortTrend;
