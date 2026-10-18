import Link from "next/link";
import AdminLoginScreen from "@/components/admin/AdminLoginScreen";
import { adminSections } from "@/components/admin/AdminTabs";
import PageHeader from "@/components/PageHeader";
import { isAdmin } from "@/lib/admin";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLoginScreen />;

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24">
      <PageHeader title="Admin" />
      <div className="grid gap-6 sm:grid-cols-2">
        {adminSections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex flex-col rounded-2xl border border-ink/10 bg-white/60 p-8 transition hover:border-lavender hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <h2 className="font-serif text-3xl text-plum">{s.label}</h2>
            <p className="mt-3 flex-1 leading-relaxed text-muted">{s.description}</p>
            <span className="mt-6 text-xs uppercase tracking-[0.2em] text-orange-dark">
              Open <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
