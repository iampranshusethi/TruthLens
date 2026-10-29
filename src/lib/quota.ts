import "server-only";
import type { User } from "@supabase/supabase-js";
import { serverDb } from "@/lib/server-db";

/**
 * Daily generation limits (decisions.md D39). A "generation" is one review or
 * comparison; follow-up questions and the samples are free. Guests get one per
 * device per day, signed-in users three. The developer is exempt.
 */
export const GUEST_LIMIT = 1;
export const USER_LIMIT = 3;
const DEVICE_COOKIE = "tl_device";

export type Quota = {
  signedIn: boolean;
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
};

export type QuotaCheck =
  | { ok: true; quota: Quota; release: () => Promise<void>; cookie?: string }
  | { ok: false; code: "sign_in_required" | "daily_limit"; quota: Quota; cookie?: string };

/** Today in India, as YYYY-MM-DD. Limits reset at midnight IST. */
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** The developer's account (same rule as the stats page): verified email, signed in with Google. */
export function isAdmin(user: User | null) {
  if (!user?.email || !user.email_confirmed_at) return false;
  const admins = (process.env.STATS_ADMIN_EMAIL ?? "").split(",").map((e) => e.trim().toLowerCase());
  return admins.includes(user.email.toLowerCase()) && (user.identities?.some((i) => i.provider === "google") ?? false);
}

async function whoIs(request: Request): Promise<{ user: User | null; deviceId: string; newCookie?: string }> {
  const db = serverDb();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const user = token && db ? ((await db.auth.getUser(token)).data.user ?? null) : null;
  const existing = request.headers.get("cookie")?.match(new RegExp(`${DEVICE_COOKIE}=([\\w-]{16,64})`))?.[1];
  if (existing) return { user, deviceId: existing };
  const deviceId = crypto.randomUUID();
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return { user, deviceId, newCookie: `${DEVICE_COOKIE}=${deviceId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}` };
}

async function usedToday(subject: string): Promise<number> {
  const db = serverDb()!;
  const { data } = await db.from("daily_generations").select("count").eq("subject", subject).eq("day", today()).maybeSingle();
  return (data?.count as number | undefined) ?? 0;
}

/** Current allowance, without using any. Unlimited when the database isn't configured. */
export async function readQuota(request: Request): Promise<{ quota: Quota; cookie?: string }> {
  const { user, deviceId, newCookie } = await whoIs(request);
  const signedIn = !!user;
  const limit = signedIn ? USER_LIMIT : GUEST_LIMIT;
  if (!serverDb() || isAdmin(user)) {
    return { quota: { signedIn, unlimited: true, limit, used: 0, remaining: limit }, cookie: newCookie };
  }
  const used = await usedToday(signedIn ? `user:${user.id}` : `guest:${deviceId}`);
  return { quota: { signedIn, unlimited: false, limit, used, remaining: Math.max(0, limit - used) }, cookie: newCookie };
}

/** Takes one generation, atomically, or explains why not. `release` gives it back after a failed run. */
export async function takeGeneration(request: Request): Promise<QuotaCheck> {
  const { user, deviceId, newCookie } = await whoIs(request);
  const db = serverDb();
  const signedIn = !!user;
  const limit = signedIn ? USER_LIMIT : GUEST_LIMIT;
  const noop = async () => {};
  if (!db || isAdmin(user)) {
    return { ok: true, quota: { signedIn, unlimited: true, limit, used: 0, remaining: limit }, release: noop, cookie: newCookie };
  }

  const subject = signedIn ? `user:${user.id}` : `guest:${deviceId}`;
  const day = today();
  const { data, error } = await db.rpc("take_generation", { p_subject: subject, p_day: day, p_limit: limit });
  if (error) {
    // If the limit table is missing or the database is down, don't block people; the hourly limit still applies.
    console.warn("[quota] check failed, allowing:", error.message);
    return { ok: true, quota: { signedIn, unlimited: false, limit, used: 0, remaining: limit }, release: noop, cookie: newCookie };
  }
  if (data === null) {
    const quota = { signedIn, unlimited: false, limit, used: limit, remaining: 0 };
    return { ok: false, code: signedIn ? "daily_limit" : "sign_in_required", quota, cookie: newCookie };
  }
  const used = data as number;
  return {
    ok: true,
    quota: { signedIn, unlimited: false, limit, used, remaining: Math.max(0, limit - used) },
    release: async () => {
      await db.rpc("return_generation", { p_subject: subject, p_day: day });
    },
    cookie: newCookie,
  };
}

export const LIMIT_MESSAGE = {
  sign_in_required: `You've used your free review for today. Sign in with Google to get ${USER_LIMIT} a day.`,
  daily_limit: `You've used today's ${USER_LIMIT} reviews and comparisons. Your allowance resets at midnight (India time).`,
};
