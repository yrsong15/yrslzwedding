"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dayLabel } from "@/lib/notifications";
import type { RsvpNotification, Side } from "@/lib/types";
import { WhoPicker } from "./controls";
import { FullNotification } from "./NotificationItem";
import { send } from "./send";

/**
 * Every RSVP notification, newest first, grouped by day. The first `fresh` are
 * new since this person last visited. Visiting counts as reading them all (in
 * the bell too), but they stay highlighted until the page is left.
 */
export default function NotificationList({ items, fresh, who }: { items: RsvpNotification[]; fresh: number; who: Side | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const newest = items[0]?.id;

  useEffect(() => {
    if (who && newest) void send("PATCH", "/api/admin/notifications", { action: "seen", id: newest, list: true });
  }, [who, newest]);

  async function pick(w: Side) {
    setPicking(true);
    setError("");
    const problem = await send("PATCH", "/api/admin/notifications", { action: "who", who: w });
    setPicking(false);
    if (problem) return setError(problem);
    router.refresh();
  }

  const days: { day: string; entries: { n: RsvpNotification; isNew: boolean }[] }[] = [];
  items.forEach((n, i) => {
    const day = dayLabel(n.created_at);
    if (days.at(-1)?.day !== day) days.push({ day, entries: [] });
    days.at(-1)!.entries.push({ n, isNew: i < fresh });
  });

  return (
    <>
      {!who && (
        <div className="mb-8 rounded-2xl border border-ink/10 bg-white/60 p-6">
          <WhoPicker onPick={(w) => void pick(w)} disabled={picking} />
        </div>
      )}
      {error && (
        <p role="alert" className="mb-6 text-center text-sm text-orange-dark">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-center text-muted">No RSVPs yet. Each time a guest responds, changes, or clears their RSVP, it shows up here.</p>
      ) : (
        <>
          <p className="mb-6 text-center text-sm text-muted">
            {items.length} notification{items.length === 1 ? "" : "s"}
            {who && fresh > 0 && ` · ${fresh} new`}
          </p>
          <div className="space-y-10">
            {days.map(({ day, entries }) => (
              <section key={day}>
                <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-lavender">{day}</h2>
                <ul className="space-y-3">
                  {entries.map(({ n, isNew }) => (
                    <FullNotification key={n.id} n={n} isNew={isNew} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
