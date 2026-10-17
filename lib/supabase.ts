import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type { Guest, Party } from "./types";

let client: SupabaseClient | null = null;

// Server-only client using the service-role key. Never import this from a
// client component; RLS denies all access to the anon role.
export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
