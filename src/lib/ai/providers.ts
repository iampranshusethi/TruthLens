import "server-only";
import { httpFetch, sseData } from "@/lib/ai/http";
import type { Engine } from "@/lib/types";

export type ChatTurn = { role: "user" | "assistant"; text: string };
export type CompletionRequest = { system: string; messages: ChatTurn[]; maxTokens: number; signal: AbortSignal };

export class ProviderError extends Error {
  constructor(
    message: string,
    /** "quota" when the free tier's limit is hit, so the UI can say so plainly. */
    public kind: "quota" | "unavailable" = "unavailable",
  ) {
    super(message);
  }
}

export type Provider = {
  engine: Engine;
  /** The model id, recorded in usage stats. */
  model: string;
  /** Streams the model's text output, chunk by chunk. */
  stream: (req: CompletionRequest) => AsyncGenerator<string>;
};

async function fail(provider: string, res: Response): Promise<never> {
  const body = (await res.text().catch(() => "")).slice(0, 300);
  throw new ProviderError(`${provider} ${res.status}: ${body}`, res.status === 429 ? "quota" : "unavailable");
}

/* ---------- Gemini (decisions.md D5) ---------- */

/**
 * Free-tier models come and go and are often "experiencing high demand", so
 * Gemini is a chain of models tried newest first (decisions.md D31).
 * GEMINI_MODEL, if set, replaces the chain; it can be a comma-separated list.
 */
export const GEMINI_MODELS = (process.env.GEMINI_MODEL || "gemini-3.6-flash,gemini-3.5-flash,gemini-3.8-flash,gemini-flash-lite-latest")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const gemini = (model: string): Provider => ({
  engine: "gemini",
  model,
  async *stream({ system, messages, maxTokens, signal }) {
    // Gemini 3.x thinks before answering by default; "low" gets findings streaming sooner.
    const thinkingLevel = process.env.GEMINI_THINKING_LEVEL || (model.startsWith("gemini-3") ? "low" : undefined);
    const res = await httpFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        signal,
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: messages.map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: maxTokens,
            ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
          },
        }),
      },
    );
    if (!res.ok || !res.body) await fail(`Gemini ${model}`, res);
    for await (const data of sseData(res.body!)) {
      const json = JSON.parse(data);
      const candidate = json.candidates?.[0];
      const parts: { text?: string; thought?: boolean }[] = candidate?.content?.parts ?? [];
      for (const p of parts) if (p.text && !p.thought) yield p.text;
      if (candidate?.finishReason && candidate.finishReason !== "STOP") {
        console.warn(`[ai] ${model} stopped early: ${candidate.finishReason}`, json.usageMetadata ?? "");
      }
    }
  },
});

/* ---------- Groq (OpenAI-compatible) ---------- */

// llama-3.3-70b-versatile was retired from Groq; gpt-oss-120b is its strongest general model now.
const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const groq: Provider = {
  engine: "groq",
  model: groqModel,
  async *stream({ system, messages, maxTokens, signal }) {
    const res = await httpFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: groqModel,
        stream: true,
        temperature: 0.2,
        // gpt-oss models reason before answering; keep that short so output starts streaming quickly.
        ...(groqModel.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
        // Reasoning tokens count against max_tokens, so leave headroom.
        max_tokens: maxTokens + 2048,
        messages: [{ role: "system", content: system }, ...messages.map((m) => ({ role: m.role, content: m.text }))],
      }),
    });
    if (!res.ok || !res.body) await fail("Groq", res);
    for await (const data of sseData(res.body!)) {
      if (data === "[DONE]") return;
      const text = JSON.parse(data).choices?.[0]?.delta?.content;
      if (text) yield text;
    }
  },
};

/** Providers to try, in order. Empty when no API key is configured. */
// Built once, so per-provider state (the cooldown below) survives between requests.
const geminiProviders = GEMINI_MODELS.map(gemini);

export function configuredProviders(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GEMINI_API_KEY) list.push(...geminiProviders);
  if (process.env.GROQ_API_KEY) list.push(groq);
  return list;
}

/** How long a model may take to start answering before the next one is tried. */
const FIRST_CHUNK_MS = 15_000;

/**
 * A model that just failed is skipped for a few minutes, so the next request
 * goes straight to one that's working instead of waiting on the same timeout.
 */
const COOLDOWN_MS = 5 * 60_000;
const failedAt = new Map<Provider, number>();

function healthyFirst(providers: Provider[]) {
  const now = Date.now();
  const cooling = (p: Provider) => now - (failedAt.get(p) ?? 0) < COOLDOWN_MS;
  // Cooling-down providers go last rather than being dropped: if everything failed recently, still try them.
  return [...providers.filter((p) => !cooling(p)), ...providers.filter(cooling)];
}

/**
 * Streams from the first provider that starts answering (decisions.md D5, D31).
 * A provider that errors, or says nothing within FIRST_CHUNK_MS, is abandoned
 * for the next one. A failure mid-answer is reported instead, since output was
 * already shown.
 */
export async function* streamWithFallback(
  providers: Provider[],
  req: CompletionRequest,
  onEngine: (engine: Engine, info: { model: string; fallbacks: number }) => void,
): AsyncGenerator<string> {
  let lastError: ProviderError | null = null;
  let fallbacks = 0;
  for (const provider of healthyFirst(providers)) {
    if (req.signal.aborted) break;
    // Each attempt gets its own signal, so a slow one can be cancelled without cancelling the request.
    const attempt = new AbortController();
    const onAbort = () => attempt.abort();
    req.signal.addEventListener("abort", onAbort);
    const it = provider.stream({ ...req, signal: attempt.signal });
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first: IteratorResult<string>;
    try {
      first = await Promise.race([
        it.next(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            attempt.abort();
            reject(new ProviderError(`no answer within ${FIRST_CHUNK_MS / 1000}s`));
          }, FIRST_CHUNK_MS);
        }),
      ]);
    } catch (e) {
      // Network errors hide the useful part ("connect timeout", "ENOTFOUND") in `cause`.
      const cause = (e as { cause?: unknown })?.cause;
      lastError = e instanceof ProviderError ? e : new ProviderError(cause ? `${e} (${cause})` : String(e));
      console.warn(`[ai] ${provider.engine} failed before answering:`, lastError.message.slice(0, 200));
      if (!req.signal.aborted) failedAt.set(provider, Date.now());
      fallbacks++;
      req.signal.removeEventListener("abort", onAbort);
      continue;
    } finally {
      clearTimeout(timer);
    }
    onEngine(provider.engine, { model: provider.model, fallbacks });
    failedAt.delete(provider);
    try {
      if (!first.done) yield first.value;
      yield* it;
    } finally {
      req.signal.removeEventListener("abort", onAbort);
    }
    return;
  }
  throw lastError ?? new ProviderError("No AI provider is configured");
}
