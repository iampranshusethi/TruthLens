import { demoModel } from "@/lib/ai/demo";
import { streamWithFallback } from "@/lib/ai/providers";
import { reviewPrompt } from "@/lib/ai/prompt";
import { reviewEvents } from "@/lib/ai/review";
import { cacheKey, errorResponse, isCached, ndjsonStream, pickEngine, rateLimited, reserveGeneration } from "@/lib/ai/route-utils";
import { reviewRequest } from "@/lib/ai/schema";

// Free tiers can take a while on long documents.
export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = reviewRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.message === "too_long" || i.code === "too_big");
    return tooLong
      ? errorResponse("too_long", "This document is longer than TruthLens can read in one go (about 20 pages).", 413)
      : errorResponse("bad_request", "Something about that document couldn't be read.", 400);
  }
  const req = parsed.data;

  const engine = pickEngine();
  if (!engine) return errorResponse("not_configured", "Live reviews aren't switched on yet.", 503);
  const { providers, demo } = engine;

  const { system, user } = reviewPrompt(req);
  // The prompt is part of the key, so improving it never serves stale cached reviews.
  const key = cacheKey(["review", demo, system, user]);
  if (!isCached(key) && !demo && rateLimited(request)) {
    return errorResponse("rate_limited", "You've reviewed a lot of documents this hour. Try again in a little while.", 429);
  }

  const generation = await reserveGeneration(request, demo || isCached(key));
  if (generation instanceof Response) return generation;

  const response = ndjsonStream(
    request,
    key,
    { type: "review", kind: req.kind },
    (signal, used) => {
      used.current = demo ? "demo" : "gemini";
      const text = demo
        ? demoModel(req)
        : streamWithFallback(providers, { system, messages: [{ role: "user", text: user }], maxTokens: 8192, signal }, (e, info) =>
            Object.assign(used, { current: e, ...info }),
          );
      return reviewEvents(req, text, () => used.current);
    },
    generation.release,
  );
  for (const [k, v] of Object.entries(generation.headers)) response.headers.set(k, v);
  return response;
}
