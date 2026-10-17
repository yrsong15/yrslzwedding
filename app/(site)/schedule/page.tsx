import FadeIn from "@/components/FadeIn";
import PageHeader from "@/components/PageHeader";
import { schedule } from "@/lib/site";

export const metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <div className="pb-24">
      <PageHeader eyebrow="The weekend" title="Schedule" intro="More details to come as the day gets closer." />
      <div className="mx-auto max-w-3xl space-y-16 px-4">
        {schedule.map((day) => (
          <section key={day.day}>
            <FadeIn>
              <h2 className="mb-8 text-center text-sm uppercase tracking-[0.3em] text-poppy">{day.day}</h2>
            </FadeIn>
            <ol className="relative space-y-8 border-l border-lavender/40 pl-8">
              {day.events.map((e, i) => (
                <FadeIn key={e.title} delay={i * 0.1}>
                  <li className="relative">
                    <span className="absolute -left-[37px] top-2 h-3 w-3 rounded-full border-2 border-cream bg-lavender" />
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">{e.time}</p>
                    <h3 className="mt-1 font-serif text-3xl text-plum">{e.title}</h3>
                    <p className="mt-1 font-medium">{e.place}</p>
                    {"address" in e && e.address && (
                      <a
                        href={e.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-poppy underline-offset-4 hover:underline"
                      >
                        {e.address} ↗
                      </a>
                    )}
                    <p className="mt-2 leading-relaxed text-muted">{e.description}</p>
                  </li>
                </FadeIn>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
