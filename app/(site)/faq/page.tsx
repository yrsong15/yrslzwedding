import FadeIn from "@/components/FadeIn";
import PageHeader from "@/components/PageHeader";
import { couple, faqs } from "@/lib/site";

export const metadata = { title: "FAQs" };

export default function FaqPage() {
  return (
    <div className="pb-24">
      <PageHeader eyebrow="Good to know" title="FAQs" />
      <div className="mx-auto max-w-2xl divide-y divide-ink/10 border-y border-ink/10 px-4">
        {faqs.map((f, i) => (
          <FadeIn key={f.q} delay={i * 0.05}>
            <details className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl text-sage-dark">
                {f.q}
                <span className="text-terracotta transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
            </details>
          </FadeIn>
        ))}
      </div>
      <p className="mt-12 text-center text-muted">
        Still have questions? Email us at{" "}
        <a href={`mailto:${couple.contactEmail}`} className="text-terracotta hover:underline">
          {couple.contactEmail}
        </a>
        .
      </p>
    </div>
  );
}
