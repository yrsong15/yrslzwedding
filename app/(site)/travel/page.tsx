import FadeIn from "@/components/FadeIn";
import PageHeader from "@/components/PageHeader";
import { hotel } from "@/lib/site";

export const metadata = { title: "Travel & Lodging" };

const transport = [
  {
    title: "Public transit",
    body: "TriMet's MAX Red Line runs from PDX straight to downtown and the Pearl District in about 40 minutes. Tap a contactless card or phone at the platform to pay.",
  },
  {
    title: "Rideshare",
    body: "Uber and Lyft pick up from the PDX parking garage. Downtown is about a 20–30 minute ride, depending on traffic.",
  },
  {
    title: "Rental car",
    body: "All the major rental companies operate at PDX. Handy for day trips to the Gorge or the coast. Just note that downtown parking can be pricey.",
  },
];

export default function TravelPage() {
  return (
    <div className="pb-24">
      <PageHeader eyebrow="Getting here" title="Travel & Lodging" />

      <FadeIn className="mx-auto max-w-3xl px-4">
        <div className="rounded-3xl bg-sage-dark px-6 py-10 text-center text-cream sm:px-12">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/70">Hotel block</p>
          <h2 className="mt-3 font-serif text-4xl">{hotel.name}</h2>
          <p className="mt-1 text-cream/80">{hotel.neighborhood}, downtown Portland</p>
          <p className="text-sm text-cream/60">{hotel.address}</p>
          <p className="mx-auto mt-6 max-w-lg leading-relaxed text-cream/90">
            We&apos;ve reserved a block of rooms at a discounted rate. Use code{" "}
            <span className="rounded bg-cream/15 px-2 py-0.5 font-mono tracking-wider">{hotel.code}</span> when
            booking. Please reserve by {hotel.cutoff}.
          </p>
          <a
            href={hotel.bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-full bg-cream px-8 py-3 text-sm uppercase tracking-[0.2em] text-sage-dark transition hover:bg-terracotta hover:text-cream"
          >
            Book your room
          </a>
        </div>
      </FadeIn>

      <section className="mx-auto mt-20 max-w-5xl px-4">
        <FadeIn>
          <h2 className="text-center font-serif text-4xl text-sage-dark">From PDX to downtown</h2>
          <p className="mt-3 text-center text-muted">Portland International Airport (PDX) is about 10 miles from the city center.</p>
        </FadeIn>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {transport.map((t, i) => (
            <FadeIn key={t.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-ink/10 bg-white/60 p-6">
                <h3 className="font-serif text-2xl text-terracotta">{t.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{t.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>
    </div>
  );
}
