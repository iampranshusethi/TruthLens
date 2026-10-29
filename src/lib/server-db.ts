import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { httpFetch } from "@/lib/ai/http";

/**
 * A server-only Supabase client using the secret key (decisions.md D38). It can
 * write usage events and read stats, which browsers can't. Without
 * SUPABASE_SECRET_KEY it's null and stats are simply not recorded.
 */
let client: SupabaseClient | null | undefined;

export function serverDb(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  client =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          // Through the dev proxy, like the AI calls.
          global: {
            fetch: (input, init) =>
              httpFetch(String(input instanceof Request ? input.url : input), { ...init, signal: init?.signal ?? undefined }),
          },
        })
      : null;
  return client;
}

export type UsageEvent = {
  type: "review" | "compare" | "chat" | "ocr";
  kind?: string;
  engine?: string;
  model?: string;
  ok: boolean;
  error_code?: string;
  duration_ms: number;
  findings?: number;
  dropped?: number;
  fallbacks?: number;
  cached?: boolean;
};

/**
 * Records one anonymous usage event: counts and timings only, never document
 * text, user ids or IP addresses. Never throws and never waits more than 2 s,
 * so stats can't slow down or break a review.
 */
export async function recordEvent(event: UsageEvent) {
  const db = serverDb();
  if (!db) return;
  try {
    await Promise.race([
      db.from("usage_events").insert(event).then(({ error }) => {
        if (error) console.warn("[stats] insert failed:", error.message);
      }),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch (e) {
    console.warn("[stats] insert failed:", e);
  }
}
