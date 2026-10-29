import { compareEvents, comparePrompt, compareRequest, demoCompareModel } from "@/lib/ai/compare";
import { streamWithFallback } from "@/lib/ai/providers";
import { cacheKey, errorResponse, isCached, ndjsonStream, pickEngine, rateLimited } from "@/lib/ai/route-utils";

export const maxDuration = 60;

export async function POST(request: Request) {
  const parsed = compareRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const tooLong = parsed.error.issues.some((i) => i.message === "too_long" || i.code === "too_big");
    return tooLong
      ? errorResponse("too_long", "Together these documents are too long to compare in one go. Try shorter versions.", 413)
      : errorResponse("bad_request", "Something about those documents couldn't be read.", 400);
  }
  const req = parsed.data;

  const engine = pickEngine();
  if (!engine) return errorResponse("not_configured", "Live comparisons aren't switched on yet.", 503);
  const { providers, demo } = engine;

  const { system, user } = comparePrompt(req);
  // The prompt is part of the key, so improving it never serves stale cached comparisons.
  const key = cacheKey(["compare", demo, system, user]);
  if (!isCached(key) && !demo && rateLimited(request)) {
    return errorResponse("rate_limited", "You've run a lot of comparisons this hour. Try again in a little while.", 429);
  }

  return ndjsonStream(request, key, { type: "compare", kind: req.kind }, (signal, used) => {
    used.current = demo ? "demo" : "gemini";
    const text = demo
      ? demoCompareModel(req)
      : streamWithFallback(providers, { system, messages: [{ role: "user", text: user }], maxTokens: 6000, signal }, (e, info) => Object.assign(used, { current: e, ...info }));
    return compareEvents(req, text, () => used.current);
  });
}
