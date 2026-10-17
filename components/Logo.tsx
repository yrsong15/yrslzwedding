// "LYR" monogram: serif L and R with a fork-shaped Y whose arms are arrows
// pointing left (to L) and right (to R). Sized by font-size via className.
//
// Spacing: the visible ink gap between L|Y and Y|R is 0.08em on both sides.
// The margins differ because Cormorant's L has 0.0118em of space after its
// ink and R has 0.0412em before it; the Y's arrow tips sit 0.0038em inside
// the SVG box. public/logo.svg is a standalone outlined copy; keep in sync.
// An alternate "L & YR" version is saved in design/logo-backups/.

export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="LYR — Lauren & Young Re"
      className={`inline-flex items-baseline font-serif leading-none text-sage-dark ${className}`}
    >
      <span aria-hidden>L</span>
      <svg
        aria-hidden
        viewBox="5 2.5 50 44"
        className="ml-[0.0644em] mr-[0.035em] inline-block h-[0.66em] w-[0.75em] overflow-visible text-terracotta"
      >
        <g fill="none" stroke="currentColor" strokeWidth={3.6} strokeLinecap="butt" strokeLinejoin="miter">
          <path d="M30 46.5V30C30 18 24 11 10 11M30 30C30 18 36 11 50 11" />
          <path d="M15.5 4.5L8 11l7.5 6.5" />
          <path d="M44.5 4.5L52 11l-7.5 6.5" />
        </g>
      </svg>
      <span aria-hidden>R</span>
    </span>
  );
}
