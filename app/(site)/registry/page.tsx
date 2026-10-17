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
        intro="Your presence is the gift, so we will not be accepting any gifts — we wouldn't have room to store them in our NYC apartment anyway! In lieu of physical gifts, please consider donating to one of the following charities that mean a lot to us."
      />
      <div className="mx-auto grid max-w-4xl gap-6 px-4 sm:grid-cols-2">
        {charities.map((c, i) => (
          <FadeIn key={c.name} delay={i * 0.15}>
            <div className="flex h-full flex-col rounded-3xl border border-ink/10 bg-white/60 p-8 text-center">
              <h2 className="font-serif text-3xl text-plum">{c.name}</h2>
              <p className="mt-4 flex-1 leading-relaxed text-muted">{c.blurb}</p>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-block rounded-full bg-orange px-8 py-3 text-sm uppercase tracking-[0.2em] text-plum transition hover:bg-orange-dark hover:text-cream"
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
