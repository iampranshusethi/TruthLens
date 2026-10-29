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
  /** Streams the model's text output, chunk by chunk. */
  stream: (req: CompletionRequest) => AsyncGenerator<string>;
};

async function fail(provider: string, res: Response): Promise<never> {
  const body = (await res.text().catch(() => "")).slice(0, 300);
  throw new ProviderError(`${provider} ${res.status}: ${body}`, res.status === 429 ? "quota" : "unavailable");
}

/* ---------- Gemini (decisions.md D5) ---------- */

const gemini: Provider = {
  engine: "gemini",
  async *stream({ system, messages, maxTokens, signal }) {
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const thinkingLevel = process.env.GEMINI_THINKING_LEVEL;
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
    if (!res.ok || !res.body) await fail("Gemini", res);
    for await (const data of sseData(res.body!)) {
      const json = JSON.parse(data);
      const parts: { text?: string; thought?: boolean }[] = json.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) if (p.text && !p.thought) yield p.text;
    }
  },
};

/* ---------- Groq (OpenAI-compatible) ---------- */

const groq: Provider = {
  engine: "groq",
  async *stream({ system, messages, maxTokens, signal }) {
    const res = await httpFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        stream: true,
        temperature: 0.2,
        max_tokens: maxTokens,
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
export function configuredProviders(): Provider[] {
  const list: Provider[] = [];
  if (process.env.GEMINI_API_KEY) list.push(gemini);
  if (process.env.GROQ_API_KEY) list.push(groq);
  return list;
}

/**
 * Streams from the first provider that starts answering (decisions.md D5).
 * Falls back to the next one only if a provider fails before its first chunk;
 * a failure mid-answer is reported instead, since output was already shown.
 */
export async function* streamWithFallback(
  providers: Provider[],
  req: CompletionRequest,
  onEngine: (engine: Engine) => void,
): AsyncGenerator<string> {
  let lastError: ProviderError | null = null;
  for (const provider of providers) {
    const it = provider.stream(req);
    let first: IteratorResult<string>;
    try {
      first = await it.next();
    } catch (e) {
      lastError = e instanceof ProviderError ? e : new ProviderError(String(e));
      console.warn(`[review] ${provider.engine} failed before answering:`, lastError.message);
      continue;
    }
    onEngine(provider.engine);
    if (!first.done) yield first.value;
    yield* it;
    return;
  }
  throw lastError ?? new ProviderError("No AI provider is configured");
}
