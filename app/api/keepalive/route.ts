import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Called twice a day by the Vercel crons in vercel.json. Supabase pauses a
// free-tier project after 7 days without activity, and the site can go that
// long without a visitor, so this makes one tiny query to keep it awake
// (Supabase says a few requests a day is typically enough).
// Vercel sends `Authorization: Bearer $CRON_SECRET`; nobody else can call it.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { error } = await supabase()
    .from("parties")
    .select("id", { count: "exact", head: true });
  if (error) {
    console.error("keepalive query failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
