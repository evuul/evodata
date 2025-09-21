export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://evodata.app";
  const now = new Date();

  const pages = [
    { path: "/", priority: 1.0 },
  ];

  return pages.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority,
  }));
}
