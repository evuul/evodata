// Lists public information pages under the configured canonical origin.

import { resolveSiteUrl } from "@/config/site";

export default function sitemap() {
  const base = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const now = new Date();

  const pages = [
    { path: "/", priority: 1.0 },
    { path: "/founders", priority: 0.7 },
    { path: "/premium", priority: 0.6 },
    { path: "/disclaimer", priority: 0.4 },
    { path: "/privacy", priority: 0.4 },
    { path: "/methodology", priority: 0.5 },
    { path: "/calendar", priority: 0.6 },
  ];

  return pages.map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority,
  }));
}
