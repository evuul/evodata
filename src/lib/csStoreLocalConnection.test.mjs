// Ensures a stopped development Redis cannot hang storage initialization or crash the server.

import assert from "node:assert/strict";
import test from "node:test";
import net from "node:net";
import { spawnSync } from "node:child_process";

test("a refused local connection resolves through the configured fallback instead of retrying forever", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const moduleUrl = new URL("./csStore.js", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval",
    `import { getKv } from ${JSON.stringify(moduleUrl)}; if (await getKv() !== undefined) process.exitCode = 1;`,
  ], { timeout: 4000, encoding: "utf8", env: {
    ...process.env, NODE_ENV: "development", DEBUG_CS: "0",
    LOCAL_REDIS_URL: `redis://127.0.0.1:${port}`, KV_REST_API_URL: "", KV_REST_API_TOKEN: "",
  } });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});
