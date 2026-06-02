import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://rajophuwwxynkdpxjzey.supabase.co";
const SUPA_KEY = "sb_publishable_YxW3K62M-aYXetcPxBqwtA_JUFMSaG4";

export const sb = createClient(SUPA_URL, SUPA_KEY);

export async function dbGet(table: string) {
  const { data, error } = await sb.from(table).select("*");
  if (error) { console.error("dbGet", table, error); return null; }
  return data;
}

export async function dbUpsert(table: string, row: any) {
  const { data, error } = await sb.from(table).upsert(row).select().single();
  if (error) { console.error("dbUpsert", table, error); return null; }
  return data;
}

export async function dbInsert(table: string, row: any) {
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) { console.error("dbInsert", table, error); return null; }
  return data;
}

export async function dbDelete(table: string, id: any) {
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) console.error("dbDelete", table, error);
}
