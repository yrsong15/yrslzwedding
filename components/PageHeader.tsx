import FadeIn from "./FadeIn";

export default function PageHeader({ eyebrow, title, intro }: { eyebrow?: string; title: string; intro?: string }) {
  return (
    <FadeIn className="mx-auto max-w-3xl px-4 pb-10 pt-16 text-center sm:pt-24">
      {eyebrow && <p className="mb-3 text-xs uppercase tracking-[0.3em] text-sage">{eyebrow}</p>}
      <h1 className="font-serif text-5xl text-sage-dark sm:text-6xl">{title}</h1>
      <div className="mx-auto my-6 h-px w-16 bg-terracotta/60" />
      {intro && <p className="text-lg leading-relaxed text-muted">{intro}</p>}
    </FadeIn>
  );
}
