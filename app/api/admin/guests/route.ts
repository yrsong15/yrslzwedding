import { addGuest, addGuestSchema, adminMutation, deleteGuest, guestUpdateSchema, idSchema, updateGuests } from "@/lib/admin";

// PATCH { action: "invite", ids, invited }       → invite or un-invite people (one, or a whole party)
//       { action: "rename", id, first_name, last_name }
//       { action: "reorder", partyId, ids }       → new order of the people in a party
export async function PATCH(req: Request) {
  return adminMutation(req, guestUpdateSchema, updateGuests);
}

// POST { partyId, first_name, last_name, is_plus_one, invited } → add a person to a party.
export async function POST(req: Request) {
  return adminMutation(req, addGuestSchema, addGuest);
}

// DELETE { id } → remove a person (and their party, if they were the last one).
export async function DELETE(req: Request) {
  return adminMutation(req, idSchema, ({ id }) => deleteGuest(id));
}
