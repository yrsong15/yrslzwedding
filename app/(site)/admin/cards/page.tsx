import AdminLoginScreen from "@/components/admin/AdminLoginScreen";
import AdminTabs from "@/components/admin/AdminTabs";
import InviteCards from "@/components/admin/InviteCards";
import PageHeader from "@/components/PageHeader";
import { getGuestList, isAdmin } from "@/lib/admin";
import { invitedParty } from "@/lib/cards";
import type { AdminParty, CardParty } from "@/lib/types";

export const metadata = { title: "Invite cards" };
export const dynamic = "force-dynamic";

export default async function CardsPage() {
  // Before any query: without the admin cookie, no guest data is even loaded.
  if (!(await isAdmin())) return <AdminLoginScreen />;

  let parties: AdminParty[];
  try {
    parties = await getGuestList();
  } catch (e) {
    console.error(e);
    return (
      <div className="pb-24">
        <PageHeader title="Admin" intro="Couldn't load the guest list. Check your Supabase env vars and that schema.sql has been run." />
      </div>
    );
  }

  // Only invited parties get a card, addressed to the people in them who are invited.
  const cards: CardParty[] = parties.filter(invitedParty).map((p) => ({
    id: p.id,
    name: p.name,
    side: p.side,
    card_sent_at: p.card_sent_at,
    guests: p.guests
      .filter((g) => g.invited)
      .map((g) => (g.is_plus_one && !g.first_name ? null : `${g.first_name} ${g.last_name}`.trim())),
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <PageHeader title="Invite cards" />
      <AdminTabs current="/admin/cards" />
      <InviteCards parties={cards} />
    </div>
  );
}
