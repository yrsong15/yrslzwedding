import Link from "next/link";
import { ago, changeText, describeChange, guestLabel, kindLabel, timeLabel } from "@/lib/notifications";
import type { RsvpNotification } from "@/lib/types";

export const NOTIFICATIONS_PATH = "/admin/notifications";

/** The anchor of a notification on the notifications page. */
export const notificationAnchor = (n: RsvpNotification) => `n-${n.id}`;

/** "by Jordan Kim", unless that's the party's name anyway. */
const byLine = (n: RsvpNotification) => (n.respondent && n.respondent !== n.party_name ? `by ${n.respondent}` : null);

/** A notification in the bell's dropdown, linking to it on the notifications page. Client-rendered only (relative time). */
export function CompactNotification({ n, isNew, onNavigate }: { n: RsvpNotification; isNew: boolean; onNavigate: () => void }) {
  const by = byLine(n);
  return (
    <Link
      href={`${NOTIFICATIONS_PATH}#${notificationAnchor(n)}`}
      onClick={onNavigate}
      className={`flex gap-3 px-4 py-3 transition hover:bg-linen focus-visible:bg-linen focus-visible:outline-none ${isNew ? "bg-lilac/25" : ""}`}
    >
      <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${isNew ? "bg-orange-dark" : "bg-transparent"}`} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug">
          {isNew && <span className="sr-only">New: </span>}
          <span className="font-medium text-plum">{n.party_name}</span> {kindLabel[n.kind]}
          {by && <span className="text-muted"> ({by})</span>}
          <span className="text-muted"> · {ago(n.created_at)}</span>
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-muted">
          {n.changes.map((g) => `${guestLabel(g)}: ${g.changes.map(changeText).join(", ")}`).join(" · ")}
        </span>
      </span>
    </Link>
  );
}

/** A notification on the notifications page, with every change spelled out. */
export function FullNotification({ n, isNew }: { n: RsvpNotification; isNew: boolean }) {
  const by = byLine(n);
  return (
    <li
      id={notificationAnchor(n)}
      className={`scroll-mt-28 rounded-2xl border p-5 sm:p-6 ${isNew ? "border-lavender bg-white" : "border-ink/10 bg-white/60"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p>
          <span className="font-serif text-2xl text-plum">{n.party_name}</span> <span className="text-muted">{kindLabel[n.kind]}</span>
          {isNew && (
            <span className="ml-2 inline-block rounded-full bg-orange-dark px-2 py-0.5 align-middle text-[10px] uppercase tracking-[0.15em] text-cream">
              New
            </span>
          )}
        </p>
        <time dateTime={n.created_at} className="text-sm tabular-nums text-muted">
          {timeLabel(n.created_at)}
        </time>
      </div>
      {by && <p className="text-sm text-muted">{by}</p>}
      <ul className="mt-3 space-y-1.5">
        {n.changes.map((g) => (
          <li key={g.guest_id} className="text-sm leading-relaxed">
            <span className="font-medium">{guestLabel(g)}:</span>{" "}
            {g.changes.map((c, i) => {
              const d = describeChange(c);
              return (
                <span key={c.field}>
                  {i > 0 && <span className="text-muted"> · </span>}
                  <span className="text-muted">{d.label}</span>{" "}
                  {d.from && (
                    <>
                      <span className="text-muted line-through decoration-muted/60">{d.from}</span> →{" "}
                    </>
                  )}
                  {d.to}
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </li>
  );
}
