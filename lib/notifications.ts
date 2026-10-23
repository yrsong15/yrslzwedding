// RSVP notifications: what a guest's save changed, and how the admin pages
// word it. Shared by the server (lib/rsvp.ts) and the admin components.

import { mealOptions } from "./site";
import type { FieldChange, Guest, GuestChange, Party, RsvpNotification } from "./types";

const fullName = (g: Pick<Guest, "first_name" | "last_name">) => `${g.first_name} ${g.last_name}`.trim();

// Like plus-ones, guests on the list with only a first name get their full
// name on the RSVP form, which shows them as plus-ones.
const isPlusOne = (g: Guest) => g.is_plus_one || !g.last_name.trim();

/**
 * What changed, person by person in the party's order, between a party before
 * and after a guest saved or cleared its RSVP. Empty if nothing did.
 */
export function diffParty(before: Party, after: Party | null): GuestChange[] {
  const now = new Map(after?.guests.map((g) => [g.id, g]));
  const regulars = before.guests.filter((g) => !isPlusOne(g));
  const host = regulars.length === 1 ? fullName(regulars[0]) : null;
  const result: GuestChange[] = [];
  for (const old of before.guests) {
    const g = now.get(old.id);
    if (!g) continue;
    const changes: FieldChange[] = [];
    const add = (field: FieldChange["field"], from: FieldChange["from"], to: FieldChange["to"]) => {
      if (from !== to) changes.push({ field, from, to });
    };
    // Only plus-ones and first-name-only guests get named on the RSVP form.
    add("name", fullName(old) || null, fullName(g) || null);
    add("attending", old.attending, g.attending);
    // A "no" to the wedding is a "no" to welcome drinks too, so that goes without saying.
    if (before.invited_to_welcome && !(g.attending === false && g.attending_welcome === false)) {
      add("attending_welcome", old.attending_welcome, g.attending_welcome);
    }
    add("meal", old.meal, g.meal);
    add("dietary", old.dietary, g.dietary);
    if (changes.length === 0) continue;
    const plusOne = isPlusOne(old);
    result.push({ guest_id: g.id, name: fullName(g) || fullName(old), plus_one: plusOne, host: plusOne ? host : null, changes });
  }
  return result;
}

/** "Sam Lee (Zz Tester's plus-one)", or "Zz Tester's plus-one" before they have a name. */
export function guestLabel(g: GuestChange): string {
  if (!g.plus_one) return g.name;
  const role = g.host ? `${g.host}'s plus-one` : "plus-one";
  return g.name ? `${g.name} (${role})` : role.charAt(0).toUpperCase() + role.slice(1);
}

export const kindLabel: Record<RsvpNotification["kind"], string> = {
  new: "RSVP'd",
  updated: "changed their RSVP",
  cleared: "cleared their RSVP",
};

const fieldLabel: Record<FieldChange["field"], string> = {
  name: "Name",
  attending: "Wedding",
  attending_welcome: "Welcome drinks",
  meal: "Meal",
  dietary: "Dietary",
};

function valueLabel(field: FieldChange["field"], v: FieldChange["from"]): string | null {
  if (v === null || v === "") return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (field === "meal") return mealOptions.find((m) => m.value === v)?.label ?? v;
  return v;
}

/** One change in words. `from` is null when there was no earlier answer, so a first answer reads "Meal: Salmon". */
export function describeChange(c: FieldChange): { label: string; from: string | null; to: string } {
  const yesNo = c.field === "attending" || c.field === "attending_welcome";
  return {
    label: fieldLabel[c.field],
    from: valueLabel(c.field, c.from),
    to: valueLabel(c.field, c.to) ?? (yesNo ? "No answer" : "none"),
  };
}

/** "Meal: Salmon → Short rib" */
export function changeText(c: FieldChange): string {
  const d = describeChange(c);
  return `${d.label}: ${d.from ? `${d.from} → ` : ""}${d.to}`;
}

// Fixed locale and zone (the wedding's), so the server render and hydration agree.
const zone = { timeZone: "America/Los_Angeles" } as const;

/** "Thursday, October 22" */
export const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { ...zone, weekday: "long", month: "long", day: "numeric" });

/** "3:14 PM" */
export const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { ...zone, hour: "numeric", minute: "2-digit" });

/** "just now", "5m", "3h", "2d", then "Oct 3". Only for client-rendered text, since it depends on the clock. */
export function ago(iso: string, now = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  if (mins < 60 * 24 * 7) return `${Math.floor(mins / (60 * 24))}d`;
  return new Date(iso).toLocaleDateString("en-US", { ...zone, month: "short", day: "numeric" });
}
