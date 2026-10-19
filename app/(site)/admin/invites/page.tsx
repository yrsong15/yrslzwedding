import AdminLoginScreen from "@/components/admin/AdminLoginScreen";
import AdminTabs from "@/components/admin/AdminTabs";
import GuestList from "@/components/admin/GuestList";
import PageHeader from "@/components/PageHeader";
import { getGuestList, isAdmin } from "@/lib/admin";
import { invitedParty } from "@/lib/cards";
import { mealOptions, sides } from "@/lib/site";
import type { AdminParty, Side } from "@/lib/types";

export const metadata = { title: "Invite list" };
export const dynamic = "force-dynamic";

export default async function InvitesPage() {
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

  // All counts cover invited guests only.
  const invited = parties.flatMap((p) => p.guests.filter((g) => g.invited).map((g) => ({ ...g, party: p })));
  // Unnamed plus-ones that were never claimed aren't real guests yet.
  const real = invited.filter((r) => !(r.is_plus_one && r.attending !== true));
  const count = (pred: (r: (typeof real)[number]) => boolean) => real.filter(pred).length;
  const attending = real.filter((r) => r.attending === true);
  const invitedParties = parties.filter(invitedParty);
  const respondedParties = invitedParties.filter((p) => p.responded_at);
  const plusOnes = invited.filter((r) => r.is_plus_one).length;

  const stats = [
    {
      label: "Invited",
      value: invited.length,
      note: plusOnes > 0 ? `incl. ${plusOnes} plus-one${plusOnes === 1 ? "" : "s"}` : null,
    },
    { label: "Attending", value: attending.length },
    { label: "Declined", value: count((r) => r.attending === false) },
    { label: "Pending", value: count((r) => r.attending === null) },
    { label: "Parties responded", value: `${respondedParties.length} / ${invitedParties.length}` },
    { label: "Welcome drinks", value: count((r) => r.party.invited_to_welcome && r.attending_welcome === true) },
  ];
  const meals = mealOptions.map((m) => ({ ...m, n: attending.filter((r) => r.meal === m.value).length }));
  const dietary = attending.filter((r) => r.dietary);

  // Whose guests: a row per side, plus invites with no side yet (only if there
  // are any), so the rows always add up to the total.
  const sideRow = (label: string, side: Side | null) => {
    const mine = invited.filter((r) => r.party.side === side);
    return { label, invited: mine.length, attending: mine.filter((r) => r.attending === true).length };
  };
  const unset = sideRow("Not set yet", null);
  const bySide = [...sides.map((s) => sideRow(`${s.label}'s`, s.value)), ...(unset.invited > 0 ? [unset] : [])];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <PageHeader title="Invite list" />
      <AdminTabs current="/admin/invites" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink/10 bg-white/60 p-5 text-center">
            <p className="font-serif text-4xl text-plum">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{s.label}</p>
            {s.note && <p className="mt-1 text-xs text-muted">{s.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <section className="rounded-2xl border border-ink/10 bg-white/60 p-6">
          <h2 className="font-serif text-2xl text-plum">Whose guests</h2>
          <table className="mt-3 w-full">
            <thead className="text-xs uppercase tracking-[0.15em] text-muted">
              <tr>
                <th className="text-left font-normal">
                  <span className="sr-only">Guests of</span>
                </th>
                <th className="pb-1 text-right font-normal">Invited</th>
                <th className="pb-1 pl-4 text-right font-normal">Attending</th>
              </tr>
            </thead>
            <tbody>
              {bySide.map((r) => (
                <tr key={r.label}>
                  <td className="py-0.5">{r.label}</td>
                  <td className="text-right font-medium tabular-nums">{r.invited}</td>
                  <td className="text-right font-medium tabular-nums">{r.attending}</td>
                </tr>
              ))}
              <tr className="border-t border-ink/10">
                <td className="pt-1.5 font-medium">Total</td>
                <td className="pt-1.5 text-right font-medium tabular-nums">{invited.length}</td>
                <td className="pt-1.5 text-right font-medium tabular-nums">{attending.length}</td>
              </tr>
            </tbody>
          </table>
        </section>
        <section className="rounded-2xl border border-ink/10 bg-white/60 p-6">
          <h2 className="font-serif text-2xl text-plum">Meals</h2>
          <ul className="mt-3 space-y-1">
            {meals.map((m) => (
              <li key={m.value} className="flex justify-between">
                <span>{m.label}</span>
                <span className="font-medium tabular-nums">{m.n}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-ink/10 bg-white/60 p-6">
          <h2 className="font-serif text-2xl text-plum">Dietary notes</h2>
          {dietary.length === 0 ? (
            <p className="mt-3 text-muted">None yet.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {dietary.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">
                    {r.first_name} {r.last_name}:
                  </span>{" "}
                  {r.dietary}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <GuestList parties={parties} />
    </div>
  );
}
