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
    const width = 560;
    const height = 170;
    const padX = 14;
    const padY = 14;
    const min = Math.min(...trendRows.map((r) => r.avgPlayers));
    const max = Math.max(...trendRows.map((r) => r.avgPlayers));
    const range = Math.max(1, max - min);
    const toX = (idx) =>
      padX + (idx / (trendRows.length - 1)) * (width - padX * 2);
    const toY = (value) =>
      height - padY - ((value - min) / range) * (height - padY * 2);
    const linePath = trendRows
      .map((r, idx) => `${idx === 0 ? "M" : "L"} ${toX(idx).toFixed(2)} ${toY(r.avgPlayers).toFixed(2)}`)
      .join(" ");
    const areaPath =
      `${linePath} L ${toX(trendRows.length - 1).toFixed(2)} ${(height - padY).toFixed(2)} ` +
      `L ${toX(0).toFixed(2)} ${(height - padY).toFixed(2)} Z`;
    const firstDate = escapeHtml(trendRows[0]?.ymd || "");
    const lastDate = escapeHtml(trendRows[trendRows.length - 1]?.ymd || "");
    const minLabel = Math.round(min).toLocaleString("sv-SE");
    const maxLabel = Math.round(max).toLocaleString("sv-SE");
    const latestLabel = Math.round(trendRows[trendRows.length - 1]?.avgPlayers || 0).toLocaleString("sv-SE");

    return `
      <div style="margin:14px 0 0 0;padding:14px 14px;border-radius:14px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.18);">
        <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#7dd3fc;font-weight:800;margin-bottom:8px;">
          AVG players trend (90d)
        </div>
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="170" role="img" aria-label="90-day average players trend">
          <defs>
            <linearGradient id="avgTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="${width}" height="${height}" fill="rgba(2,6,23,0.35)" rx="10" />
          <path d="${areaPath}" fill="url(#avgTrendFill)" />
          <path d="${linePath}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx="${toX(trendRows.length - 1).toFixed(2)}" cy="${toY(trendRows[trendRows.length - 1].avgPlayers).toFixed(2)}" r="4.5" fill="#f8fafc" stroke="#38bdf8" stroke-width="2" />
        </svg>
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:6px;color:#94a3b8;font-size:12px;">
          <span>${firstDate}</span>
          <span>Min: ${minLabel}</span>
          <span>Max: ${maxLabel}</span>
          <span>Latest: <strong style="color:#e2e8f0;">${latestLabel}</strong></span>
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
          Top games by AVG players
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
