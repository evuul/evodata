#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const SOURCE_BASE_URL = process.env.SOURCE_BASE_URL ?? "http://localhost:3000";
const BACKFILL_DAYS = Math.max(1, Number(process.env.BACKFILL_DAYS ?? 365));

const { GAMES } = await import(path.join(projectRoot, "src/config/games.js"));
const { saveSample } = await import(path.join(projectRoot, "src/lib/csStore.js"));

const SERIES_SLUGS = Array.from(new Set(GAMES.map((game) => game.id)));
const SLUGS_FROM_ENV = (process.env.SLUGS || "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

const SLUG_LIMIT = Number.isFinite(Number(process.env.SLUG_LIMIT))
  ? Number(process.env.SLUG_LIMIT)
  : null;
const POINT_LIMIT = Number.isFinite(Number(process.env.POINT_LIMIT))
  ? Number(process.env.POINT_LIMIT)
  : null;
const POINT_OFFSET = Number.isFinite(Number(process.env.POINT_OFFSET))
  ? Number(process.env.POINT_OFFSET)
  : 0;

let targetSlugs = SLUGS_FROM_ENV.length ? SLUGS_FROM_ENV : SERIES_SLUGS;
if (SLUG_LIMIT != null && SLUG_LIMIT > 0) {
  targetSlugs = targetSlugs.slice(0, SLUG_LIMIT);
}

async function fetchSeries(slug) {
  const url = `${SOURCE_BASE_URL.replace(/\/+$/, "")}/api/casinoscores/series/${encodeURIComponent(
    slug
  )}?days=${BACKFILL_DAYS}&lite=0`;

  console.log(`🌐 Fetching data for ${slug}...`);
  console.log(`➡️  URL: ${url}`);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-store",
    },
  });

  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}) for ${url}`);
  }

  const json = await res.json();
  const pointsCount = Array.isArray(json?.points) ? json.points.length : 0;
  console.log(`📦 Received ${pointsCount} points for ${slug}`);
  return json;
}

async function backfillSlug(slug) {
  try {
    const data = await fetchSeries(slug);

    let points = Array.isArray(data?.points)
      ? data.points
          .map((p) => ({
            ts: Number(p?.ts),
            value: Number(p?.value ?? p?.players),
          }))
          .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.value) && p.value > 0)
          .sort((a, b) => a.ts - b.ts)
      : [];

    console.log(`🔍 After filtering: ${points.length} valid points for ${slug}`);

    if (POINT_OFFSET > 0 && POINT_OFFSET < points.length) {
      points = points.slice(POINT_OFFSET);
      console.log(`⏩ Applied offset (${POINT_OFFSET}), now ${points.length} points`);
    }

    if (POINT_LIMIT && POINT_LIMIT > 0 && POINT_LIMIT < points.length) {
      points = points.slice(0, POINT_LIMIT);
      console.log(`⏸️ Applied limit (${POINT_LIMIT}), now ${points.length} points`);
    }

    if (!points.length) {
      console.warn(`⚠️  No points to backfill for ${slug}`);
      return;
    }

    console.log(`💾 Starting backfill for ${slug}...`);
    let inserted = 0;

    for (const { ts, value } of points) {
      const isoTs = new Date(ts).toISOString();
      await saveSample(slug, isoTs, value);
      inserted += 1;

      // logga var 200:e datapunkt
      if (inserted % 200 === 0) {
        console.log(`   ↳ ${slug}: ${inserted}/${points.length} samples saved...`);
      }
    }

    console.log(`✅ Done! Backfilled ${inserted} samples for ${slug}`);
  } catch (err) {
    console.error(`❌ Failed backfilling ${slug}:`, err instanceof Error ? err.message : err);
  }
}

async function main() {
  console.log(
    `🚀 Starting backfill from ${SOURCE_BASE_URL} (last ${BACKFILL_DAYS} days) for ${targetSlugs.length} series…`
  );
  if (POINT_OFFSET || POINT_LIMIT) {
    console.log(
      `Processing subset: offset=${POINT_OFFSET || 0}, limit=${POINT_LIMIT || "∞"} per series.`
    );
  }

  for (const slug of targetSlugs) {
    console.log(`\n==============================`);
    console.log(`🎯 Processing series: ${slug}`);
    console.log(`==============================\n`);
    await backfillSlug(slug);
  }

  console.log(`\n🏁 Backfill complete.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});