import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";

/**
 * fetch that honours a proxy (decisions.md D19). Node's built-in fetch ignores
 * proxy settings, which breaks every outbound call on networks that only allow
 * traffic through one. DEV_PROXY (set in .env.local) wins over the inherited
 * HTTPS_PROXY. Without a proxy this is plain fetch.
 */
const proxyUrl =
  process.env.DEV_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.https_proxy ||
  process.env.HTTP_PROXY ||
  process.env.http_proxy;
const dispatcher = proxyUrl ? new ProxyAgent({ uri: proxyUrl, connectTimeout: 5000 }) : undefined;

export async function httpFetch(url: string, init: RequestInit & { signal?: AbortSignal }): Promise<Response> {
  if (!dispatcher) return fetch(url, init);
  try {
    return (await undiciFetch(url, { ...(init as object), dispatcher })) as unknown as Response;
  } catch (e) {
    // The proxy itself is unreachable (for example, off the network that needs it): go direct.
    if (init.signal?.aborted) throw e;
    console.warn(`[http] proxy ${proxyUrl} failed, retrying directly:`, (e as { cause?: unknown }).cause ?? e);
    return fetch(url, init);
  }
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
