import buybacks from "../data/buybackData.json";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://evodata.app";

function escapeXml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  // Take the most recent 20 buybacks by date
  const items = [...buybacks]
    .filter((x) => x?.Datum)
    .sort((a, b) => new Date(b.Datum) - new Date(a.Datum))
    .slice(0, 20)
    .map((entry) => {
      const date = new Date(entry.Datum);
      const title = `Återköp ${entry.Datum} – ${Number(entry.Antal_aktier || 0).toLocaleString("sv-SE")} aktier`;
      const description = [
        `Antal: ${Number(entry.Antal_aktier || 0).toLocaleString("sv-SE")}`,
        `Snittkurs: ${Number(entry.Snittkurs || 0).toLocaleString("sv-SE", { minimumFractionDigits: 2 })}`,
        `Transaktionsvärde: ${Number(entry.Transaktionsvärde || 0).toLocaleString("sv-SE")}`,
        entry.Procent_dagsvolym != null
          ? `Andel av dagsvolym: ${entry.Procent_dagsvolym}%`
          : null,
      ]
        .filter(Boolean)
        .join(" • ");
      return {
        title,
        link: `${site}/`,
        guid: `buyback-${entry.Datum}-${entry.Antal_aktier}-${entry.Snittkurs}`,
        pubDate: date.toUTCString(),
        description,
      };
    });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>EvoData – Uppdateringar</title>
    <link>${site}/</link>
    <description>Senaste återköp och uppdateringar från EvoData</description>
    <language>sv-SE</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items
      .map(
        (i) => `
    <item>
      <title>${escapeXml(i.title)}</title>
      <link>${escapeXml(i.link)}</link>
      <guid>${escapeXml(i.guid)}</guid>
      <pubDate>${escapeXml(i.pubDate)}</pubDate>
      <description>${escapeXml(i.description)}</description>
    </item>`
      )
      .join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
