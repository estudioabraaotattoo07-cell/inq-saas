import { createClient } from "@supabase/supabase-js";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const sb = SUPA_URL && SUPA_KEY ? createClient(SUPA_URL, SUPA_KEY) : null;

export async function dbGet(table: string) {
  if (!sb) return null;
  const { data, error } = await sb.from(table).select("*");
  if (error) { console.error("dbGet", table, error); return null; }
  return data;
}

export async function dbUpsert(table: string, row: any) {
  if (!sb) return null;
  const { data, error } = await sb.from(table).upsert(row).select().single();
  if (error) { console.error("dbUpsert", table, error); return null; }
  return data;
}

export async function dbInsert(table: string, row: any) {
  if (!sb) return null;
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) { console.error("dbInsert", table, error); return null; }
  return data;
}

export async function dbDelete(table: string, id: any) {
  if (!sb) return;
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) console.error("dbDelete", table, error);
}
