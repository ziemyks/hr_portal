import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Data changes ~3×/day (scrape at 09/12/15 Riga), so a 15-minute cache is plenty.
export const REVALIDATE_SECONDS = 900;

// The Next.js data cache survives deploys on Vercel. The version header is part of the
// cache key, so every deploy starts fresh (new SQL shapes are never served from an old cache).
const CACHE_VERSION = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local";

let client: SupabaseClient<any, "blt"> | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Service-role client for the `blt` schema. Server-only: the key bypasses RLS and
 * can reach every schema of the shared project, so it must never reach the browser.
 */
export function db() {
  if (client) return client;
  // Accept the REST endpoint form too (".../rest/v1/"); supabase-js wants the bare project URL.
  const url = process.env.SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL un SUPABASE_SERVICE_ROLE_KEY nav iestatīti (.env.local / Vercel env).");
  }
  client = createClient(url, key, {
    db: { schema: "blt" },
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("x-portal-cache-version", CACHE_VERSION);
        return fetch(input, { ...init, headers, next: { revalidate: REVALIDATE_SECONDS, tags: ["blt"] } });
      },
    },
  });
  return client;
}
