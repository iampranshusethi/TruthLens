/**
 * Turns a stream of model text into parsed JSON objects, one per line
 * (decisions.md D18). Code fences, blank lines and stray prose are skipped,
 * so one bad line never breaks the stream.
 */
export async function* jsonLines(chunks: AsyncIterable<string>): AsyncGenerator<unknown> {
  let buf = "";
  for await (const chunk of chunks) {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const parsed = parseLine(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
      if (parsed !== undefined) yield parsed;
    }
  }
  const last = parseLine(buf);
  if (last !== undefined) yield last;
}

function parseLine(line: string): unknown {
  let s = line.trim();
  if (!s || s.startsWith("```")) return undefined;
  // Some models prefix list markers or trailing commas.
  s = s.replace(/^[-*]\s+/, "").replace(/,$/, "");
  if (!s.startsWith("{") || !s.endsWith("}")) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
