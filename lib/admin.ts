import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyToken } from "./auth";
import { cardSentMessage, invitedParty } from "./cards";
import { arrangeTable, moveWithinTable, noRoomMessage, savedSeat, seatingTables, seatsPerTable, takesSeat } from "./seating";
import { mealOptions } from "./site";
import { supabase } from "./supabase";
import type { AdminParty, SeatingParty } from "./types";

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
  invited: boolean;
  side: "lauren" | "young_re" | null;
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
  const headers = ["party", "side", "first_name", "last_name", "is_plus_one", "invited", "attending", "welcome_drinks", "meal", "dietary", "responded_at"] as const;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))].join("\n");
}

/** Every party with every guest, invited or not, in the couple's saved order. Admin only. */
export async function getGuestList(): Promise<AdminParty[]> {
  const { data, error } = await supabase()
    .from("parties")
    .select("id, name, invited_to_welcome, responded_at, side, table_number, card_sent_at, guests(*)")
    .order("position")
    .order("position", { referencedTable: "guests" });
  if (error) throw error;
  return data as AdminParty[];
}

/** The parties with anyone to seat, holding only those people, in the couple's saved order. Admin only. */
export async function getSeatingList(): Promise<SeatingParty[]> {
  return (await getGuestList())
    .map((p) => ({
      id: p.id,
      name: p.name,
      side: p.side,
      table_number: p.table_number,
      guests: p.guests
        .filter(takesSeat)
        .map(({ id, first_name, last_name, is_plus_one, seat }) => ({ id, first_name, last_name, is_plus_one, seat })),
    }))
    .filter((p) => p.guests.length > 0);
}

// Request bodies for /api/admin/*. Business rules (names, duplicates) are
// checked in the functions below, which return a message for the admin.

const uuid = z.string().uuid();
const firstName = z.string().trim().max(80);
const lastName = z.string().trim().max(80);
const partyName = z.string().trim().max(120);
const side = z.enum(["lauren", "young_re"]);
const meal = z.enum(mealOptions.map((m) => m.value) as [string, ...string[]]);

const guestFields = { first_name: firstName, last_name: lastName, is_plus_one: z.boolean(), invited: z.boolean() };
type NewGuest = { first_name: string; last_name: string; is_plus_one: boolean; invited: boolean };

export const addGuestSchema = z.object({ partyId: uuid, ...guestFields });
export const addPartySchema = z.object({
  name: partyName,
  side,
  invited_to_welcome: z.boolean(),
  guests: z.array(z.object(guestFields)).min(1).max(30),
});
export const idSchema = z.object({ id: uuid });

export const guestUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), ids: z.array(uuid).min(1).max(100), invited: z.boolean() }),
  z.object({ action: z.literal("rename"), id: uuid, first_name: firstName, last_name: lastName }),
  z.object({ action: z.literal("reorder"), partyId: uuid, ids: z.array(uuid).min(1).max(100) }),
  // Move someone to another seat at their party's table.
  z.object({ action: z.literal("seat"), id: uuid, seat: z.number().int().min(1).max(seatsPerTable) }),
  // null = no answer yet, like on the RSVP form.
  z.object({
    action: z.literal("response"),
    id: uuid,
    attending: z.boolean().nullable(),
    attending_welcome: z.boolean().nullable(),
    meal: meal.nullable(),
    dietary: z.string().max(500).nullable(),
  }),
]);

export const partyUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rename"), id: uuid, name: partyName }),
  z.object({ action: z.literal("side"), id: uuid, side }),
  z.object({ action: z.literal("reorder"), ids: z.array(uuid).min(1).max(2000) }),
  // null = take the party off the seating chart.
  z.object({ action: z.literal("table"), id: uuid, table: z.number().int().min(1).max(seatingTables.length).nullable() }),
  // Whether the party's paper invite card has gone out.
  z.object({ action: z.literal("card"), id: uuid, sent: z.boolean() }),
]);

const NAME_REQUIRED = "Please enter a first and last name (or tick Plus-one).";
const missingName = (g: NewGuest) => !g.is_plus_one && !(g.first_name && g.last_name);

// Plus-ones get their names on the RSVP form (or from an admin edit later).
const guestRow = (g: NewGuest) => ({
  first_name: g.is_plus_one ? "" : g.first_name,
  last_name: g.is_plus_one ? "" : g.last_name,
  is_plus_one: g.is_plus_one,
  invited: g.invited,
});

/** Error message if another party already uses this name (the import script keys on names). */
async function duplicatePartyName(name: string, exceptId?: string): Promise<string | null> {
  let query = supabase().from("parties").select("id").eq("name", name).limit(1);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query;
  if (error) throw error;
  return data.length > 0 ? `There's already a party called "${name}".` : null;
}

