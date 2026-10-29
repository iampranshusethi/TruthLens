import { z } from "zod";
import { httpFetch } from "@/lib/ai/http";
import { GEMINI_MODELS } from "@/lib/ai/providers";
import { errorResponse, rateLimited } from "@/lib/ai/route-utils";
import { recordEvent } from "@/lib/server-db";

export const maxDuration = 60;

// One page per request keeps each upload well under Vercel's 4.5 MB body limit.
const ocrRequest = z.object({
  image: z.string().min(100).max(3_000_000),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const PROMPT =
  "Transcribe all the text on this page of a legal document exactly as written, as plain text with no markdown or formatting symbols. Keep clause numbers, headings and paragraph breaks, with a blank line between clauses. Do not summarise, translate, correct or add anything. If the page has no readable text, reply with nothing.";

/** Reads one page image of a scanned document (decisions.md D25). Gemini only: it reads images well. */
export async function POST(request: Request) {
  const parsed = ocrRequest.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return errorResponse("bad_request", "That page image couldn't be read.", 400);
  if (!process.env.GEMINI_API_KEY) {
    return errorResponse("not_configured", "Reading scans needs the AI to be switched on.", 503);
  }
  if (rateLimited(request, "ocr", 80)) {
    return errorResponse("rate_limited", "That's a lot of scanned pages this hour. Try again in a little while.", 429);
  }

  // Same model chain as reviews (decisions.md D31): move on when a model is busy, retired or slow.
  const startedAt = Date.now();
  let res: Response | null = null;
  let lastStatus = 0;
  let used = "";
  let fallbacks = 0;
  for (const model of GEMINI_MODELS) {
    if (request.signal.aborted) break;
    used = model;
    res = await httpFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15_000)]),
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ inlineData: { mimeType: parsed.data.mime, data: parsed.data.image } }, { text: PROMPT }] },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 4096 },
      }),
    }).catch(() => null);
    if (res?.ok) break;
    lastStatus = res?.status ?? 0;
    console.warn(`[ocr] ${model} failed:`, lastStatus || "no response");
    res = null;
    fallbacks++;
  }

  const usage = { type: "ocr", engine: "gemini", model: used, fallbacks, duration_ms: Date.now() - startedAt } as const;
  if (!res) {
    await recordEvent({ ...usage, ok: false, error_code: lastStatus === 429 ? "quota" : "unavailable" });
    return lastStatus === 429
      ? errorResponse("quota", "TruthLens has used today's free AI allowance. Please try again later.", 429)
      : errorResponse("unavailable", "The scan couldn't be read just now. Try again in a moment.", 502);
  }
  const json = await res.json();
  const parts: { text?: string; thought?: boolean }[] = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("");
  await recordEvent({ ...usage, ok: true });
  return Response.json({ text });
}
