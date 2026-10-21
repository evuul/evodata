// Publishes crawler rules using the same canonical origin as page metadata.

import { resolveSiteUrl } from "@/config/site";

export default function robots() {
  const base = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

