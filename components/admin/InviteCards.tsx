"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sides } from "@/lib/site";
import type { CardParty, Side } from "@/lib/types";
import { Picker, Switch, normName, shortDate } from "./controls";
import { send } from "./send";

type Filters = { query: string; card: "all" | "not" | "sent"; side: "all" | Side };
const noFilters: Filters = { query: "", card: "all", side: "all" };
const cardOptions: [Filters["card"], string][] = [["all", "All"], ["not", "Not sent"], ["sent", "Sent"]];
const sideOptions: [Filters["side"], string][] = [["all", "All"], ...sides.map((s): [Side, string] => [s.value, s.label])];

/** Card sent or not, before the server confirms it. A party already marked keeps its date. */
const applyCard = (parties: CardParty[], c: { id: string; sent: boolean }) =>
  parties.map((p) =>
    p.id === c.id ? { ...p, card_sent_at: c.sent ? (p.card_sent_at ?? new Date().toISOString()) : null } : p,
  );

function applyFilters(parties: CardParty[], f: Filters) {
  const q = normName(f.query);
  return parties
    .filter((p) => f.card === "all" || !!p.card_sent_at === (f.card === "sent"))
    .filter((p) => f.side === "all" || p.side === f.side)
    .filter((p) => !q || normName(p.name).includes(q) || p.guests.some((n) => n && normName(n).includes(q)));
}

export default function InviteCards({ parties }: { parties: CardParty[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(noFilters);
  const [, startTransition] = useTransition();
  // A switch flips at once. The refresh that follows runs in the same
  // transition, so nothing flips back while the saved list loads.
  const [shown, show] = useOptimistic(parties, applyCard);

  function toggle(p: CardParty) {
    const sent = !p.card_sent_at;
    if (!sent && !confirm(`Mark the card to ${p.name} as not sent? They can be un-invited again.`)) return;
    setError("");
    startTransition(async () => {
      show({ id: p.id, sent });
      const problem = await send("PATCH", "/api/admin/parties", { action: "card", id: p.id, sent });
      if (problem) setError(problem);
      startTransition(() => router.refresh());
    });
  }

  const sent = shown.filter((p) => p.card_sent_at).length;
  const stats = [
    { label: "Cards sent", value: `${sent} / ${shown.length}` },
    { label: "Still to send", value: shown.length - sent },
  ];
  const rows = applyFilters(shown, filters);
  const filtered = (Object.keys(noFilters) as (keyof Filters)[]).some((k) => filters[k] !== noFilters[k]);
  const set = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink/10 bg-white/60 p-5 text-center">
            <p className="font-serif text-4xl text-plum">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-3xl text-plum">Cards</h2>
        <p className="mt-1 text-sm text-muted">
          One card per invited party. Once a party&apos;s card is marked sent, nobody invited in it can be un-invited or
          deleted on the Invite list.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <input
            type="search"
            aria-label="Search names or parties"
            placeholder="Search names or parties"
            value={filters.query}
            onChange={(e) => set({ query: e.target.value })}
            className="w-64 rounded-full border border-ink/20 bg-white/70 px-4 py-1.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
          />
          <Picker label="Card" value={filters.card} options={cardOptions} onChange={(card) => set({ card })} />
          <Picker label="Guest of" value={filters.side} options={sideOptions} onChange={(side) => set({ side })} />
        </div>
        <p className="mt-3 text-sm text-muted">
          {rows.length} {rows.length === 1 ? "party" : "parties"}
          {filtered && (
            <>
              {" · "}
              <button onClick={() => setFilters(noFilters)} className="underline underline-offset-4 hover:text-orange-dark">
                Clear
              </button>
            </>
          )}
        </p>
        <p className="mt-1 min-h-5 text-sm text-orange-dark" role="alert">
          {error}
        </p>

        <div className="mt-2 overflow-x-auto rounded-2xl border border-ink/10 bg-white/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/10 text-xs uppercase tracking-[0.15em] text-muted">
              <tr>
                {["Sent", "Party", "Guest of", "Sent on"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-t border-ink/10 first:border-t-0">
                  <td className="px-4 py-3">
                    <Switch checked={!!p.card_sent_at} onClick={() => toggle(p)} label={`Card sent to ${p.name}`} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-serif text-xl text-plum">{p.name}</p>
                    <p className="text-xs text-muted">{p.guests.map((n) => n ?? "+1").join(", ")}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {sides.find((s) => s.value === p.side)?.label ?? <span className="text-orange-dark">Not set</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                    {p.card_sent_at ? shortDate(p.card_sent_at) : <span className="text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-6 text-center text-muted">
              {shown.length === 0 ? "No invited parties yet. Invite people on the Invite list." : "No one matches."}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
