import FadeIn from "@/components/FadeIn";
import PageHeader from "@/components/PageHeader";
import { thingsToDo } from "@/lib/site";

export const metadata = { title: "Things to Do" };

export default function ThingsToDoPage() {
  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Explore"
        title="Things to Do in Portland"
        intro="Making a trip of it? Here are five of our favorite ways to spend time in the Rose City."
      />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
        {thingsToDo.map((t, i) => (
          <FadeIn key={t.title} delay={(i % 3) * 0.1}>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-white/60 p-6 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="font-serif text-5xl text-terracotta/40">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="mt-3 font-serif text-2xl text-sage-dark group-hover:text-terracotta">{t.title}</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{t.area}</p>
              <p className="mt-4 flex-1 leading-relaxed text-muted">{t.blurb}</p>
              <span className="mt-4 text-sm text-terracotta">Learn more ↗</span>
            </a>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
