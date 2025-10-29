#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const { GAMES } = await import(path.join(projectRoot, "src/config/games.js"));
const {
  getAllSamples,
  rebuildDailyAggregates,
} = await import(path.join(projectRoot, "src/lib/csStore.js"));

async function main() {
  const slugs = Array.from(new Set(GAMES.map((game) => game.id).filter(Boolean)));
  console.log(`Rebuilding daily aggregates for ${slugs.length} series …`);

  for (const slug of slugs) {
    try {
      const samples = await getAllSamples(slug);
      if (!samples.length) {
        console.log(`⚠️  No samples stored for ${slug}, skipping.`);
        continue;
      }
      await rebuildDailyAggregates(slug, samples);
      console.log(`✅  Aggregates rebuilt for ${slug} (${samples.length} samples)`);
    } catch (err) {
      console.error(`❌  Failed rebuilding ${slug}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("Done. Trends will update on next /api/casinoscores/lobby/overview call.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
