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

// Admin-only shapes. `invited` and `side` are deliberately missing from the
// public Guest and Party above: guest-facing code must never send them.
export type AdminGuest = Guest & { invited: boolean };

/** Whose guest an invite is. */
export type Side = "lauren" | "young_re";

export type AdminParty = Omit<Party, "guests"> & { side: Side | null; guests: AdminGuest[] };
