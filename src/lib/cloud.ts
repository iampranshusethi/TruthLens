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

/** Saves a finished review or comparison to the signed-in user's account. Silently does nothing when signed out. */
export async function saveToCloud(type: Row["type"], item: StoredReview | StoredComparison) {
  const sb = await signedIn();
  if (!sb) return;
  const title = type === "review" ? (item as StoredReview).result?.title ?? (item as StoredReview).title : (item as StoredComparison).result?.title ?? "Comparison";
  const { error } = await sb
    .from("saved_items")
    .upsert({ id: item.id, type, title, data: item, created_at: new Date(item.createdAt).toISOString() });
  if (error) console.warn("[cloud] save failed:", error.message);
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
