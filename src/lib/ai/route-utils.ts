import "server-only";
import { createHash } from "node:crypto";
import { configuredProviders, type Provider, ProviderError } from "@/lib/ai/providers";
import type { Engine, ReviewErrorCode } from "@/lib/types";

/* Best-effort, per-instance protection for the free quota. Shared by every AI route. */
const recent = new Map<string, number[]>();

export function rateLimited(request: Request, bucket = "analyse", perHour = 12) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < 3_600_000);
  if (hits.length >= perHour) return true;
  recent.set(key, [...hits, now]);
  return false;
}

/* Identical requests replay a finished stream instead of spending quota again. */
const cache = new Map<string, object[]>();
const CACHE_SIZE = 40;

export const cacheKey = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export function errorResponse(code: ReviewErrorCode, message: string, status: number) {
  return new Response(`${JSON.stringify({ type: "error", code, message })}\n`, {
    status,
    headers: { "content-type": "application/x-ndjson" },
  });
}

/** Which engine to use: configured providers, or the offline demo in development. */
export function pickEngine(): { providers: Provider[]; demo: boolean } | null {
  const providers = configuredProviders();
  const demo = providers.length === 0 && process.env.NODE_ENV !== "production";
  return providers.length || demo ? { providers, demo } : null;
}

/**
 * Streams events as newline-delimited JSON, caching the full stream on success
 * and turning provider failures into a friendly `error` event.
 */
export function ndjsonStream(
  request: Request,
  key: string,
  produce: (signal: AbortSignal, engine: { current: Engine }) => AsyncIterable<object>,
) {
  const encoder = new TextEncoder();
  const line = (e: object) => encoder.encode(`${JSON.stringify(e)}\n`);
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const cached = cache.get(key);
      if (cached) {
        for (const e of cached) controller.enqueue(line(e));
        controller.close();
        return;
      }
      const events: object[] = [];
      try {
        for await (const e of produce(abort.signal, { current: "gemini" })) {
          events.push(e);
          controller.enqueue(line(e));
        }
        cache.set(key, events);
        if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
      } catch (e) {
        if (abort.signal.aborted) return;
        console.error("[ai] stream failed:", e);
        const quota = e instanceof ProviderError && e.kind === "quota";
        controller.enqueue(
          line({
            type: "error",
            code: quota ? "quota" : "unavailable",
            message: quota
              ? "TruthLens has used today's free AI allowance. Please try again later."
              : "The AI service didn't respond properly. Your document is fine; try again in a moment.",
          }),
        );
      }
      controller.close();
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

export const isCached = (key: string) => cache.has(key);
