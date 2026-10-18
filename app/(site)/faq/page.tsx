import Image from "next/image";
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
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-2xl text-plum">
                {f.q}
                <span className="text-orange-dark transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-muted">
                {f.a}
                {"link" in f && f.link && (
                  <>
                    {" "}
                    <a
                      href={f.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-dark hover:underline"
                    >
                      {f.link.text}
                    </a>
                    .
                  </>
                )}
              </p>
              {"note" in f && f.note && <p className="mt-2 text-sm italic text-muted">{f.note}</p>}
              {"images" in f && f.images && (
                <div className="mt-5 flex gap-3 sm:gap-4">
                  {f.images.map((img) => (
                    // Each grows in proportion to its aspect ratio, so all end up the same height.
                    <a
                      key={img.src}
                      href={img.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: `${img.width / img.height} 1 0%` }}
                    >
                      <Image
                        src={img.src}
                        width={img.width}
                        height={img.height}
                        alt={img.alt}
                        sizes="(min-width: 672px) 316px, 50vw"
                        className="h-auto w-full rounded-lg shadow-sm"
                      />
                    </a>
                  ))}
                </div>
              )}
            </details>
          </FadeIn>
        ))}
      </div>
      <p className="mt-12 text-center text-muted">
        Still have questions? Email us at{" "}
        <a href={`mailto:${couple.contactEmail}`} className="text-orange-dark hover:underline">
          {couple.contactEmail}
        </a>
        .
      </p>
    </div>
  );
}
