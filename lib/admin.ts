import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, verifyToken } from "./auth";
import { mealOptions } from "./site";
import { supabase } from "./supabase";
import type { AdminParty } from "./types";

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
    .select("id, name, invited_to_welcome, responded_at, side, guests(*)")
    .order("position")
    .order("position", { referencedTable: "guests" });
  if (error) throw error;
  return data as AdminParty[];
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
      const { error } = await db.from("guests").update({ invited: input.invited }).in("id", input.ids);
      if (error) throw error;
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
  }
}

/** Delete a guest, and their party too if they were its last member. */
export async function deleteGuest(id: string): Promise<null> {
  const db = supabase();
  const { data: guest, error: gErr } = await db.from("guests").select("party_id").eq("id", id).maybeSingle();
  if (gErr) throw gErr;
  if (!guest) return null;
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
  }
  return null;
}

/** Delete a party; its guests go with it (on delete cascade). */
export async function deleteParty(id: string): Promise<null> {
  const { error } = await supabase().from("parties").delete().eq("id", id);
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
