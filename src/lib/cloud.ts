"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { StoredComparison } from "@/lib/compare-store";
import type { StoredReview } from "@/lib/review-store";

/**
 * Optional cloud history via Supabase (decisions.md D17, D28). Without the two
 * public env vars this returns null and the app stays browser-only.
 */
let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  client = url && key ? createClient(url, key, { auth: { flowType: "pkce", persistSession: true, detectSessionInUrl: true } }) : null;
  return client;
}

export const cloudEnabled = () => supabase() !== null;

type Row = { id: string; type: "review" | "compare"; title: string; data: StoredReview | StoredComparison; created_at?: string };

async function signedIn(): Promise<SupabaseClient | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session ? sb : null;
}

/* Which items this browser has already uploaded, per user, so syncing only sends what's missing. */
const SYNCED = (userId: string) => `tl.synced.${userId}`;

function syncedIds(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SYNCED(userId)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function markSynced(userId: string, id: string) {
  try {
    const ids = syncedIds(userId);
    ids.add(id);
    localStorage.setItem(SYNCED(userId), JSON.stringify([...ids].slice(-200)));
  } catch {}
}

/** Saves a finished review or comparison to the signed-in user's account. Silently does nothing when signed out. */
export async function saveToCloud(type: Row["type"], item: StoredReview | StoredComparison) {
  const sb = supabase();
  const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
  const userId = data.session?.user.id;
  if (!sb || !userId) return;
  const title = type === "review" ? (item as StoredReview).result?.title ?? (item as StoredReview).title : (item as StoredComparison).result?.title ?? "Comparison";
  const { error } = await sb
    .from("saved_items")
    .upsert({ id: item.id, type, title, data: item, created_at: new Date(item.createdAt).toISOString() });
  if (error) console.warn("[cloud] save failed:", error.message);
  else markSynced(userId, item.id);
}

/**
 * Uploads finished local items the account doesn't have yet (decisions.md D36).
 * Runs on sign-in and on every visit while signed in, so a save that failed
 * (offline, a closed tab) is retried later instead of being lost.
 */
export async function syncToCloud(items: { type: Row["type"]; item: StoredReview | StoredComparison }[]) {
  const sb = supabase();
  const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
  const userId = data.session?.user.id;
  if (!sb || !userId) return 0;
  const done = syncedIds(userId);
  const pending = items.filter(({ item }) => !done.has(item.id));
  for (const { type, item } of pending) await saveToCloud(type, item);
  return pending.length;
}

export async function listCloud(): Promise<Row[]> {
  const sb = await signedIn();
  if (!sb) return [];
  const { data, error } = await sb.from("saved_items").select("id, type, title, data, created_at").order("created_at", { ascending: false }).limit(60);
  if (error) console.warn("[cloud] list failed:", error.message);
  return (data as Row[]) ?? [];
}

export async function loadFromCloud(id: string, type: Row["type"]) {
  const sb = await signedIn();
  if (!sb) return null;
  const { data } = await sb.from("saved_items").select("data").eq("id", id).eq("type", type).maybeSingle();
  return (data?.data as StoredReview | StoredComparison | undefined) ?? null;
}

export async function deleteFromCloud(id: string) {
  const sb = await signedIn();
  if (!sb) return;
  await sb.from("saved_items").delete().eq("id", id);
}
