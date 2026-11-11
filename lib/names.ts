// Guests' names, shared by the server, the RSVP form, and the admin pages.
// Safe to import from client components.

/** Case- and spacing-insensitive, so "young re  song" matches "Young Re Song". */
export const normName = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** "First Last", or "" for a plus-one with no name yet. */
export const fullName = (g: { first_name: string; last_name: string }) => `${g.first_name} ${g.last_name}`.trim();

/**
 * Whether whoever RSVPs gives this person's name: a plus-one, or someone on
 * the list with only a first name (the RSVP form shows them as a blank
 * plus-one). The notifications call both of them plus-ones.
 */
export const namedAtRsvp = (g: { is_plus_one: boolean; last_name: string }) => g.is_plus_one || !g.last_name.trim();
