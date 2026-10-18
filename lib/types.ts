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

// Admin-only shapes. `invited`, `side` and `table_number` are deliberately
// missing from the public Guest and Party above: guest-facing code must never
// send them.
export type AdminGuest = Guest & { invited: boolean };

/** Whose guest an invite is. */
export type Side = "lauren" | "young_re";

export type AdminParty = Omit<Party, "guests"> & {
  side: Side | null;
  /** Seating chart table, or null if not seated. */
  table_number: number | null;
  guests: AdminGuest[];
};

/** A party on the seating chart, with only the people who need a seat. Admin only. */
export type SeatingParty = {
  id: string;
  name: string;
  side: Side | null;
  table_number: number | null;
  guests: Pick<Guest, "id" | "first_name" | "last_name" | "is_plus_one">[];
};
