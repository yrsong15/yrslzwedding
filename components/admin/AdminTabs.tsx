import Link from "next/link";

/** The parts of /admin: cards on /admin itself, tabs on each part. */
export const adminSections = [
  {
    href: "/admin/invites",
    label: "Invite list",
    description: "RSVP counts, meals and dietary notes, and the guest list: who's invited, whose guests they are, and their answers.",
  },
  {
    href: "/admin/cards",
    label: "Invite cards",
    description: "Check off each invited party once their card is in the mail. A party with a card sent can't be un-invited.",
  },
  {
    href: "/admin/seating",
    label: "Seating chart",
    description: "Drag each party to one of the 23 tables. Everyone in a party sits together.",
  },
] as const;

/** `current` is left out on pages that aren't one of the sections (the notifications page). */
export default function AdminTabs({ current }: { current?: (typeof adminSections)[number]["href"] }) {
  return (
    <nav aria-label="Admin" className="mb-10 flex justify-center">
      {/* On a phone the three labels wrap to two lines, so the pill becomes a rounded box. */}
      <div className="flex overflow-hidden rounded-2xl border border-plum/30 sm:rounded-full">
        {adminSections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={s.href === current ? "page" : undefined}
            className={`flex items-center justify-center px-3 py-2 text-center text-xs uppercase leading-snug tracking-[0.2em] sm:whitespace-nowrap sm:px-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lavender ${
              s.href === current ? "bg-plum text-cream" : "text-plum hover:bg-lavender/15"
            }`}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
