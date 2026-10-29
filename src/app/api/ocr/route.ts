import { z } from "zod";
import { httpFetch } from "@/lib/ai/http";
import { errorResponse, rateLimited } from "@/lib/ai/route-utils";

export const maxDuration = 30;

// One page per request keeps each upload well under Vercel's 4.5 MB body limit.
const ocrRequest = z.object({
  image: z.string().min(100).max(3_000_000),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const PROMPT =
  "Transcribe all the text on this page of a legal document exactly as written. Keep clause numbers, headings and paragraph breaks. Do not summarise, translate, correct or add anything. If the page has no readable text, reply with nothing.";

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

  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const res = await httpFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    signal: request.signal,
    headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ inlineData: { mimeType: parsed.data.mime, data: parsed.data.image } }, { text: PROMPT }] },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 4096 },
    }),
  }).catch(() => null);

  if (!res?.ok) {
    console.error("[ocr] failed:", res?.status, await res?.text().catch(() => ""));
    return res?.status === 429
      ? errorResponse("quota", "TruthLens has used today's free AI allowance. Please try again later.", 429)
      : errorResponse("unavailable", "The scan couldn't be read just now. Try again in a moment.", 502);
  }
  const json = await res.json();
  const parts: { text?: string; thought?: boolean }[] = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("");
  return Response.json({ text });
}
