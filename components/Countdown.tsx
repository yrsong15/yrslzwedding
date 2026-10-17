"use client";

import { useEffect, useState } from "react";

function diff(target: number) {
  const ms = Math.max(0, target - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export default function Countdown({ target }: { target: string }) {
  const t = new Date(target).getTime();
  // Render nothing until mounted to avoid a server/client time mismatch.
  const [left, setLeft] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setLeft(diff(t));
    const id = setInterval(() => setLeft(diff(t)), 1000);
    return () => clearInterval(id);
  }, [t]);

  const units = [
    ["days", left?.days],
    ["hours", left?.hours],
    ["minutes", left?.minutes],
    ["seconds", left?.seconds],
  ] as const;

  return (
    <div className="flex justify-center gap-3 sm:gap-6" aria-label="Countdown to the wedding">
      {units.map(([label, value]) => (
        <div key={label} className="w-16 text-center sm:w-20">
          <div className="font-serif text-4xl tabular-nums text-plum sm:text-5xl">
            {value === undefined ? "–" : String(value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted sm:text-xs">{label}</div>
        </div>
      ))}
    </div>
  );
}
