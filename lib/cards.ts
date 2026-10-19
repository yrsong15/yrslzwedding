// Invite card rules shared by the admin pages and the server (lib/admin.ts).

/** Only parties with someone invited get a card. */
export const invitedParty = (p: { guests: { invited: boolean }[] }) => p.guests.some((g) => g.invited);

/** Why a party whose card has gone out can't lose anyone from its invite. */
export const cardSentMessage = (partyName: string) =>
  `An invite card has already gone to ${partyName}, so they can't be un-invited or deleted. To change this, first mark their card as not sent on the Invite cards page.`;
