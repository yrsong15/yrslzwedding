// Row shapes shared by server code and client components.

export type Guest = {
  id: string;
  party_id: string;
  first_name: string;
  last_name: string;
  is_plus_one: boolean;
  attending: boolean | null;
  attending_welcome: boolean | null;
  meal: string | null;
  dietary: string | null;
  updated_at: string | null;
};

export type Party = {
  id: string;
  name: string;
  invited_to_welcome: boolean;
  responded_at: string | null;
  guests: Guest[];
};

// Admin-only shapes. `invited`, `seat`, `side`, `table_number` and `card_sent_at` are
// deliberately missing from the public Guest and Party above: guest-facing code
// must never send them.
export type AdminGuest = Guest & {
  invited: boolean;
  /** Seat at the party's table, 1 to 8 clockwise from the top, or null to let the chart pick. */
  seat: number | null;
};

/** Whose guest an invite is. */
export type Side = "lauren" | "young_re";

export type AdminParty = Omit<Party, "guests"> & {
  side: Side | null;
  /** Seating chart table, or null if not seated. */
  table_number: number | null;
  /** When the invite card was marked as sent, or null if not yet. */
  card_sent_at: string | null;
  guests: AdminGuest[];
};

/** An invited party on the invite cards page, with the names of its invited people. Admin only. */
export type CardParty = {
  id: string;
  name: string;
  side: Side | null;
  card_sent_at: string | null;
  /** Invited people's names, in the party's order; null for a plus-one with no name yet. */
  guests: (string | null)[];
};

/** A party on the seating chart, with only the people who need a seat. Admin only. */
export type SeatingParty = {
  id: string;
  name: string;
  side: Side | null;
  table_number: number | null;
  guests: Pick<AdminGuest, "id" | "first_name" | "last_name" | "is_plus_one" | "seat">[];
};
