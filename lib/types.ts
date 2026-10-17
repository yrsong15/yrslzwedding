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
