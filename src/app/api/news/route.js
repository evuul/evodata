export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'sv';
  const q = searchParams.get('q') || 'Evolution AB OR Evolution Gaming OR EVO.ST';

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const newsApiKey = process.env.NEWSAPI_API_KEY;
  // RSS-källor: stöd både en samlad lista och separata variabler
  const rssListEnv = process.env.NEWS_RSS_URLS;
  const mfnRss = process.env.MFN_RSS_URL;
  const cisionRss = process.env.CISION_RSS_URL;
  const nasdaqRss = process.env.NASDAQ_RSS_URL;
  const rssUrls = (rssListEnv ? rssListEnv.split(',') : [])
    .concat([mfnRss, cisionRss, nasdaqRss].filter(Boolean))
    .map(u => u.trim())
    .filter(Boolean);
  // Sensible default: försök MFN Evolution om inget är konfigurerat
  if (rssUrls.length === 0) {
    rssUrls.push('https://mfn.se/all/a/evolution?format=rss');
  }

  const FAKE_ARTICLES = [
    {
      title: 'Evolution lanserar nytt spel i Live Casino-portföljen',
      url: 'https://example.com/nyhet/evolution-nytt-spel',
      source: 'ExempelMedia',
      publishedAt: new Date().toISOString(),
      snippet: 'Det nya spelet breddar bolagets erbjudande och förstärker positionen på marknaden.',
    },
    {
      title: 'Analytiker höjer riktkursen för Evolution',
      url: 'https://example.com/nyhet/evolution-riktkurs',
      source: 'AnalysHuset',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      snippet: 'Stark tillväxt och robust marginalutveckling anges som skäl till höjningen.',
    },
    {
      title: 'Evolution tecknar avtal med stor operatör i Nordamerika',
      url: 'https://example.com/nyhet/evolution-nordamerika',
      source: 'Spelbranschen Idag',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      snippet: 'Avtalet stärker närvaron på den nordamerikanska marknaden och öppnar för nya intäktsströmmar.',
    },
  ];

  try {
    const tryFetchRssVariants = async (baseUrl) => {
      const variants = [
        baseUrl,
        baseUrl.includes('?') ? `${baseUrl}&format=rss` : `${baseUrl}?format=rss`,
        baseUrl.endsWith('/') ? `${baseUrl}rss` : `${baseUrl}/rss`,
      ];
      for (const vu of variants) {
        try {
          const r = await fetch(vu, { cache: 'no-store' });
          if (!r.ok) continue;
          const text = await r.text();
          if (/<(rss|feed)[^>]*>/i.test(text)) {
            return { xml: text, url: vu };
          }
        } catch {}
      }
      return null;
    };
    // Hjälpare för RSS (stöd både RSS och Atom)
    const parseRss = (xml, sourceHint = '') => {
      const items = [];
      // RSS <item>
      const itemBlocks = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map(m => m[1]);
      const getTag = (s, tag) => {
        const cdata = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\]><\\/${tag}>`).exec(s);
        if (cdata) return cdata[1].trim();
        const plain = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(s);
        return plain ? plain[1].replace(/<.*?>/g, '').trim() : '';
      };
      for (const it of itemBlocks) {
        const title = getTag(it, 'title');
        const link = getTag(it, 'link');
        const pubDate = getTag(it, 'pubDate') || getTag(it, 'dc:date') || '';
        const desc = getTag(it, 'description') || getTag(it, 'content:encoded') || '';
        let source = sourceHint;
        try { source = source || (link ? new URL(link).hostname : ''); } catch {}
        items.push({ title, url: link, source, publishedAt: pubDate ? new Date(pubDate).toISOString() : null, snippet: desc });
      }
      // Atom <entry>
      const entryBlocks = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)).map(m => m[1]);
      const getAttr = (s, tag, attr) => {
        const m = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*>`).exec(s);
        return m ? m[1] : '';
      };
      for (const en of entryBlocks) {
        const title = getTag(en, 'title');
        const href = getAttr(en, 'link', 'href') || getTag(en, 'link');
        const updated = getTag(en, 'updated') || getTag(en, 'published') || '';
        const summary = getTag(en, 'summary');
        let source = sourceHint;
        try { source = source || (href ? new URL(href).hostname : ''); } catch {}
        items.push({ title, url: href, source, publishedAt: updated ? new Date(updated).toISOString() : null, snippet: summary });
      }
      return items.filter(a => a.title && a.url);
    };

    // Försök RSS först om konfigurerat – prioriterar MFN/Cision/Nasdaq
    if (rssUrls.length > 0) {
      let articles = [];
      for (const u of rssUrls) {
        try {
          const got = await tryFetchRssVariants(u);
          if (!got) continue;
          articles = articles.concat(parseRss(got.xml));
        } catch {}
      }
      if (articles.length === 0) articles = FAKE_ARTICLES;
      articles = Array.from(new Map(articles.map(a => [a.url, a])).values())
        .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
        .slice(0, 30);
      return new Response(JSON.stringify({ articles }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    }
    let articles = [];

    if (newsApiKey) {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=${encodeURIComponent(lang)}&sortBy=publishedAt&pageSize=30&apiKey=${newsApiKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('NewsAPI request failed');
      const data = await res.json();
      articles = (data.articles || []).map((n) => ({
        title: n.title,
        url: n.url,
        source: n.source?.name || (n.url ? new URL(n.url).hostname : ''),
        publishedAt: n.publishedAt,
        snippet: n.description || '',
      }));
    }

    // Sort latest first and cap
    articles = articles
      .filter((a) => a.title && a.url)
      .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
      .slice(0, 30);

    return new Response(JSON.stringify({ articles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    // På fel: om RSS är konfigurerat, försök RSS, annars säkra exempel
    if (rssUrls.length > 0) {
      try {
        let rs = [];
        for (const u of rssUrls) {
          const got = await tryFetchRssVariants(u);
          if (!got) continue;
          rs = rs.concat(parseRss(got.xml));
        }
        if (rs.length > 0) {
          rs = Array.from(new Map(rs.map(a => [a.url, a])).values())
            .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
            .slice(0, 30);
          return new Response(JSON.stringify({ articles: rs }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
        }
      } catch {}
    }
    return new Response(JSON.stringify({ articles: FAKE_ARTICLES, error: err.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
