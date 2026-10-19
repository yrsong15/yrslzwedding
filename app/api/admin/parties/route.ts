import { addParty, addPartySchema, adminMutation, deleteParty, idSchema, partyUpdateSchema, updateParty } from "@/lib/admin";

// POST { name, side, invited_to_welcome, guests[] } → create a party. A blank
// name with one guest makes a party of one, named after them.
export async function POST(req: Request) {
  return adminMutation(req, addPartySchema, addParty);
}

// PATCH { action: "rename", id, name }
//       { action: "side", id, side }   → whose guest the invite is
//       { action: "reorder", ids }     → new order of all parties
//       { action: "table", id, table } → seat the party at a table (null = unseat)
//       { action: "card", id, sent }   → mark the invite card as sent or not
export async function PATCH(req: Request) {
  return adminMutation(req, partyUpdateSchema, updateParty);
}

// DELETE { id } → remove a party and everyone in it.
export async function DELETE(req: Request) {
  return adminMutation(req, idSchema, ({ id }) => deleteParty(id));
}
