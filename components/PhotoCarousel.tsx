"use client";

import Image from "next/image";
import { useRef } from "react";
import { photos } from "@/lib/site";

// A row of photos you swipe (or shift-scroll / arrow-key) sideways, snapping to
// each one. Every photo is the same height and its own width, so none are
// cropped. The arrow buttons are for mice, which can't scroll sideways easily.

export default function PhotoCarousel() {
  const row = useRef<HTMLDivElement>(null);

  function scroll(direction: 1 | -1) {
    const el = row.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={row}
        role="region"
        aria-label="Photos"
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-lavender sm:px-[max(1rem,calc(50%-36rem))] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((photo, i) => (
          <Image
            key={i}
            src={photo.src}
            alt={photo.alt}
            placeholder="blur"
            sizes="(min-width: 640px) 680px, 480px"
            className="h-80 w-auto max-w-none shrink-0 snap-center shadow-lg shadow-plum/10 sm:h-[28rem]"
          />
        ))}
      </div>
      <div className="mt-4 hidden justify-center gap-3 sm:flex">
        {([-1, 1] as const).map((direction) => (
          <button
            key={direction}
            type="button"
            onClick={() => scroll(direction)}
            aria-label={direction < 0 ? "Previous photos" : "Next photos"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-plum text-plum transition hover:bg-plum hover:text-cream"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d={direction < 0 ? "M12.5 4 6.5 10l6 6" : "M7.5 4l6 6-6 6"} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
