import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

// Called twice a day by the Vercel crons in vercel.json. Supabase pauses a
// free-tier project after 7 days of low activity, and the site can go that long
// without a visitor. A read-only count wasn't enough to stop a pause, so this
// does real writes: it adds a fake, uninvited party with one guest, then
// deletes it (guests cascade with their party). Nothing is notified or counted:
// notifications come only from guest RSVPs, and uninvited guests are left out
// of the RSVP lookup and the /admin counts.
// Vercel sends `Authorization: Bearer $CRON_SECRET`; nobody else can call it.
export const dynamic = "force-dynamic";

// Party names are unique, and this one marks the row as safe to delete if a
// run ever stops between the insert and the delete.
const KEEPALIVE_PARTY = "zz Keepalive (auto-deleted)";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = supabase();

  // Clear anything an earlier failed run left behind.
  const stale = await db.from("parties").delete().eq("name", KEEPALIVE_PARTY);
  if (stale.error) return fail("cleanup", stale.error);

  const party = await db
    .from("parties")
    .insert({ name: KEEPALIVE_PARTY })
    .select("id")
    .single();
  if (party.error) return fail("insert party", party.error);

  const guest = await db
    .from("guests")
    .insert({ party_id: party.data.id, first_name: "Keepalive", last_name: "Test", invited: false });
  // Delete even if the guest insert failed, so the party doesn't linger.
  const del = await db.from("parties").delete().eq("id", party.data.id);
  if (guest.error) return fail("insert guest", guest.error);
  if (del.error) return fail("delete", del.error);
  return NextResponse.json({ ok: true });
}

function fail(step: string, error: unknown) {
  console.error(`keepalive: ${step} failed`, error);
  return NextResponse.json({ ok: false }, { status: 500 });
}
