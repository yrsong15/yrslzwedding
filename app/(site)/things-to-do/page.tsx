import FadeIn from "@/components/FadeIn";
import PageHeader from "@/components/PageHeader";
import { foodAndDrink, thingsToDo } from "@/lib/site";

export const metadata = { title: "Things to Do" };

const mapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export default function ThingsToDoPage() {
  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Explore"
        title="Things to Do in Portland"
        intro="Making a trip of it? Here are some of our favorite ways to spend time in the Rose City, plus where we love to eat and drink."
      />

      <section className="mx-auto max-w-5xl px-4">
        <FadeIn>
          <h2 className="mb-8 text-center font-serif text-4xl text-plum">Sights</h2>
        </FadeIn>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {thingsToDo.map((t, i) => (
            <FadeIn key={t.title} delay={(i % 3) * 0.1}>
              <a
                href={t.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-white/60 p-6 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="font-serif text-5xl text-poppy/40">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-serif text-2xl text-plum group-hover:text-poppy">{t.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{t.area}</p>
                <p className="mt-4 flex-1 leading-relaxed text-muted">{t.blurb}</p>
                <span className="mt-4 text-sm text-poppy">Learn more ↗</span>
              </a>
            </FadeIn>
          ))}
        </div>
      </section>

      {foodAndDrink.map((group) => (
        <section key={group.title} className="mx-auto mt-20 max-w-5xl px-4">
          <FadeIn>
            <h2 className="mb-8 text-center font-serif text-4xl text-plum">{group.title}</h2>
          </FadeIn>
          <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {group.places.map((p, i) => (
              <li key={p.name}>
                <FadeIn delay={(i % 3) * 0.08} className="flex h-full flex-col border-t border-lavender/40 pt-4">
                  <h3 className="font-serif text-2xl text-plum">{p.name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-lavender">{p.tag}</p>
                  <p className="mt-3 flex-1 leading-relaxed text-muted">{p.blurb}</p>
                  {"map" in p ? (
                    <a
                      href={mapsUrl(p.map)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 text-sm text-poppy underline-offset-4 hover:underline"
                    >
                      Google Maps ↗
                    </a>
                  ) : (
                    <p className="mt-3 text-sm italic text-muted">Multiple locations</p>
                  )}
                </FadeIn>
              </li>
            ))}
          </ul>
          {group.footnote && (
            <FadeIn>
              <p className="mt-10 text-center font-serif text-xl italic text-muted">{group.footnote}</p>
            </FadeIn>
          )}
        </section>
      ))}
    </div>
  );
}
