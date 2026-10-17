import { NextResponse } from "next/server";
import { z } from "zod";
import { clearRsvp, getParty, rsvpSchema, saveRsvp, validateAgainstParty } from "@/lib/rsvp";

// POST → submit or update a party's RSVP. Returns the updated party.
export async function POST(req: Request) {
  const parsed = rsvpSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please complete every field." }, { status: 400 });
  }
  try {
    const party = await getParty(parsed.data.partyId);
    if (!party) return NextResponse.json({ error: "We couldn't find your invitation." }, { status: 404 });

    const problem = validateAgainstParty(parsed.data, party);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });

    await saveRsvp(parsed.data, party);
    return NextResponse.json({ party: await getParty(party.id) });
  } catch (e) {
    console.error("RSVP save failed", e);
    return NextResponse.json({ error: "Something went wrong saving your RSVP. Please try again." }, { status: 500 });
  }
}

// DELETE { partyId } → clear a party's answers so they can start over.
export async function DELETE(req: Request) {
  const parsed = z.object({ partyId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const party = await getParty(parsed.data.partyId);
    if (!party) return NextResponse.json({ error: "We couldn't find your invitation." }, { status: 404 });
    await clearRsvp(party);
    return NextResponse.json({ party: await getParty(party.id) });
  } catch (e) {
    console.error("RSVP clear failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
