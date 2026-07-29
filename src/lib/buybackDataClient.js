// Singleton client resource that shares buyback data across dashboard consumers.

import { createClientJsonResource } from "./clientJsonResource.js";

export const buybackDataResource = createClientJsonResource({
  url: "/api/buybacks/data",
  cacheMs: 2 * 60 * 1000,
  timeoutMs: 8_000,
  retries: 1,
});
