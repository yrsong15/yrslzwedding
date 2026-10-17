import AdminLogin from "@/components/AdminLogin";
import PageHeader from "@/components/PageHeader";
import { getSummary, isAdmin, type SummaryRow } from "@/lib/admin";
import { mealOptions } from "@/lib/site";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <div className="pb-24">
        <PageHeader title="Admin" intro="For the couple only." />
        <AdminLogin />
      </div>
    );
  }

  let rows: SummaryRow[];
  try {
    rows = await getSummary();
  } catch (e) {
    console.error(e);
    return (
      <div className="pb-24">
        <PageHeader title="Admin" intro="Couldn't load RSVPs. Check your Supabase env vars and that schema.sql has been run." />
      </div>
    );
  }

  // Unnamed plus-ones that were never claimed aren't real guests yet.
  const real = rows.filter((r) => !(r.is_plus_one && r.attending !== "yes"));
  const count = (pred: (r: SummaryRow) => boolean) => real.filter(pred).length;
  const attending = real.filter((r) => r.attending === "yes");
  const parties = new Set(rows.map((r) => r.party));
  const respondedParties = new Set(rows.filter((r) => r.responded_at).map((r) => r.party));

  const stats = [
    { label: "Attending", value: attending.length },
    { label: "Declined", value: count((r) => r.attending === "no") },
    { label: "Pending", value: count((r) => r.attending === "pending") },
    { label: "Parties responded", value: `${respondedParties.size} / ${parties.size}` },
    { label: "Welcome drinks", value: count((r) => r.welcome_drinks === "yes") },
  ];
  const meals = mealOptions.map((m) => ({ ...m, n: attending.filter((r) => r.meal === m.value).length }));
  const dietary = attending.filter((r) => r.dietary);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <PageHeader title="RSVP Dashboard" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink/10 bg-white/60 p-5 text-center">
            <p className="font-serif text-4xl text-sage-dark">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-ink/10 bg-white/60 p-6">
          <h2 className="font-serif text-2xl text-sage-dark">Meals</h2>
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
          <h2 className="font-serif text-2xl text-sage-dark">Dietary notes</h2>
          {dietary.length === 0 ? (
            <p className="mt-3 text-muted">None yet.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {dietary.map((r) => (
                <li key={`${r.party}-${r.first_name}-${r.last_name}`}>
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

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-3xl text-sage-dark">All guests</h2>
        <a
          href="/api/admin/export"
          className="rounded-full bg-sage-dark px-6 py-2.5 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-ink"
        >
          Download CSV
        </a>
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.15em] text-muted">
            <tr>
              {["Party", "Name", "Wedding", "Welcome", "Meal", "Dietary", "Responded"].map((h) => (
                <th key={h} className="whitespace-nowrap px-4 py-3 font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/5">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2.5">{r.party}</td>
                <td className="px-4 py-2.5">
                  {r.is_plus_one && !r.first_name ? <span className="text-muted">(plus-one)</span> : `${r.first_name} ${r.last_name}`}
                </td>
                <td className="px-4 py-2.5">
                  <Badge v={r.attending} />
                </td>
                <td className="px-4 py-2.5">
                  <Badge v={r.welcome_drinks} />
                </td>
                <td className="px-4 py-2.5">{r.meal ?? ""}</td>
                <td className="px-4 py-2.5">{r.dietary ?? ""}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                  {r.responded_at ? new Date(r.responded_at).toLocaleDateString() : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Badge({ v }: { v: string }) {
  const style =
    v === "yes" ? "bg-sage/20 text-sage-dark" : v === "no" ? "bg-terracotta/15 text-terracotta-dark" : "bg-ink/5 text-muted";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs ${style}`}>{v}</span>;
}
