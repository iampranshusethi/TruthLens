import { errorResponse } from "@/lib/ai/route-utils";
import { serverDb } from "@/lib/server-db";
import { type EventRow, summariseEvents } from "@/lib/stats";

/**
 * Usage stats for the developer only (decisions.md D38). The caller sends their
 * Supabase session token; the server checks who it belongs to and compares the
 * email with STATS_ADMIN_EMAIL before reading anything.
 */
export async function GET(request: Request) {
  const db = serverDb();
  const admins = (process.env.STATS_ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!db || !admins.length) return errorResponse("not_configured", "Stats aren't set up yet.", 503);

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return errorResponse("bad_request", "Sign in to see stats.", 401);
  const { data: auth } = await db.auth.getUser(token);
  const email = auth.user?.email?.toLowerCase();
  if (!email || !admins.includes(email)) return errorResponse("bad_request", "This page is private.", 403);

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [events, saved, users] = await Promise.all([
    db.from("usage_events").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(10_000),
    db.from("saved_items").select("id", { count: "exact", head: true }),
    db.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ]);
  if (events.error) return errorResponse("unavailable", `Couldn't read stats: ${events.error.message}`, 502);

  const stats = summariseEvents((events.data ?? []) as EventRow[]);
  const totalUsers = (users.data as { total?: number } | null)?.total;
  return Response.json(
    { ...stats, users: totalUsers, savedItems: saved.count ?? undefined },
    { headers: { "cache-control": "no-store" } },
  );
}
