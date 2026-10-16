import { createMemoryStore } from "./memory.ts";
import { createSupabaseStore } from "./supabase.ts";
import type { Store } from "./types.ts";

export type * from "./types.ts";

// One store per server process. Without Supabase settings, local development uses memory.
const g = globalThis as unknown as { __geokhelStore?: Store };

export function getStore(): Store {
  if (g.__geokhelStore) return g.__geokhelStore;
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) g.__geokhelStore = createSupabaseStore(url, key);
  else if (process.env.NODE_ENV === "production" && !process.env.GEOKHEL_ALLOW_MEMORY_STORE)
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  else g.__geokhelStore = createMemoryStore();
  return g.__geokhelStore;
}
