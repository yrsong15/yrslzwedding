import Nav from "@/components/Nav";
import { couple, weddingDateLabel, location } from "@/lib/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ink/10 py-10 text-center">
        <p className="font-serif text-2xl text-sage-dark">{couple.names}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted">
          {weddingDateLabel} · {location}
        </p>
      </footer>
    </div>
  );
}
