const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "alexander.ek@live.se").trim().toLowerCase();

const resolveAccountDisplay = ({ email, firstName }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail && normalizedEmail === ADMIN_EMAIL) {
    return "Alexander";
  }
  const maybeName = String(firstName || "").trim();
  return maybeName || String(email || "").trim();
};

const shell = ({ title, body, preheader = "" }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#0b1220;color:#e2e8f0;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${escapeHtml(preheader)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;background:#0b1220;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:linear-gradient(145deg,#111b31,#0d1630);border:1px solid rgba(148,163,184,.25);border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:26px 28px 10px 28px;">
                <div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#93c5fd;font-weight:700;">EvoTracker</div>
                <h1 style="margin:10px 0 0 0;font-size:28px;line-height:1.2;color:#f8fafc;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 28px 28px;">
                ${body}
                <hr style="border:none;border-top:1px solid rgba(148,163,184,.22);margin:22px 0;" />
                <p style="margin:0;color:#94a3b8;font-size:13px;">
                  EvoTracker • student-built dashboard for Evolution tracking
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const buildWelcomeEmail = ({ email, firstName, coffeeUrl }) => {
  const safeName = escapeHtml(firstName || "there");
  const safeEmail = escapeHtml(email);
  const safeCoffeeUrl = escapeHtml(coffeeUrl || "https://buymeacoffee.com/evuul");
  const body = `
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:16px;">Hi ${safeName}, welcome aboard.</p>
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      Your account is ready with <strong>${safeEmail}</strong>. You now have access to live players, trend analysis,
      forecast modules, and portfolio tracking in one place.
    </p>
    <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#93c5fd;font-weight:800;margin-bottom:8px;">
        Live dashboard preview
      </div>
      <p style="margin:0 0 10px 0;color:#cbd5e1;font-size:14px;line-height:1.6;">
        Follow lobby activity, share price, and market value in real time from the top dashboard cards.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div style="border:1px solid rgba(45,212,191,.35);border-radius:10px;padding:10px;background:rgba(13,26,39,.55);">
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#5eead4;font-weight:800;margin-bottom:8px;">Live players</div>
          <div style="font-size:28px;line-height:1;color:#f8fafc;font-weight:900;">62 908</div>
          <div style="margin-top:8px;font-size:12px;color:#94a3b8;">Latest 15:20</div>
        </div>
        <div style="border:1px solid rgba(56,189,248,.35);border-radius:10px;padding:10px;background:rgba(13,26,39,.55);">
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7dd3fc;font-weight:800;margin-bottom:8px;">Stock price</div>
          <div style="font-size:28px;line-height:1;color:#f8fafc;font-weight:900;">552.80 kr</div>
          <div style="margin-top:8px;font-size:12px;color:#94a3b8;">YTD -11.0%</div>
        </div>
        <div style="border:1px solid rgba(167,139,250,.35);border-radius:10px;padding:10px;background:rgba(13,26,39,.55);">
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#c4b5fd;font-weight:800;margin-bottom:8px;">Market cap</div>
          <div style="font-size:28px;line-height:1;color:#f8fafc;font-weight:900;">116.2B kr</div>
          <div style="margin-top:8px;font-size:12px;color:#94a3b8;">Live estimate</div>
        </div>
      </div>
    </div>
    <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#93c5fd;font-weight:800;margin-bottom:8px;">
        My Page setup
      </div>
      <p style="margin:0 0 10px 0;color:#cbd5e1;font-size:14px;line-height:1.6;">
        Add your shares manually or import your transactions. After that, EvoTracker shows real ownership data based on your holdings.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="border:1px solid rgba(45,212,191,.35);border-radius:10px;padding:10px;background:rgba(13,26,39,.55);">
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#5eead4;font-weight:800;margin-bottom:7px;">Shares over time</div>
          <svg viewBox="0 0 220 70" width="100%" height="70" role="img" aria-label="shares trend preview">
            <defs>
              <linearGradient id="welcomeSharesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.45" />
                <stop offset="100%" stop-color="#2dd4bf" stop-opacity="0.05" />
              </linearGradient>
            </defs>
            <path d="M 0 62 L 18 55 L 35 50 L 58 44 L 80 38 L 105 30 L 130 26 L 160 18 L 188 12 L 220 6" fill="none" stroke="#2dd4bf" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 0 62 L 18 55 L 35 50 L 58 44 L 80 38 L 105 30 L 130 26 L 160 18 L 188 12 L 220 6 L 220 70 L 0 70 Z" fill="url(#welcomeSharesFill)" />
          </svg>
        </div>
        <div style="border:1px solid rgba(125,211,252,.35);border-radius:10px;padding:10px;background:rgba(13,26,39,.55);">
          <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#7dd3fc;font-weight:800;margin-bottom:7px;">Annual dividends</div>
          <svg viewBox="0 0 220 70" width="100%" height="70" role="img" aria-label="dividend bars preview">
            <rect x="8" y="48" width="20" height="20" rx="4" fill="rgba(56,189,248,0.82)" />
            <rect x="44" y="40" width="20" height="28" rx="4" fill="rgba(56,189,248,0.82)" />
            <rect x="80" y="31" width="20" height="37" rx="4" fill="rgba(56,189,248,0.82)" />
            <rect x="116" y="23" width="20" height="45" rx="4" fill="rgba(56,189,248,0.82)" />
            <rect x="152" y="14" width="20" height="54" rx="4" fill="rgba(56,189,248,0.82)" />
            <rect x="188" y="8" width="20" height="60" rx="4" fill="rgba(56,189,248,0.82)" />
          </svg>
        </div>
      </div>
    </div>
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      You can switch the dashboard language between English and Swedish at any time from the top navigation.
    </p>
    <p style="margin:0 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      If EvoTracker helps you, supporting server costs keeps everything fast and free.
    </p>
    <p style="margin:0 0 18px 0;">
      <a href="${safeCoffeeUrl}" target="_blank" rel="noopener"
         style="display:inline-block;padding:11px 16px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#111827;text-decoration:none;font-weight:800;">
         Support EvoTracker
      </a>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:14px;">/ Alexander</p>
  `;
  return {
    subject: "Welcome to EvoTracker",
    html: shell({
      title: "Welcome to EvoTracker",
      preheader: "Your EvoTracker account is ready.",
      body,
    }),
  };
};

export const buildResetPasswordEmail = ({ email, resetUrl }) => {
  const safeEmail = escapeHtml(email);
  const safeResetUrl = escapeHtml(resetUrl);
  const body = `
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      A password reset was requested for <strong>${safeEmail}</strong>.
    </p>
    <p style="margin:0 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      If this was you, use the button below. The link expires in 30 minutes.
    </p>
    <p style="margin:0 0 16px 0;">
      <a href="${safeResetUrl}" target="_blank" rel="noopener"
         style="display:inline-block;padding:11px 16px;border-radius:10px;background:linear-gradient(135deg,#22d3ee,#3b82f6);color:#0b1220;text-decoration:none;font-weight:800;">
         Reset password
      </a>
    </p>
    <p style="margin:0 0 8px 0;color:#94a3b8;font-size:13px;line-height:1.6;">
      If the button does not work, copy this URL:
    </p>
    <p style="margin:0;color:#7dd3fc;font-size:13px;word-break:break-all;">${safeResetUrl}</p>
    <p style="margin:14px 0 0 0;color:#94a3b8;font-size:13px;">
      If you did not request this, you can ignore this message.
    </p>
  `;
  return {
    subject: "Reset your EvoTracker password",
    html: shell({
      title: "Reset your password",
      preheader: "Reset link for your EvoTracker account.",
      body,
    }),
  };
};

export const buildAthAlertEmail = ({
  email,
  firstName,
  events = [],
  topTrends = [],
  coffeeUrl,
}) => {
  const safeName = escapeHtml(firstName || "there");
  const safeAccount = escapeHtml(resolveAccountDisplay({ email, firstName }));
  const safeCoffeeUrl = escapeHtml(coffeeUrl || "https://buymeacoffee.com/evuul");

  const eventRows = (Array.isArray(events) ? events : [])
    .slice(0, 8)
    .map((e) => {
      const name = escapeHtml(e?.name || e?.id || "Unknown");
      const ath = Number(e?.athValue);
      const athLabel = Number.isFinite(ath) ? ath.toLocaleString("sv-SE") : "–";
      const at = e?.athAt ? escapeHtml(e.athAt) : "";
      const cur = Number(e?.currentValue);
      const curLabel = Number.isFinite(cur) ? cur.toLocaleString("sv-SE") : "–";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.18);color:#f8fafc;font-weight:800;">${name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.18);color:#86efac;font-weight:800;">${athLabel}</td>
          <td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.18);color:#cbd5e1;">${curLabel}</td>
          <td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,.18);color:#94a3b8;font-size:12px;">${at}</td>
        </tr>
      `;
    })
    .join("");

  const trendRows = (Array.isArray(topTrends) ? topTrends : [])
    .slice(0, 5)
    .map((t) => {
      const name = escapeHtml(t?.name || t?.id || "Unknown");
      const pct = Number(t?.pctChange);
      const pctLabel = Number.isFinite(pct) ? `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` : "–";
      const color = Number.isFinite(pct) && pct < 0 ? "#fecaca" : "#bbf7d0";
      return `
        <div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(148,163,184,.12);">
          <div style="color:#e2e8f0;font-weight:700;">${name}</div>
          <div style="color:${color};font-weight:900;">${pctLabel}</div>
        </div>
      `;
    })
    .join("");

  const body = `
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:16px;">
      Hi ${safeName}, a new All-Time High (ATH) was detected.
    </p>
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      Account: <strong>${safeAccount}</strong>
    </p>

    <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#93c5fd;font-weight:800;margin-bottom:10px;">
        New ATH
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th align="left" style="padding:0 12px 10px 12px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;">Game</th>
            <th align="left" style="padding:0 12px 10px 12px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;">ATH</th>
            <th align="left" style="padding:0 12px 10px 12px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;">Now</th>
            <th align="left" style="padding:0 12px 10px 12px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1.2px;">At</th>
          </tr>
        </thead>
        <tbody>
          ${eventRows || ""}
        </tbody>
      </table>
    </div>

    ${
      trendRows
        ? `
      <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
        <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#a7f3d0;font-weight:800;margin-bottom:8px;">
          Top trend (last 30d vs prev 30d)
        </div>
        ${trendRows}
      </div>
    `
        : ""
    }

    <p style="margin:16px 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      You can disable ATH emails anytime from <strong>My page</strong>.
    </p>

    <p style="margin:0 0 18px 0;">
      <a href="${safeCoffeeUrl}" target="_blank" rel="noopener"
         style="display:inline-block;padding:11px 16px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#111827;text-decoration:none;font-weight:800;">
         Support EvoTracker
      </a>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:14px;">/ Alexander</p>
  `;

  return {
    subject: "New ATH detected",
    html: shell({
      title: "New ATH detected",
      preheader: "A game just hit a new All-Time High.",
      body,
    }),
  };
};

export const buildDailyAvgPlayersEmail = ({
  email,
  firstName,
  dateLabel,
  totalAvgPlayers,
  changeAbs,
  changePct,
  coverageLabel,
  trendSeries = [],
  topGames = [],
  coffeeUrl,
}) => {
  const safeName = escapeHtml(firstName || "there");
  const safeAccount = escapeHtml(resolveAccountDisplay({ email, firstName }));
  const safeCoffeeUrl = escapeHtml(coffeeUrl || "https://buymeacoffee.com/evuul");

  const totalLabel = Number.isFinite(totalAvgPlayers)
    ? Math.round(totalAvgPlayers).toLocaleString("sv-SE")
    : "–";
  const absLabel = Number.isFinite(changeAbs)
    ? `${changeAbs >= 0 ? "+" : ""}${Math.round(changeAbs).toLocaleString("sv-SE")}`
    : "–";
  const pctLabel = Number.isFinite(changePct)
    ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`
    : "–";
  const deltaColor =
    Number.isFinite(changeAbs) && changeAbs < 0 ? "#fecaca" : "#bbf7d0";

  const topRows = (Array.isArray(topGames) ? topGames : [])
    .slice(0, 5)
    .map((g) => {
      const name = escapeHtml(g?.name || g?.id || "Unknown");
      const avg = Number(g?.avg);
      const avgLabel = Number.isFinite(avg) ? Math.round(avg).toLocaleString("sv-SE") : "–";
      return `
        <div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(148,163,184,.12);">
          <div style="color:#e2e8f0;font-weight:700;">${name}</div>
          <div style="color:#f8fafc;font-weight:900;">${avgLabel}</div>
        </div>
      `;
    })
    .join("");

  const trendRows = (Array.isArray(trendSeries) ? trendSeries : [])
    .filter((row) => Number.isFinite(Number(row?.avgPlayers)))
    .map((row) => ({
      ymd: String(row?.ymd || ""),
      avgPlayers: Number(row?.avgPlayers),
    }))
    .slice(-90);

  const trendChart = (() => {
    if (trendRows.length < 2) return "";
    const movingAverage = (rows, windowSize) =>
      rows.map((_, idx) => {
        const start = Math.max(0, idx - (windowSize - 1));
        const slice = rows.slice(start, idx + 1);
        const sum = slice.reduce((acc, row) => acc + row.avgPlayers, 0);
        return { ...rows[idx], avgPlayers: sum / slice.length };
      });
    const ma7Rows = movingAverage(trendRows, 7);
    const ma30Rows = movingAverage(trendRows, 30);
    const width = 560;
    const height = 170;
    const padX = 14;
    const padY = 14;
    const min = Math.min(...ma30Rows.map((r) => r.avgPlayers));
    const max = Math.max(...ma7Rows.map((r) => r.avgPlayers));
    const range = Math.max(1, max - min);
    const toX = (idx) =>
      padX + (idx / (trendRows.length - 1)) * (width - padX * 2);
    const toY = (value) =>
      height - padY - ((value - min) / range) * (height - padY * 2);
    const ma7LinePath = ma7Rows
      .map((r, idx) => `${idx === 0 ? "M" : "L"} ${toX(idx).toFixed(2)} ${toY(r.avgPlayers).toFixed(2)}`)
      .join(" ");
    const ma30LinePath = ma30Rows
      .map((r, idx) => `${idx === 0 ? "M" : "L"} ${toX(idx).toFixed(2)} ${toY(r.avgPlayers).toFixed(2)}`)
      .join(" ");
    const areaPath =
      `${ma7LinePath} L ${toX(trendRows.length - 1).toFixed(2)} ${(height - padY).toFixed(2)} ` +
      `L ${toX(0).toFixed(2)} ${(height - padY).toFixed(2)} Z`;
    const firstDate = escapeHtml(trendRows[0]?.ymd || "");
    const lastDate = escapeHtml(trendRows[trendRows.length - 1]?.ymd || "");
    const minLabel = Math.round(min).toLocaleString("sv-SE");
    const maxLabel = Math.round(max).toLocaleString("sv-SE");
    const latestMa7Label = Math.round(ma7Rows[ma7Rows.length - 1]?.avgPlayers || 0).toLocaleString("sv-SE");
    const latestMa30Label = Math.round(ma30Rows[ma30Rows.length - 1]?.avgPlayers || 0).toLocaleString("sv-SE");

    return `
      <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
        <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#7dd3fc;font-weight:800;margin-bottom:8px;">
          AVG players trend (90d)
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">
          Smoothed with MA7 (short trend) and MA30 (long trend)
        </div>
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="170" role="img" aria-label="90-day average players trend moving average">
          <defs>
            <linearGradient id="avgTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(2,6,23,0.35)" rx="10" />
          <path d="${areaPath}" fill="url(#avgTrendFill)" />
          <path d="${ma30LinePath}" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />
          <path d="${ma7LinePath}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="${toX(ma7Rows.length - 1).toFixed(2)}" cy="${toY(ma7Rows[ma7Rows.length - 1].avgPlayers).toFixed(2)}" r="4.5" fill="#f8fafc" stroke="#38bdf8" stroke-width="2" />
        </svg>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;color:#94a3b8;font-size:12px;">
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#38bdf8;margin-right:6px;"></span>MA7</span>
          <span><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:#fbbf24;margin-right:6px;"></span>MA30</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:6px;color:#94a3b8;font-size:12px;">
          <span>${firstDate}</span>
          <span>Min: ${minLabel}</span>
          <span>Max: ${maxLabel}</span>
          <span>Latest MA7: <strong style="color:#e2e8f0;">${latestMa7Label}</strong></span>
          <span>Latest MA30: <strong style="color:#fde68a;">${latestMa30Label}</strong></span>
          <span>${lastDate}</span>
        </div>
      </div>
    `;
  })();

  const body = `
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:16px;">
      Hi ${safeName}, here is yesterday’s average lobby activity (tracked games only).
    </p>
    <p style="margin:0 0 14px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      Account: <strong>${safeAccount}</strong>
    </p>

    <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
      <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#93c5fd;font-weight:800;margin-bottom:8px;">
        Daily AVG players (${escapeHtml(dateLabel || "")})
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;">
        <div style="font-size:34px;color:#f8fafc;font-weight:900;line-height:1;">${totalLabel}</div>
        <div style="font-size:14px;color:${deltaColor};font-weight:900;">${absLabel} (${pctLabel}) vs prior day</div>
        <div style="font-size:13px;color:#94a3b8;">${escapeHtml(coverageLabel || "")}</div>
      </div>
    </div>

    ${trendChart}

    ${
      topRows
        ? `
      <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
        <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#a7f3d0;font-weight:800;margin-bottom:8px;">
          Top games by AVG players (14d)
        </div>
        ${topRows}
      </div>
    `
        : ""
    }

    <p style="margin:16px 0 16px 0;color:#cbd5e1;font-size:15px;line-height:1.65;">
      Note: “AVG players” is based on tracked games. Use “Simulate lobby (+10%)” in the live view for a closer match to the full lobby.
    </p>

    <p style="margin:0 0 18px 0;">
      <a href="${safeCoffeeUrl}" target="_blank" rel="noopener"
         style="display:inline-block;padding:11px 16px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#111827;text-decoration:none;font-weight:800;">
         Support EvoTracker
      </a>
    </p>
    <p style="margin:0;color:#94a3b8;font-size:14px;">/ Alexander</p>
  `;

  return {
    subject: `Daily AVG players (${dateLabel || "yesterday"})`,
    html: shell({
      title: "Daily AVG players",
      preheader: "Yesterday’s average players with day-over-day comparison.",
      body,
    }),
  };
};
