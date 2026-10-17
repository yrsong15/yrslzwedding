import "server-only";
import { z } from "zod";
import { mealOptions } from "./site";
import { supabase, type Guest, type Party } from "./supabase";

const PARTY_SELECT = "id, name, invited_to_welcome, responded_at, guests(*)";

function sortGuests(p: Party): Party {
  // Named guests first, plus-ones last, stable by name.
  p.guests.sort(
    (a, b) =>
      Number(a.is_plus_one) - Number(b.is_plus_one) ||
      a.last_name.localeCompare(b.last_name) ||
      a.first_name.localeCompare(b.first_name),
  );
  return p;
}

export async function getParty(id: string): Promise<Party | null> {
  const { data, error } = await supabase().from("parties").select(PARTY_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? sortGuests(data as Party) : null;
}

// Escape LIKE wildcards so the match is exact (but case-insensitive).
const likeExact = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Find parties containing a guest whose full name matches "First Last". */
export async function findPartiesByName(fullName: string): Promise<Party[]> {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return [];
  const first = parts[0];
  const last = parts.slice(1).join(" ");

  const { data, error } = await supabase()
    .from("guests")
    .select("party_id")
    .eq("is_plus_one", false)
    .ilike("first_name", likeExact(first))
    .ilike("last_name", likeExact(last));
  if (error) throw error;

  const ids = [...new Set((data ?? []).map((g) => g.party_id as string))];
  if (ids.length === 0) return [];

  const { data: parties, error: pErr } = await supabase().from("parties").select(PARTY_SELECT).in("id", ids);
  if (pErr) throw pErr;
  return (parties as Party[]).map(sortGuests);
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
});

export type RsvpInput = z.infer<typeof rsvpSchema>;

/** Returns an error message, or null if the submission is valid for this party. */
export function validateAgainstParty(input: RsvpInput, party: Party): string | null {
  const byId = new Map(party.guests.map((g) => [g.id, g]));
  for (const g of input.guests) {
    const existing = byId.get(g.id);
    if (!existing) return "Guest does not belong to this party.";
    if (g.attending && !g.meal) return "Please choose a meal for each attending guest.";
    if (existing.is_plus_one && g.attending && !(g.first_name?.trim() && g.last_name?.trim())) {
      return "Please enter your guest's name.";
    }
    if (party.invited_to_welcome && g.attending_welcome === null) {
      return "Please let us know about welcome drinks for each guest.";
    }
  }
  if (input.guests.length !== party.guests.length) return "Please respond for everyone in your party.";
  return null;
}

export async function saveRsvp(input: RsvpInput, party: Party): Promise<void> {
  const now = new Date().toISOString();
  const db = supabase();
  const plusOneIds = new Set(party.guests.filter((g) => g.is_plus_one).map((g) => g.id));

  for (const g of input.guests) {
    const update: Partial<Guest> = {
      attending: g.attending,
      attending_welcome: party.invited_to_welcome ? g.attending_welcome : null,
      meal: g.attending ? g.meal : null,
      dietary: g.attending ? g.dietary?.trim() || null : null,
      updated_at: now,
    };
    if (plusOneIds.has(g.id)) {
      update.first_name = g.attending ? (g.first_name ?? "").trim() : "";
      update.last_name = g.attending ? (g.last_name ?? "").trim() : "";
    }
    const { error } = await db.from("guests").update(update).eq("id", g.id).eq("party_id", party.id);
    if (error) throw error;
  }

  const { error } = await db.from("parties").update({ responded_at: now }).eq("id", party.id);
  if (error) throw error;
}

export async function clearRsvp(party: Party): Promise<void> {
  const db = supabase();
  const reset: Partial<Guest> = { attending: null, attending_welcome: null, meal: null, dietary: null, updated_at: null };
  const { error } = await db.from("guests").update(reset).eq("party_id", party.id);
  if (error) throw error;
  const { error: plusErr } = await db
    .from("guests")
    .update({ first_name: "", last_name: "" })
    .eq("party_id", party.id)
    .eq("is_plus_one", true);
  if (plusErr) throw plusErr;
  const { error: pErr } = await db.from("parties").update({ responded_at: null }).eq("id", party.id);
  if (pErr) throw pErr;
}
