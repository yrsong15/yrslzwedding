"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { navLinks } from "@/lib/site";
import Logo from "./Logo";

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-cream/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Home" className="transition-opacity hover:opacity-80">
          <Logo size={64} />
        </Link>

        <ul className="hidden gap-6 lg:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`group relative text-sm uppercase tracking-[0.15em] transition-colors hover:text-orange-dark ${
                  isActive(l.href) ? "text-orange-dark" : "text-ink/80"
                }`}
              >
                <BilingualLabel en={l.label} ko={l.ko} />
                {isActive(l.href) && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-orange"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
        >
          <span className={`h-px w-6 bg-ink transition ${open ? "translate-y-[3.5px] rotate-45" : ""}`} />
          <span className={`h-px w-6 bg-ink transition ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-ink/10 lg:hidden"
          >
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`block px-6 py-3 text-sm uppercase tracking-[0.15em] ${
                    isActive(l.href) ? "text-orange-dark" : "text-ink/80"
                  }`}
                >
                  {/* Touch screens can't hover, so the menu shows the Korean as a second line. */}
                  <span className="block">{l.label}</span>
                  <span lang="ko" aria-hidden className="mt-0.5 block font-korean text-xs normal-case tracking-[0.05em] opacity-70">
                    {l.ko}
                  </span>
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}

// English label that flips to Korean while its parent link (`group`) is
// hovered, keyboard-focused, or pressed. Both labels share one grid cell, so
// the tab is as wide as the longer one and nothing shifts on hover. Tailwind v4
// only applies hover on devices that support it, so touch screens use the
// press (active) state instead of a sticky hover. With reduced motion the
// labels only cross-fade (the slide is motion-safe only).
function BilingualLabel({ en, ko }: { en: string; ko: string }) {
  const hide =
    "group-hover:opacity-0 group-focus-visible:opacity-0 group-active:opacity-0 " +
    "motion-safe:group-hover:-translate-y-full motion-safe:group-focus-visible:-translate-y-full motion-safe:group-active:-translate-y-full";
  const show =
    "opacity-0 motion-safe:translate-y-full group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100 " +
    "motion-safe:group-hover:translate-y-0 motion-safe:group-focus-visible:translate-y-0 motion-safe:group-active:translate-y-0";
  return (
    <span className="inline-grid overflow-hidden whitespace-nowrap align-bottom">
      <span className={`[grid-area:1/1] text-center transition duration-300 ease-out ${hide}`}>{en}</span>
      <span
        lang="ko"
        aria-hidden
        className={`[grid-area:1/1] text-center font-korean normal-case tracking-[0.05em] transition duration-300 ease-out ${show}`}
      >
        {ko}
      </span>
    </span>
  );
}
