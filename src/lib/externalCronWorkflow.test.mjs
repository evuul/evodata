// Guards the external cron workflow against accidental Vercel request fan-out.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/external-cron.yml", import.meta.url);

test("lobby sync uses every scheduled wake-up as fallback and is serialized", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const lobbyJob = workflow.match(/  lobby-sync:\n([\s\S]*?)(?=\n  ath-alerts:)/)?.[0] ?? "";

  assert.match(lobbyJob, /github\.event_name == 'schedule' && vars\.LOBBY_SCHEDULER != 'cloudflare'/);
  assert.doesNotMatch(lobbyJob, /github\.event_name == 'schedule' \|\|/);
  assert.match(lobbyJob, /group: external-cron-lobby-sync/);
  assert.equal(workflow.match(/\/api\/casinoscores\/cron/g)?.length, 1);
  assert.equal(workflow.match(/\/api\/unibet-pilot\/cron/g)?.length, 1);
});

test("Cloudflare handover disables duplicate automatic lobby jobs while retaining manual dispatch", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  assert.equal(workflow.match(/vars\.LOBBY_SCHEDULER != 'cloudflare'/g)?.length, 2);
  assert.match(workflow, /workflow_dispatch.*inputs\.job == 'lobby-sync'/);
  assert.match(workflow, /workflow_dispatch.*inputs\.job == 'lobby-snapshot'/);
});
