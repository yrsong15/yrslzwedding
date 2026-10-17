import Logo from "@/components/Logo";
import Nav from "@/components/Nav";
import { weddingDateLabel, location } from "@/lib/site";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ink/10 py-10 text-center">
        <Logo size={160} className="mx-auto" />
        <p className="mt-3 text-xs uppercase tracking-[0.25em] text-muted">
          {weddingDateLabel}
          <span className="hidden sm:inline"> · </span>
          <span className="mt-1.5 block sm:mt-0 sm:inline">{location}</span>
        </p>
      </footer>
    </div>
  );
}
