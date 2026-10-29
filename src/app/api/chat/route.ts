import { chatPrompt, chatRequest, demoChat } from "@/lib/ai/chat";
import { ProviderError, streamWithFallback } from "@/lib/ai/providers";
import { errorResponse, pickEngine, rateLimited } from "@/lib/ai/route-utils";

export const maxDuration = 30;

/** Streams a plain-text answer grounded in the document. */
export async function POST(request: Request) {
  const parsed = chatRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("bad_request", "That question couldn't be sent.", 400);
  const req = parsed.data;

  const engine = pickEngine();
  if (!engine) return errorResponse("not_configured", "Questions aren't switched on yet.", 503);
  if (!engine.demo && rateLimited(request, "chat", 40)) {
    return errorResponse("rate_limited", "That's a lot of questions this hour. Try again in a little while.", 429);
  }

  const abort = new AbortController();
  request.signal.addEventListener("abort", () => abort.abort());
  const { system, messages } = chatPrompt(req);
  const text = engine.demo
    ? demoChat(req)
    : streamWithFallback(engine.providers, { system, messages, maxTokens: 700, signal: abort.signal }, () => {});

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of text) controller.enqueue(encoder.encode(chunk));
      } catch (e) {
        if (!abort.signal.aborted) {
          console.error("[chat] failed:", e);
          const quota = e instanceof ProviderError && e.kind === "quota";
          controller.enqueue(
            encoder.encode(
              quota
                ? "\n\nTruthLens has used today's free AI allowance, so I can't answer right now. Please try again later."
                : "\n\nSorry, the answer was cut off. Please ask again.",
            ),
          );
        }
      }
      controller.close();
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
