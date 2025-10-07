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

  // Bygg källista: bara MFN + Cision (ev. Nasdaq) + ev. egna via .env
  let rssUrls = []
    .concat(rssListEnv ? rssListEnv.split(',') : [])
    .concat([mfnRss, cisionRss, nasdaqRss].filter(Boolean))
    .map((u) => u && u.trim())
    .filter(Boolean);
  // Defaults om inget satt
  if (rssUrls.length === 0) {
    // MFN listing (HTML) for Evolution — more reliable than tag RSS
    rssUrls.push('https://mfn.se/all/a/evolution');
    // Cision official press release feeds (English + Swedish)
    // Using /rss/latest which is stable and contains latest releases including buyback notices
    rssUrls.push('https://news.cision.com/evolution/rss/latest');
    rssUrls.push('https://news.cision.com/se/evolution/rss/latest');
  }

  // Ensure Cision press releases are included even if env only sets MFN
  const hasCision = rssUrls.some(u => /news\.cision\.com\//.test(String(u)));
  if (!hasCision) {
    rssUrls.push('https://news.cision.com/evolution/rss/latest');
    rssUrls.push('https://news.cision.com/se/evolution/rss/latest');
  }

  // Dedupe final RSS list och begränsa hur många källor vi provar per request
  const MAX_PRIMARY_SOURCE_FETCHES = 4;
  const TARGET_ARTICLE_COUNT = 20;
  const MIN_ARTICLES_FOR_GOOGLE = 6;
  rssUrls = Array.from(new Set(rssUrls)).slice(0, MAX_PRIMARY_SOURCE_FETCHES);

  // Förbered Google News RSS som fallback om ovan inte ger träffar
  const langLower = String(lang || 'sv').toLowerCase();
  const hl = langLower === 'sv' ? 'sv' : langLower;
  const gl = 'SE';
  const ceid = `${gl}:${hl}`;
  const googleNewsRss = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

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
    // Enkel HTML-parser för MFN-listor (fallback när RSS ej fungerar)
    const parseMfnList = (html, base = 'https://mfn.se') => {
      const out = [];
      const blocks = Array.from(html.matchAll(/<div class=\"short-item[\s\S]*?>([\s\S]*?)<\/div>\s*<\/div>/g)).map(m => m[1]);
      const strip = (s) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      for (const b of blocks) {
        const dateM = /<span class=\"compressed-date\">([^<]+)<\/span>/.exec(b);
        const timeM = /<span class=\"compressed-time\">([^<]+)<\/span>/.exec(b);
        const titleM = /<a[^>]*class=\"title-link item-link\"[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/.exec(b);
        if (!titleM) continue;
        const href = titleM[1];
        const title = strip(titleM[2]);
        const url = href.startsWith('http') ? href : base + href;
        let publishedAt = null;
        if (dateM && timeM) {
          const iso = `${dateM[1]}T${timeM[1]}Z`;
          const dt = new Date(iso);
          if (!isNaN(dt.getTime())) publishedAt = dt.toISOString();
        }
        out.push({ title, url, source: 'MFN', publishedAt, snippet: '' });
      }
      return out;
    };
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
        let source = getTag(it, 'source') || sourceHint;
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

    const normalizeUrl = (url) => {
      try {
        const u = new URL(url);
        // Ta bort vanliga tracking-parametrar
        for (const key of [...u.searchParams.keys()]) {
          if (/^utm_/i.test(key) || key === 'oc' || key === 'utm' || key === 'gclid' || key === 'fbclid') {
            u.searchParams.delete(key);
          }
        }
        return u.toString();
      } catch {
        return url;
      }
    };

    const tryResolveGoogleNews = async (url) => {
      try {
        const u = new URL(url);
        if (!u.hostname.includes('news.google.com')) return url;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EvoDataBot/1.0; +https://evodata.app)' } });
        clearTimeout(timeout);
        if (res && res.url && !res.url.includes('news.google.com')) {
          return normalizeUrl(res.url);
        }
        return url;
      } catch {
        return url;
      }
    };

    // Försök RSS först om konfigurerat – prioriterar MFN/Cision/Nasdaq
    if (rssUrls.length > 0) {
      let articles = [];
      // Hämta pressflöden (MFN/Cision/Nasdaq)
      for (const u of rssUrls) {
        try {
          const got = await tryFetchRssVariants(u);
          if (got) {
            articles = articles.concat(parseRss(got.xml));
            if (articles.length >= TARGET_ARTICLE_COUNT) break;
          } else {
            // MFN saknar ibland RSS – parsa HTML-listan
            if (/mfn\.se\//.test(String(u))) {
              const tryUrls = [String(u), 'https://mfn.se/all/a/evolution', 'https://www.mfn.se/all/a/evolution'];
              for (const mu of tryUrls) {
                try {
                  const r = await fetch(mu, { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EvoDataBot/1.0)' } });
                  if (!r.ok) continue;
                  const html = await r.text();
                  const items = parseMfnList(html);
                  if (items.length) {
                    articles = articles.concat(items);
                    break;
                  }
                } catch {}
              }
              if (articles.length >= TARGET_ARTICLE_COUNT) break;
            }
          }
        } catch {}
        if (articles.length >= TARGET_ARTICLE_COUNT) break;
      }
      // Hämta även Google News och kombinera för bredare täckning (analys/media)
      if (articles.length < MIN_ARTICLES_FOR_GOOGLE) {
        try {
          const got = await tryFetchRssVariants(googleNewsRss);
          if (got) {
            articles = articles.concat(parseRss(got.xml, 'Google News'));
          }
        } catch {}
      }
      if (articles.length === 0) articles = FAKE_ARTICLES;

      // Försök översätta Google News-länkar till original för de 10 första
      const head = await Promise.all(
        articles.slice(0, 10).map(async (a) => ({
          ...a,
          url: await tryResolveGoogleNews(a.url),
        }))
      );
      const tail = articles.slice(10);
      articles = head.concat(tail);

      // Visa endast svenska versioner av återköps-press (droppa engelska "Acquisitions of own shares")
      articles = articles.filter(a => !/Acquisitions of own shares/i.test(a.title || ''));
      // Droppa återköps-nyheter från Cision (behåll MFN:s version)
      const isBuyback = (t) => /Återköp av aktier i Evolution AB|Acquisitions of own shares/i.test(t || '');
      const isFromCision = (a) => {
        try {
          const src = (a.source || '').toLowerCase();
          if (src.includes('cision')) return true;
          const host = new URL(a.url).hostname.toLowerCase();
          return host.includes('cision');
        } catch { return false; }
      };
      articles = articles.filter(a => !(isBuyback(a.title) && isFromCision(a)));

      // Deduplikera på normaliserad URL
      articles = Array.from(new Map(articles.map(a => [normalizeUrl(a.url), { ...a, url: normalizeUrl(a.url) }])).values())
        .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
        .slice(0, TARGET_ARTICLE_COUNT);
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
      .slice(0, TARGET_ARTICLE_COUNT);

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
          // Samma filtrering i fallback: ta bort engelska buybacks och Cision-buybacks
          rs = rs.filter(a => !/Acquisitions of own shares/i.test(a.title || ''));
          rs = rs.filter(a => {
            const isBuyback = /Återköp av aktier i Evolution AB|Acquisitions of own shares/i.test(a.title || '');
            const isCision = (() => { try { const h = new URL(a.url).hostname.toLowerCase(); return h.includes('cision'); } catch { return (a.source||'').toLowerCase().includes('cision'); } })();
            return !(isBuyback && isCision);
          });
          rs = Array.from(new Map(rs.map(a => [a.url, a])).values())
            .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))
            .slice(0, TARGET_ARTICLE_COUNT);
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
