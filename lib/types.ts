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

/** One answer that changed. Raw values: meal is the option value, booleans are yes/no, null is no answer. */
export type FieldChange = {
  field: "name" | "attending" | "attending_welcome" | "meal" | "dietary";
  from: string | boolean | null;
  to: string | boolean | null;
};

/** What changed for one person in a party. Names are as they were then. */
export type GuestChange = {
  guest_id: string;
  /** Their name, or "" for a plus-one who hasn't been named. */
  name: string;
  /** A plus-one, or someone on the list with only a first name (the RSVP form treats them the same). */
  plus_one: boolean;
  /** Whose plus-one: the party's only other guest, or null if it has several. */
  host: string | null;
  changes: FieldChange[];
};

/** A guest's change to their party's RSVP, for the bell and the notifications page. Admin only. */
export type RsvpNotification = {
  id: string;
  party_id: string | null;
  party_name: string;
  /** Who looked the invite up, if their name matched someone in the party. */
  respondent: string | null;
  /** First answers, a change to earlier ones, or "start over" on the RSVP page. */
  kind: "new" | "updated" | "cleared";
  changes: GuestChange[];
  created_at: string;
};

/** What the bell shows. Admin only. */
export type BellData = {
  /** Which of the couple is checking on this device, or null if they haven't said. */
  who: Side | null;
  /** How many notifications are new to them: the first `unread` of `items` (all of them, if more). */
  unread: number;
  /** The latest notifications, newest first. */
  items: RsvpNotification[];
};

/** A party on the seating chart, with only the people who need a seat. Admin only. */
export type SeatingParty = {
  id: string;
  name: string;
  side: Side | null;
  table_number: number | null;
  guests: Pick<AdminGuest, "id" | "first_name" | "last_name" | "is_plus_one" | "seat">[];
};
