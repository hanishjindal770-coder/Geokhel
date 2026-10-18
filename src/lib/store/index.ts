import { createMemoryStore } from "./memory.ts";
import { createUpstashStore } from "./upstash.ts";
import type { Store } from "./types.ts";

export type * from "./types.ts";

// One store per server process. Adding Upstash from the Vercel Marketplace sets the KV_* names;
// a database created on upstash.com shows the UPSTASH_* names. Either works.
// Without them, local development uses an in-memory store.
const g = globalThis as unknown as { __geokhelStore?: Store };

export function getStore(): Store {
  if (g.__geokhelStore) return g.__geokhelStore;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) g.__geokhelStore = createUpstashStore(url, token);
  else if (process.env.NODE_ENV === "production" && !process.env.GEOKHEL_ALLOW_MEMORY_STORE)
    throw new Error("Connect Upstash Redis: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
  else g.__geokhelStore = createMemoryStore();
  return g.__geokhelStore;
}
