import data from "../data/financialReports.json";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://evodata.app";
const qOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };

function escapeXml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const items = [...(data?.financialReports || [])]
    .filter((r) => r?.year && r?.quarter)
    .sort((a, b) => (b.year - a.year) || (qOrder[b.quarter] - qOrder[a.quarter]))
    .slice(0, 20)
    .map((r) => {
      const title = `Rapport ${r.year} ${r.quarter} – Omsättning ${Number(r.operatingRevenues || 0).toLocaleString("sv-SE")} €M`;
      const description = [
        r.adjustedEBITDA != null ? `EBITDA: ${r.adjustedEBITDA} €M (${r.adjustedEBITDAMargin}% marginal)` : null,
        r.adjustedOperatingProfit != null ? `Rörelseresultat: ${r.adjustedOperatingProfit} €M` : null,
        r.adjustedProfitForPeriod != null ? `Periodens resultat: ${r.adjustedProfitForPeriod} €M` : null,
      ].filter(Boolean).join(" • ");
      const pubDate = new Date(Date.UTC(r.year, (qOrder[r.quarter] - 1) * 3 + 1, 1)).toUTCString();
      return {
        title,
        link: `${site}/`,
        guid: `report-${r.year}-${r.quarter}`,
        pubDate,
        description,
      };
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>EvoData – Finansiella rapporter</title>
    <link>${site}/</link>
    <description>Senaste finansiella rapporter och nyckeltal</description>
    <language>sv-SE</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items.map(i => `
    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <guid>${escapeXml(i.guid)}</guid>
      <pubDate>${escapeXml(i.pubDate)}</pubDate>
      <description>${escapeXml(i.description)}</description>
    </item>`).join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