/** Create a party with its guests. One guest and no name makes a party of one, named after them. */
export async function addParty(input: z.infer<typeof addPartySchema>): Promise<string | null> {
  if (input.guests.some(missingName)) return NAME_REQUIRED;
  const [first] = input.guests;
  const solo = input.guests.length === 1 && !first.is_plus_one;
  const name = input.name || (solo ? `${first.first_name} ${first.last_name}` : "");
  if (!name) return "Please give the party a name.";
  const dup = await duplicatePartyName(name);
  if (dup) return dup;

  const db = supabase();
  const { data: party, error: pErr } = await db
    .from("parties")
    .insert({ name, side: input.side, invited_to_welcome: input.invited_to_welcome })
    .select("id")
    .single();
  if (pErr) throw pErr;
  const { error: gErr } = await db.from("guests").insert(input.guests.map((g) => ({ ...guestRow(g), party_id: party.id })));
  if (gErr) {
    // No transactions over the REST API, so undo the empty party by hand.
    await db.from("parties").delete().eq("id", party.id);
    throw gErr;
  }
  return null;
}

export async function addGuest(input: z.infer<typeof addGuestSchema>): Promise<string | null> {
  if (missingName(input)) return NAME_REQUIRED;
  const db = supabase();
  const { data: party, error: pErr } = await db.from("parties").select("id").eq("id", input.partyId).maybeSingle();
  if (pErr) throw pErr;
  if (!party) return "That party no longer exists.";
  const { error } = await db.from("guests").insert({ ...guestRow(input), party_id: input.partyId });
  if (error) throw error;
  return null;
}

export async function updateGuests(input: z.infer<typeof guestUpdateSchema>): Promise<string | null> {
  const db = supabase();
  switch (input.action) {
    case "invite": {
      if (!input.invited) {
        const locked = await cardLock(input.ids);
        if (locked) return locked;
      }
      // Un-invited people give up their seats.
      const update = input.invited ? { invited: true } : { invited: false, seat: null };
      const { data, error } = await db.from("guests").update(update).in("id", input.ids).select("party_id");
      if (error) throw error;
      if (!input.invited) await unseatEmpty(data.map((g) => g.party_id));
      return null;
    }
    case "rename": {
      const { data: guest, error: gErr } = await db.from("guests").select("is_plus_one").eq("id", input.id).maybeSingle();
      if (gErr) throw gErr;
      if (!guest) return "That person no longer exists.";
      const { first_name, last_name } = input;
      // A plus-one may stay unnamed, but half a name would fail the RSVP form.
      if (guest.is_plus_one ? !first_name !== !last_name : !(first_name && last_name)) {
        return guest.is_plus_one ? "Enter both names, or leave both blank." : "Please enter a first and last name.";
      }
      const { error } = await db.from("guests").update({ first_name, last_name }).eq("id", input.id);
      if (error) throw error;
      return null;
    }
    case "reorder": {
      const { error } = await db.rpc("reorder_guests", { party: input.partyId, ids: input.ids });
      if (error) throw error;
      return null;
    }
    case "seat":
      return seatGuest(input.id, input.seat);
    case "response":
      return setResponse(input);
  }
}

/**
 * The couple entering or correcting someone's answers (say, an RSVP by phone).
 * Same rules as saveRsvp: meal and dietary only for someone attending, welcome
 * drinks only if the party is invited to them.
 */
async function setResponse(input: Extract<z.infer<typeof guestUpdateSchema>, { action: "response" }>): Promise<string | null> {
  const db = supabase();
  const { data: guest, error: gErr } = await db.from("guests").select("party_id").eq("id", input.id).maybeSingle();
  if (gErr) throw gErr;
  if (!guest) return "That person no longer exists.";
  const { data: party, error: pErr } = await db
    .from("parties")
    .select("invited_to_welcome, responded_at")
    .eq("id", guest.party_id)
    .single();
  if (pErr) throw pErr;

  const attending = input.attending;
  // A "no" to the wedding is a "no" to welcome drinks too.
  const welcome = party.invited_to_welcome ? (attending === false ? false : input.attending_welcome) : null;
  const answered = attending !== null || welcome !== null;
  const now = new Date().toISOString();
  const { error } = await db
    .from("guests")
    .update({
      attending,
      attending_welcome: welcome,
      meal: attending ? input.meal : null,
      dietary: attending ? input.dietary?.trim() || null : null,
      updated_at: answered ? now : null,
      // A "no" gives up their seat, as on the RSVP form.
      ...(attending === false && { seat: null }),
    })
    .eq("id", input.id);
  if (error) throw error;

  // The party counts as responded once every invited person has a wedding answer.
  // Keep the original date if it already had one.
  const { data: invited, error: iErr } = await db
    .from("guests")
    .select("attending")
    .eq("party_id", guest.party_id)
    .eq("invited", true);
  if (iErr) throw iErr;
  const complete = invited.length > 0 && invited.every((g) => g.attending !== null);
  const responded_at = complete ? (party.responded_at ?? now) : null;
  if (responded_at !== party.responded_at) {
    const { error: rErr } = await db.from("parties").update({ responded_at }).eq("id", guest.party_id);
    if (rErr) throw rErr;
  }
  if (attending === false) await unseatEmpty([guest.party_id]);
  return null;
}

