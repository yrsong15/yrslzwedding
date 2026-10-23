import "server-only";
import { z } from "zod";
import { diffParty } from "./notifications";
import { mealOptions } from "./site";
import { supabase, type Guest, type Party } from "./supabase";
import type { AdminGuest, RsvpNotification } from "./types";

// Guest-facing queries list columns explicitly so the admin-only columns
// (guests.invited, guests.seat, parties.side, parties.table_number, the position columns)
// never leave the server.
// Embedded guests are filtered to invited ones and kept in the couple's order.
const PUBLIC_GUEST_COLUMNS =
  "id, party_id, first_name, last_name, is_plus_one, attending, attending_welcome, meal, dietary, updated_at";
const PARTY_SELECT = `id, name, invited_to_welcome, responded_at, guests(${PUBLIC_GUEST_COLUMNS})`;

/** The party with only its invited guests, or null if nobody in it is invited. */
export async function getParty(id: string): Promise<Party | null> {
  const { data, error } = await supabase()
    .from("parties")
    .select(PARTY_SELECT)
    .eq("id", id)
    .eq("guests.invited", true)
    .order("position", { referencedTable: "guests" })
    .maybeSingle();
  if (error) throw error;
  const party = data as Party | null;
  return party && party.guests.length > 0 ? party : null;
}

// Case- and spacing-insensitive, so "young re  song" matches "Young Re Song".
const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Find parties containing an invited guest whose full name matches what was typed. */
export async function findPartiesByName(fullName: string): Promise<Party[]> {
  const target = normName(fullName);
  if (!target.includes(" ")) return [];

  // Compare whole names instead of splitting the input at a space, since first
  // and last names can both contain spaces. A guest list is small enough to scan.
  const { data, error } = await supabase()
    .from("guests")
    .select("party_id, first_name, last_name")
    .eq("is_plus_one", false)
    .eq("invited", true);
  if (error) throw error;

  const matches = (data ?? []).filter((g) => normName(`${g.first_name} ${g.last_name}`) === target);
  const ids = [...new Set(matches.map((g) => g.party_id as string))];
  if (ids.length === 0) return [];

  const { data: parties, error: pErr } = await supabase()
    .from("parties")
    .select(PARTY_SELECT)
    .in("id", ids)
    .eq("guests.invited", true)
    .order("position", { referencedTable: "guests" });
  if (pErr) throw pErr;
  return parties as Party[];
}

const mealValues = mealOptions.map((m) => m.value) as [string, ...string[]];

export const rsvpSchema = z.object({
  partyId: z.string().uuid(),
  guests: z
    .array(
      z.object({
        id: z.string().uuid(),
        attending: z.boolean(),
        attending_welcome: z.boolean().nullable(),
        meal: z.enum(mealValues).nullable(),
        dietary: z.string().max(500).nullable(),
        first_name: z.string().max(80).optional(),
        last_name: z.string().max(80).optional(),
      }),
    )
    .min(1),
  // The name they looked the invite up by, for the couple's notifications.
  respondent: z.string().trim().max(200).optional(),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;

// Plus-ones, and guests on the list with only a first name (the RSVP form
// shows them as blank plus-ones), get their full names from whoever RSVPs.
const namedAtRsvp = (g: Guest) => g.is_plus_one || !g.last_name.trim();

/** Returns an error message, or null if the submission is valid for this party. */
export function validateAgainstParty(input: RsvpInput, party: Party): string | null {
  const byId = new Map(party.guests.map((g) => [g.id, g]));
  for (const g of input.guests) {
    const existing = byId.get(g.id);
    if (!existing) return "Guest does not belong to this party.";
    if (namedAtRsvp(existing) && g.attending && !(g.first_name?.trim() && g.last_name?.trim())) {
      return "Please enter your guest's first and last name.";
    }
    if (g.attending && !g.meal) return "Please choose a meal for each attending guest.";
    if (party.invited_to_welcome && g.attending && g.attending_welcome === null) {
      return "Please let us know about welcome drinks for each guest.";
    }
  }
  if (input.guests.length !== party.guests.length) return "Please respond for everyone in your party.";
  return null;
}

export async function saveRsvp(input: RsvpInput, party: Party): Promise<void> {
  const now = new Date().toISOString();
  const db = supabase();
  const byId = new Map(party.guests.map((g) => [g.id, g]));

  for (const g of input.guests) {
    // Writes the admin-only seat but never reads it back.
    const update: Partial<AdminGuest> = {
      attending: g.attending,
      // Nobody comes to welcome drinks without the wedding, so a "no" covers both.
      attending_welcome: party.invited_to_welcome ? g.attending && g.attending_welcome : null,
      meal: g.attending ? g.meal : null,
      dietary: g.attending ? g.dietary?.trim() || null : null,
      updated_at: now,
      // A "no" gives up their seat on the seating chart.
      ...(!g.attending && { seat: null }),
    };
    const existing = byId.get(g.id)!;
    if (existing.is_plus_one) {
      update.first_name = g.attending ? (g.first_name ?? "").trim() : "";
      update.last_name = g.attending ? (g.last_name ?? "").trim() : "";
    } else if (namedAtRsvp(existing) && g.attending) {
      // A first-name-only guest gets their full name, but a "no" keeps the
      // first name the couple entered.
      update.first_name = (g.first_name ?? "").trim();
      update.last_name = (g.last_name ?? "").trim();
    }
    const { error } = await db.from("guests").update(update).eq("id", g.id).eq("party_id", party.id);
    if (error) throw error;
  }

  // A party where nobody's coming loses its table on the seating chart (its
  // seats went with each "no" above). These are all its invited guests.
  const nobodyComing = input.guests.every((g) => !g.attending);
  const { error } = await db
    .from("parties")
    .update({ responded_at: now, ...(nobodyComing && { table_number: null }) })
    .eq("id", party.id);
  if (error) throw error;
}

export async function clearRsvp(party: Party): Promise<void> {
  const db = supabase();
  // Only the guests this party can see (the invited ones). Plus-one names are
  // kept, so a name the couple (or the party) entered survives starting over.
  const ids = party.guests.map((g) => g.id);
  const reset: Partial<Guest> = { attending: null, attending_welcome: null, meal: null, dietary: null, updated_at: null };
  const { error } = await db.from("guests").update(reset).in("id", ids).eq("party_id", party.id);
  if (error) throw error;
  const { error: pErr } = await db.from("parties").update({ responded_at: null }).eq("id", party.id);
  if (pErr) throw pErr;
}

/**
 * Save a notification for the couple of what a guest's RSVP save or clear
 * changed, if anything. `respondent` is kept only if it's the name of someone
 * in the party, so guests can't put arbitrary text there. Never throws: the
 * RSVP itself is already saved, and a guest shouldn't see it fail over this.
 */
export async function recordRsvpChange(
  before: Party,
  after: Party | null,
  kind: RsvpNotification["kind"],
  respondent: string | undefined,
): Promise<void> {
  try {
    const changes = diffParty(before, after);
    if (changes.length === 0) return;
    const target = respondent ? normName(respondent) : "";
    const who = before.guests.find((g) => !g.is_plus_one && target && normName(`${g.first_name} ${g.last_name}`) === target);
    const { error } = await supabase()
      .from("rsvp_notifications")
      .insert({
        party_id: before.id,
        party_name: before.name,
        respondent: who ? `${who.first_name} ${who.last_name}`.trim() : null,
        kind,
        changes,
      });
    if (error) throw error;
  } catch (e) {
    console.error("RSVP notification failed", e);
  }
}
