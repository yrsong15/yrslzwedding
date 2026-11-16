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
    body: `All the major rental companies operate at PDX. Handy for day trips to the Gorge or the coast. Just note that downtown parking can be pricey. Parking at the ${hotel.shortName} is ${hotel.parking}. ${hotel.parkingTip}`,
  },
];

export default function TravelPage() {
  return (
    <div className="pb-24">
      <PageHeader eyebrow="Getting here" title="Travel & Lodging" />

      <FadeIn className="mx-auto max-w-3xl px-4">
        <div className="rounded-3xl bg-plum px-6 py-10 text-center text-cream sm:px-12">
          <p className="text-xs uppercase tracking-[0.3em] text-cream/70">
            {hotel.block ? "Hotel block" : "Where to stay"}
          </p>
          <h2 className="mt-3 font-serif text-4xl">{hotel.name}</h2>
          <p className="mt-1 text-cream/80">{hotel.neighborhood}, Portland</p>
          <p className="text-sm text-cream/60">{hotel.address}</p>
          {hotel.block ? (
            <div className="mx-auto mt-6 max-w-lg space-y-3 leading-relaxed text-cream/90">
              <p>
                We&apos;ve reserved a block of rooms at a discounted rate, just two blocks down from the venue.
                The rate is available for any nights from {hotel.block.firstNight} through{" "}
                {hotel.block.lastNight}, so you can come early or stay on after the wedding.
              </p>
              <p>
                With welcome drinks on Friday night and the wedding on Saturday night, we recommend booking at
                least <span className="font-medium text-orange">July 23–25</span>.
              </p>
              <p>
                The button below applies our group rate for you. Just change the dates to match your stay.
                {hotel.block.cutoff && <> Please reserve by {hotel.block.cutoff}.</>}
              </p>
            </div>
          ) : (
            <p className="mx-auto mt-6 max-w-lg leading-relaxed text-cream/90">
              Our recommended hotel is just two blocks down from the venue, and an easy walk
              to Powell&apos;s, coffee shops, and restaurants in the Pearl.
            </p>
          )}
          <a
            href={hotel.block?.bookingUrl ?? hotel.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-block rounded-full bg-cream px-8 py-3 text-sm uppercase tracking-[0.2em] text-plum transition hover:bg-orange hover:text-plum"
          >
            {hotel.block ? "Book your room" : "Visit hotel website"} ↗
          </a>
          {hotel.block && (
            <p className="mt-5 text-sm text-cream/70">
              Booking by phone? Mention group code{" "}
              <span className="rounded bg-cream/15 px-2 py-0.5 font-mono tracking-wider">{hotel.block.code}</span>{" "}
              <span className="text-xs text-cream/60">({hotel.block.codeSpelled})</span>
            </p>
          )}
        </div>
      </FadeIn>

      <section className="mx-auto mt-20 max-w-5xl px-4">
        <FadeIn>
          <h2 className="text-center font-serif text-4xl text-plum">From PDX to downtown</h2>
          <p className="mt-3 text-center text-muted">Portland International Airport (PDX) is about 10 miles from the city center.</p>
        </FadeIn>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {transport.map((t, i) => (
            <FadeIn key={t.title} delay={i * 0.1}>
              <div className="h-full rounded-2xl border border-ink/10 bg-white/60 p-6">
                <h3 className="font-serif text-2xl text-orange-dark">{t.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{t.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>
    </div>
  );
}
