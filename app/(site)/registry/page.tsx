import FadeIn from "@/components/FadeIn";
import PageHeader from "@/components/PageHeader";
import { charities } from "@/lib/site";

export const metadata = { title: "Registry" };

export default function RegistryPage() {
  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Registry"
        title="Giving Back"
        intro="Your presence is the greatest gift. If you'd like to honor us with something more, we'd be grateful for a donation to one of these causes close to our hearts."
      />
      <div className="mx-auto grid max-w-4xl gap-6 px-4 sm:grid-cols-2">
        {charities.map((c, i) => (
          <FadeIn key={c.name} delay={i * 0.15}>
            <div className="flex h-full flex-col rounded-3xl border border-ink/10 bg-white/60 p-8 text-center">
              <h2 className="font-serif text-3xl text-sage-dark">{c.name}</h2>
              <p className="mt-4 flex-1 leading-relaxed text-muted">{c.blurb}</p>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-block rounded-full bg-terracotta px-8 py-3 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-terracotta-dark"
              >
                Donate ↗
              </a>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
