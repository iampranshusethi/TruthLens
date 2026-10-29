import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * fetch that honours HTTPS_PROXY (decisions.md D19). Node's built-in fetch
 * ignores proxy settings, which breaks every outbound call on networks that
 * only allow traffic through a proxy. Without a proxy this is plain fetch.
 */
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

export function httpFetch(url: string, init: RequestInit & { signal?: AbortSignal }): Promise<Response> {
  if (!dispatcher) return fetch(url, init);
  return undiciFetch(url, { ...(init as object), dispatcher }) as unknown as Promise<Response>;
}

/** Yields the `data:` payloads of a server-sent-events response body. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
  if (buf.trim().startsWith("data:")) yield buf.trim().slice(5).trim();
}