export async function updateParty(input: z.infer<typeof partyUpdateSchema>): Promise<string | null> {
  const db = supabase();
  switch (input.action) {
    case "rename": {
      if (!input.name) return "Please give the party a name.";
      const dup = await duplicatePartyName(input.name, input.id);
      if (dup) return dup;
      const { error } = await db.from("parties").update({ name: input.name }).eq("id", input.id);
      if (error) throw error;
      return null;
    }
    case "side": {
      const { error } = await db.from("parties").update({ side: input.side }).eq("id", input.id);
      if (error) throw error;
      return null;
    }
    case "reorder": {
      const { error } = await db.rpc("reorder_parties", { ids: input.ids });
      if (error) throw error;
      return null;
    }
    case "table":
      return seatParty(input.id, input.table);
    case "card":
      return setCardSent(input.id, input.sent);
  }
}

/** Mark a party's invite card as sent (keeping the first date) or not sent. Only invited parties get one. */
async function setCardSent(id: string, sent: boolean): Promise<string | null> {
  const db = supabase();
  if (!sent) {
    const { error } = await db.from("parties").update({ card_sent_at: null }).eq("id", id);
    if (error) throw error;
    return null;
  }
  const { data: party, error: pErr } = await db.from("parties").select("guests(invited)").eq("id", id).maybeSingle();
  if (pErr) throw pErr;
  if (!party) return "That party no longer exists.";
  if (!invitedParty(party as { guests: { invited: boolean }[] })) return "Only invited parties get a card.";
  const { error } = await db.from("parties").update({ card_sent_at: new Date().toISOString() }).eq("id", id).is("card_sent_at", null);
  if (error) throw error;
  return null;
}

/**
 * The warning if any of these people is invited in a party whose card has gone
 * out (so they can't be un-invited or deleted), or null.
 */
async function cardLock(guestIds: string[]): Promise<string | null> {
  const { data, error } = await supabase().from("guests").select("invited, parties(name, card_sent_at)").in("id", guestIds);
  if (error) throw error;
  const locked = (data as unknown as { invited: boolean; parties: { name: string; card_sent_at: string | null } }[]).find(
    (g) => g.invited && g.parties.card_sent_at,
  );
  return locked ? cardSentMessage(locked.parties.name) : null;
}

type TableParty = {
  id: string;
  name: string;
  table_number: number | null;
  guests: { id: string; seat: number | null; invited: boolean; attending: boolean | null }[];
};

/** The parties at a table (plus one more party, if given), in the couple's saved order, as the chart has them. */
async function partiesAt(table: number, alsoId?: string): Promise<TableParty[]> {
  const query = supabase().from("parties").select("id, name, table_number, guests(id, seat, invited, attending)");
  const { data, error } = await (alsoId ? query.or(`id.eq.${alsoId},table_number.eq.${table}`) : query.eq("table_number", table))
    .order("position")
    .order("position", { referencedTable: "guests" });
  if (error) throw error;
  return data as TableParty[];
}

/** Only the people who need a seat, the way the chart sees a table. */
const sitters = (parties: TableParty[]) => parties.map((p) => ({ guests: p.guests.filter(takesSeat) }));

/** Save seats (null clears one) in one call. */
async function saveSeats(seats: Map<string, number | null>): Promise<void> {
  if (seats.size === 0) return;
  const { error } = await supabase().rpc("set_seats", { ids: [...seats.keys()], seats: [...seats.values()] });
  if (error) throw error;
}

/**
 * Put a party at a table (null takes it off the chart). Refuses if the people
 * in it who need a seat don't fit in what's left, as the chart does. Its people
 * take free seats there, side by side where they can.
 */
