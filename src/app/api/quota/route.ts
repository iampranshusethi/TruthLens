import { readQuota } from "@/lib/quota";

/** How many reviews or comparisons the caller has left today (decisions.md D39). */
export async function GET(request: Request) {
  const { quota, cookie } = await readQuota(request);
  return Response.json(quota, {
    headers: { "cache-control": "no-store", ...(cookie ? { "set-cookie": cookie } : {}) },
  });
}
