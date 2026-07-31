export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://evotracker.org";
  const now = new Date();

  const pages = [
    { path: "/", priority: 1.0 },
    { path: "/founders", priority: 0.7 },
    { path: "/disclaimer", priority: 0.4 },
  ];

  return pages.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority,
  }));
}
