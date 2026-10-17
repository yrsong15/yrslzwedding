import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyToken } from "./auth";
import { supabase } from "./supabase";

export async function isAdmin(): Promise<boolean> {
  return verifyToken("admin", (await cookies()).get(ADMIN_COOKIE)?.value);
}

export type SummaryRow = {
  party: string;
  first_name: string;
  last_name: string;
  is_plus_one: boolean;
  attending: "yes" | "no" | "pending";
  welcome_drinks: "yes" | "no" | "pending" | "not invited";
  meal: string | null;
  dietary: string | null;
  responded_at: string | null;
};

export async function getSummary(): Promise<SummaryRow[]> {
  const { data, error } = await supabase().from("rsvp_summary").select("*");
  if (error) throw error;
  return data as SummaryRow[];
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: SummaryRow[]): string {
  const headers = ["party", "first_name", "last_name", "is_plus_one", "attending", "welcome_drinks", "meal", "dietary", "responded_at"] as const;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n");
}
