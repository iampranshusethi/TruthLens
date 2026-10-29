"use client";

/**
 * Turns an uploaded file into plain text, in the browser (decisions.md D8).
 * Text files never leave the device. Scans and photos have no text layer, so
 * their pages are sent one at a time to be read by the AI (decisions.md D25).
 */

export type Extracted = { text: string; pages: number; scanned?: boolean };
export type Progress = (message: string) => void;

export class ExtractError extends Error {
  constructor(
    public code: "unsupported" | "scanned" | "empty" | "too_big" | "unreadable",
    message: string,
  ) {
    super(message);
  }
}

const MAX_BYTES = 15 * 1024 * 1024;

export const ACCEPTED = ".pdf,.docx,.txt,.md,.jpg,.jpeg,.png,.webp";
const MAX_SCAN_PAGES = 12;

export async function extractText(file: File, onProgress: Progress = () => {}): Promise<Extracted> {
  if (file.size > MAX_BYTES) {
    throw new ExtractError("too_big", "That file is over 15 MB. Try a smaller copy or just the agreement pages.");
  }
  const name = file.name.toLowerCase();
  let out: Extracted;
  if (name.endsWith(".pdf") || file.type === "application/pdf") out = await fromPdf(file, onProgress);
  else if (name.endsWith(".docx")) out = await fromDocx(file);
  else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    const text = await file.text();
    out = { text, pages: Math.max(1, Math.round(text.length / 3000)) };
  } else if (file.type.startsWith("image/")) {
    onProgress("Reading your photo…");
    const bitmap = await createImageBitmap(file).catch(() => {
      throw new ExtractError("unreadable", "That image couldn't be opened. Try a JPG or PNG.");
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    out = { text: await readPageImage(canvas), pages: 1, scanned: true };
  } else {
    throw new ExtractError("unsupported", "TruthLens reads PDF, Word (.docx), text files and photos.");
  }

  if (!out.text.trim()) throw new ExtractError("empty", "That file doesn't seem to have any text in it.");
  return out;
}

async function fromPdf(file: File, onProgress: Progress): Promise<Extracted> {
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

  // A scanned PDF has pages but almost no text layer: read each page image instead.
  if (text.replace(/\s/g, "").length < 40 * doc.numPages) {
    if (doc.numPages > MAX_SCAN_PAGES) {
      throw new ExtractError(
        "too_big",
        `This scan has ${doc.numPages} pages. TruthLens reads scans of up to ${MAX_SCAN_PAGES} pages, so try just the agreement pages.`,
      );
    }
    let scanned = "";
    for (let p = 1; p <= doc.numPages; p++) {
      onProgress(`Reading scanned page ${p} of ${doc.numPages}…`);
      const page = await doc.getPage(p);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2.5, 1400 / base.width) });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
      scanned += `${await readPageImage(canvas)}\n\n`;
    }
    return { text: scanned, pages: doc.numPages, scanned: true };
  }
  return { text, pages: doc.numPages };
}

/** Sends one page image to be read by the AI and returns its text. */
async function readPageImage(canvas: HTMLCanvasElement): Promise<string> {
  const image = canvas.toDataURL("image/jpeg", 0.78).split(",")[1];
  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image, mime: "image/jpeg" }),
  }).catch(() => null);
  if (!res) throw new ExtractError("unreadable", "You seem to be offline. Check your connection and try again.");
  const json = await res.json().catch(() => null);
  if (res.ok) return json?.text ?? "";
  if (json?.code === "not_configured") {
    throw new ExtractError(
      "scanned",
      "This looks like a scan or photo. Reading those needs the AI to be switched on, which it isn't yet. A text PDF or Word file works now.",
    );
  }
  throw new ExtractError("unreadable", json?.message ?? "The scan couldn't be read. Try again in a moment.");
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
