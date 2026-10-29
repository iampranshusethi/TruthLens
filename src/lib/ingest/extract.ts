"use client";

/**
 * Turns an uploaded file into plain text, in the browser (decisions.md D8).
 * The original file never leaves the device.
 */

export type Extracted = { text: string; pages: number };

export class ExtractError extends Error {
  constructor(
    public code: "unsupported" | "scanned" | "empty" | "too_big" | "unreadable",
    message: string,
  ) {
    super(message);
  }
}

const MAX_BYTES = 15 * 1024 * 1024;

export const ACCEPTED = ".pdf,.docx,.txt,.md";

export async function extractText(file: File): Promise<Extracted> {
  if (file.size > MAX_BYTES) {
    throw new ExtractError("too_big", "That file is over 15 MB. Try a smaller copy or just the agreement pages.");
  }
  const name = file.name.toLowerCase();
  let out: Extracted;
  if (name.endsWith(".pdf") || file.type === "application/pdf") out = await fromPdf(file);
  else if (name.endsWith(".docx")) out = await fromDocx(file);
  else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    const text = await file.text();
    out = { text, pages: Math.max(1, Math.round(text.length / 3000)) };
  } else if (file.type.startsWith("image/")) {
    throw new ExtractError(
      "unsupported",
      "Photos aren't supported yet. If you have the agreement as a PDF or Word file, use that instead.",
    );
  } else {
    throw new ExtractError("unsupported", "TruthLens reads PDF, Word (.docx) and text files.");
  }

  if (!out.text.trim()) throw new ExtractError("empty", "That file doesn't seem to have any text in it.");
  return out;
}

async function fromPdf(file: File): Promise<Extracted> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

  let doc;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  } catch (e) {
    const locked = e instanceof Error && /password/i.test(e.message);
    throw new ExtractError(
      "unreadable",
      locked ? "This PDF is password-protected. Remove the password and try again." : "This PDF couldn't be opened.",
    );
  }

  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let lastEndX = 0;
    let lastHeight = 10;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const [, , , , x, y] = item.transform;
      if (lastY !== null && Math.abs(y - lastY) > 1) {
        // A gap bigger than ~1.6 lines is a paragraph break.
        if (!text.endsWith("\n")) text += Math.abs(y - lastY) > lastHeight * 1.6 ? "\n\n" : "\n";
      } else if (x - lastEndX > lastHeight * 0.2 && !/\s$/.test(text) && !item.str.startsWith(" ")) {
        // Same line, visible horizontal gap: the PDF dropped the space between words.
        text += " ";
      }
      text += item.str;
      if (item.hasEOL) text += "\n";
      lastY = y;
      lastEndX = x + item.width;
      lastHeight = item.height || lastHeight;
    }
    text += "\n\n";
  }

  // A scanned PDF has pages but almost no text layer.
  if (text.replace(/\s/g, "").length < 40 * doc.numPages) {
    throw new ExtractError(
      "scanned",
      "This PDF looks like a scan, so there's no text to read. Reading scans is coming soon; a text PDF or Word file works now.",
    );
  }
  return { text, pages: doc.numPages };
}

async function fromDocx(file: File): Promise<Extracted> {
  const mammoth = (await import("mammoth")).default;
  try {
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: value, pages: Math.max(1, Math.round(value.length / 3000)) };
  } catch {
    throw new ExtractError("unreadable", "This Word file couldn't be opened. Try saving it again or exporting a PDF.");
  }
}
