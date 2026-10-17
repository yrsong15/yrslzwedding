import Link from "next/link";
import Countdown from "@/components/Countdown";
import FadeIn from "@/components/FadeIn";
import { couple, koreanMessage, location, rsvpDeadline, venue, weddingDate, weddingDateLabel } from "@/lib/site";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden px-4 pb-20 pt-20 text-center sm:pt-28">
        {/* soft decorative blobs */}
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-lavender/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-poppy/15 blur-3xl" />

        <FadeIn>
          <p lang="ko" className="font-korean text-lg text-lavender [word-break:keep-all] sm:text-xl">
            {koreanMessage}
          </p>
        </FadeIn>
        <FadeIn delay={0.15}>
          <h1 className="mt-6 font-serif text-6xl leading-none text-plum sm:text-8xl">{couple.names}</h1>
        </FadeIn>
        <FadeIn delay={0.3}>
          <p className="mt-6 font-serif text-2xl italic text-muted">are getting married</p>
          <div className="mx-auto my-8 h-px w-20 bg-poppy/60" />
          <p className="text-sm uppercase tracking-[0.3em] text-ink">{weddingDateLabel}</p>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted">
            {venue} · {location}
          </p>
        </FadeIn>
        <FadeIn delay={0.45} className="mt-12">
          <Countdown target={weddingDate.toISOString()} />
        </FadeIn>
        <FadeIn delay={0.6} className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/rsvp"
            className="rounded-full bg-poppy px-8 py-3 text-sm uppercase tracking-[0.2em] text-cream transition hover:bg-poppy-dark"
          >
            RSVP
          </Link>
          <Link
            href="/schedule"
            className="rounded-full border border-plum px-8 py-3 text-sm uppercase tracking-[0.2em] text-plum transition hover:bg-plum hover:text-cream"
          >
            Schedule
          </Link>
        </FadeIn>
      </section>

      <section className="bg-linen px-4 py-20">
        <FadeIn className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-4xl text-plum">Join us in Portland</h2>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            We can&apos;t wait to celebrate with the people we love most. Look around for the weekend
            schedule, travel tips, and our favorite things to do in the city, and please let us know
            if you can make it by <strong className="font-medium text-ink">{rsvpDeadline}</strong>.
          </p>
        </FadeIn>
      </section>
    </>
  );
}
