import Link from "next/link";

/** The parts of /admin: cards on /admin itself, tabs on each part. */
export const adminSections = [
  {
    href: "/admin/invites",
    label: "Invite list",
    description: "RSVP counts, meals and dietary notes, and the guest list: who's invited, whose guests they are, and their answers.",
  },
  {
    href: "/admin/seating",
    label: "Seating chart",
    description: "Drag each party to one of the 23 tables. Everyone in a party sits together.",
  },
] as const;

export default function AdminTabs({ current }: { current: (typeof adminSections)[number]["href"] }) {
  return (
    <nav aria-label="Admin" className="mb-10 flex justify-center">
      <div className="flex overflow-hidden rounded-full border border-plum/30">
        {adminSections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={s.href === current ? "page" : undefined}
            className={`px-5 py-2 text-xs uppercase tracking-[0.2em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lavender ${
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
