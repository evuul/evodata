export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang') || 'sv';
  const q = searchParams.get('q') || 'Evolution AB OR Evolution Gaming OR EVO.ST';

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const finnhubKey = process.env.FINNHUB_API_KEY;
  const newsApiKey = process.env.NEWSAPI_API_KEY;

  try {
    let articles = [];

    if (finnhubKey) {
      const url = `https://finnhub.io/api/v1/company-news?symbol=EVO.ST&from=${fmt(from)}&to=${fmt(to)}&token=${finnhubKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Finnhub request failed');
      const data = await res.json();
      articles = (data || []).map((n) => ({
        title: n.headline,
        url: n.url,
        source: n.source || (n.url ? new URL(n.url).hostname : ''),
        publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : null,
        snippet: n.summary || '',
      }));
    } else if (newsApiKey) {
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
    } else {
      // Fallback: Google News RSS (nyckelfritt)
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${lang}&gl=SE&ceid=SE:${lang}`;
      const res = await fetch(rssUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('RSS request failed');
      const xml = await res.text();
      const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g)).map((m) => m[1]);
      const getTag = (s, tag) => {
        const cdata = new RegExp(`<${tag}><!\[CDATA\[([\\s\\S]*?)\]\]><\\/${tag}>`).exec(s);
        if (cdata) return cdata[1].trim();
        const plain = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(s);
        return plain ? plain[1].replace(/<.*?>/g, '').trim() : '';
      };
      articles = items.map((it) => {
        const title = getTag(it, 'title');
        const link = getTag(it, 'link');
        const pubDate = getTag(it, 'pubDate');
        const desc = getTag(it, 'description');
        let source = '';
        try { source = link ? new URL(link).hostname : ''; } catch {}
        return {
          title,
          url: link,
          source,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
          snippet: desc,
        };
      });
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
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

