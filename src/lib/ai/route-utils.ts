import "server-only";
import { createHash } from "node:crypto";
import { configuredProviders, type Provider, ProviderError } from "@/lib/ai/providers";
import { LIMIT_MESSAGE, takeGeneration } from "@/lib/quota";
import { recordEvent, type UsageEvent } from "@/lib/server-db";
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

export function errorResponse(code: ReviewErrorCode, message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(`${JSON.stringify({ type: "error", code, message })}\n`, {
    status,
    headers: { "content-type": "application/x-ndjson", ...headers },
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
/** What produced a stream: set by the route as the model answers, read for usage stats. */
export type EngineInfo = { current: Engine; model?: string; fallbacks?: number };

/** Summarises a finished stream into one anonymous usage event (decisions.md D38). */
function summarise(events: object[], usage: Pick<UsageEvent, "type" | "kind">, engine: EngineInfo, startedAt: number, cached: boolean): UsageEvent {
  const typed = events as { type: string; count?: number; code?: string }[];
  const error = typed.find((e) => e.type === "error");
  return {
    ...usage,
    engine: engine.current,
    model: engine.model,
    fallbacks: engine.fallbacks,
    ok: !error,
    error_code: error?.code,
    duration_ms: Date.now() - startedAt,
    findings: typed.filter((e) => e.type === "finding" || e.type === "row").length,
    dropped: typed.find((e) => e.type === "dropped")?.count ?? 0,
    cached,
  };
}

export function ndjsonStream(
  request: Request,
  key: string,
  usage: Pick<UsageEvent, "type" | "kind">,
  produce: (signal: AbortSignal, engine: EngineInfo) => AsyncIterable<object>,
  /** Called once with the run's summary, e.g. to give back a daily generation after a failure. */
  onFinish?: (summary: UsageEvent) => Promise<void> | void,
) {
  const encoder = new TextEncoder();
  const line = (e: object) => encoder.encode(`${JSON.stringify(e)}\n`);
  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const cached = cache.get(key);
      const engine: EngineInfo = { current: "gemini" };
      if (cached) {
        for (const e of cached) controller.enqueue(line(e));
        controller.close();
        await recordEvent(summarise(cached, usage, { current: "sample", model: "cache" }, startedAt, true));
        return;
      }
      const events: object[] = [];
      try {
        for await (const e of produce(abort.signal, engine)) {
          events.push(e);
          controller.enqueue(line(e));
        }
        cache.set(key, events);
        if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
      } catch (e) {
        if (abort.signal.aborted) return;
        console.error("[ai] stream failed:", e);
        const quota = e instanceof ProviderError && e.kind === "quota";
        const error = {
          type: "error",
          code: quota ? "quota" : "unavailable",
          message: quota
            ? "TruthLens has used today's free AI allowance. Please try again later."
            : "The AI service didn't respond properly. Your document is fine; try again in a moment.",
        };
        events.push(error);
        controller.enqueue(line(error));
      }
      controller.close();
      // After the user has everything: record one anonymous event for the stats page.
      const summary = summarise(events, usage, engine, startedAt, false);
      await onFinish?.(summary);
      if (engine.current !== "demo") await recordEvent(summary);
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

/**
 * Takes one of the caller's daily generations before an AI run (decisions.md D39).
 * Cached results and the offline demo are free. Returns an error response when
 * the limit is reached, or what the route needs to finish: a way to give the
 * generation back if the run fails, and a device cookie to set.
 */
export async function reserveGeneration(
  request: Request,
  free: boolean,
): Promise<Response | { release: (summary: UsageEvent) => Promise<void>; headers: Record<string, string> }> {
  if (free) return { release: async () => {}, headers: {} };
  const check = await takeGeneration(request);
  const headers: Record<string, string> = check.cookie ? { "set-cookie": check.cookie } : {};
  if (!check.ok) return errorResponse(check.code, LIMIT_MESSAGE[check.code], 429, headers);
  return {
    headers,
    // A run that failed before producing anything shouldn't cost the user a turn.
    release: async (summary) => {
      if (!summary.ok && !summary.findings) await check.release();
    },
  };
}
