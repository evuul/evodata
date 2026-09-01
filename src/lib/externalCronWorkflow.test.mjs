// Guards the external cron workflow against accidental Vercel request fan-out.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowUrl = new URL("../../.github/workflows/external-cron.yml", import.meta.url);

test("lobby sync runs only on its dedicated schedule and is serialized", async () => {
  const workflow = await readFile(workflowUrl, "utf8");
  const lobbyJob = workflow.match(/  lobby-sync:\n([\s\S]*?)(?=\n  ath-alerts:)/)?.[0] ?? "";

  assert.match(lobbyJob, /github\.event\.schedule == '7,17,27,37,47,57 \* \* \* \*'/);
  assert.doesNotMatch(lobbyJob, /github\.event_name == 'schedule' \|\|/);
  assert.match(lobbyJob, /group: external-cron-lobby-sync/);
  assert.equal(workflow.match(/\/api\/casinoscores\/cron/g)?.length, 1);
});