async function seatParty(id: string, table: number | null): Promise<string | null> {
  const db = supabase();
  if (table === null) {
    const { error } = await db.from("parties").update({ table_number: null }).eq("id", id);
    if (error) throw error;
    const { error: sErr } = await db.from("guests").update({ seat: null }).eq("party_id", id);
    if (sErr) throw sErr;
    return null;
  }

  const parties = await partiesAt(table, id);
  const party = parties.find((p) => p.id === id);
  if (!party) return "That party no longer exists.";
  if (party.table_number === table) return null;
  const needed = party.guests.filter(takesSeat).length;
  if (needed === 0) return `No one in ${party.name} needs a seat.`;
  const taken = parties
    .filter((p) => p.id !== id)
    .reduce((n, p) => n + p.guests.filter(takesSeat).length, 0);
  if (needed > seatsPerTable - taken) return noRoomMessage(party.name, needed, table, seatsPerTable - taken);

  const { error } = await db.from("parties").update({ table_number: table }).eq("id", id);
  if (error) throw error;
  // Their seats at the old table mean nothing here. Saving everyone's seats
  // keeps the people already at this table where the chart showed them.
  for (const g of party.guests) g.seat = null;
  const at = arrangeTable(sitters(parties));
  await saveSeats(new Map(parties.flatMap((p) => p.guests.map((g) => [g.id, savedSeat(at.get(g.id))]))));
  return null;
}

/** Move someone to another seat at their party's table, swapping with whoever sits there. */
async function seatGuest(id: string, seat: number): Promise<string | null> {
  const db = supabase();
  const { data: guest, error: gErr } = await db.from("guests").select("party_id, invited, attending").eq("id", id).maybeSingle();
  if (gErr) throw gErr;
  if (!guest) return "That person no longer exists.";
  if (!takesSeat(guest)) return "They don't need a seat.";
  const { data: party, error: pErr } = await db.from("parties").select("table_number").eq("id", guest.party_id).single();
  if (pErr) throw pErr;
  if (party.table_number === null) return "Seat their party at a table first.";
  const at = moveWithinTable(sitters(await partiesAt(party.table_number)), id, seat);
  await saveSeats(new Map([...at].map(([gid, n]) => [gid, savedSeat(n)])));
  return null;
}

/**
 * Take parties off the seating chart once nobody in them needs a seat (they all
 * declined, were un-invited, or were deleted). Seated again later, they take
 * whatever table has room.
 */
async function unseatEmpty(partyIds: string[]): Promise<void> {
  const ids = [...new Set(partyIds)];
  if (ids.length === 0) return;
  const db = supabase();
  const { data, error } = await db.from("guests").select("party_id, invited, attending").in("party_id", ids);
  if (error) throw error;
  const sitting = new Set(data.filter(takesSeat).map((g) => g.party_id));
  const empty = ids.filter((id) => !sitting.has(id));
  if (empty.length === 0) return;
  const { error: uErr } = await db.from("parties").update({ table_number: null }).in("id", empty);
  if (uErr) throw uErr;
  const { error: sErr } = await db.from("guests").update({ seat: null }).in("party_id", empty);
  if (sErr) throw sErr;
}

/** Delete a guest, and their party too if they were its last member. */
export async function deleteGuest(id: string): Promise<string | null> {
  const db = supabase();
  const { data: guest, error: gErr } = await db.from("guests").select("party_id").eq("id", id).maybeSingle();
  if (gErr) throw gErr;
  if (!guest) return null;
  const locked = await cardLock([id]);
  if (locked) return locked;
  const { error } = await db.from("guests").delete().eq("id", id);
  if (error) throw error;
  const { count, error: cErr } = await db
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("party_id", guest.party_id);
  if (cErr) throw cErr;
  if (count === 0) {
    const { error: pErr } = await db.from("parties").delete().eq("id", guest.party_id);
    if (pErr) throw pErr;
  } else {
    // Deleting the last person who needs a seat is like un-inviting them.
    await unseatEmpty([guest.party_id]);
  }
  return null;
}

/** Delete a party; its guests go with it (on delete cascade). Not once its invite card has gone out. */
export async function deleteParty(id: string): Promise<string | null> {
  const db = supabase();
  const { data: party, error: pErr } = await db.from("parties").select("name, card_sent_at").eq("id", id).maybeSingle();
  if (pErr) throw pErr;
  if (!party) return null;
  if (party.card_sent_at) return cardSentMessage(party.name);
  const { error } = await db.from("parties").delete().eq("id", id);
  if (error) throw error;
  return null;
}

/**
 * Shared body of the /api/admin/* handlers: admin check, body validation, then
 * `run`, which returns a message for a 400 or null on success.
 */
export async function adminMutation<T>(
  req: Request,
  schema: z.ZodType<T>,
  run: (input: T) => Promise<string | null>,
): Promise<NextResponse> {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const problem = await run(parsed.data);
    return problem ? NextResponse.json({ error: problem }, { status: 400 }) : NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin update failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
