"use client";

import { useSyncExternalStore } from "react";

function diff(target: number, now: number) {
  const ms = Math.max(0, target - now);
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor((ms / 3_600_000) % 24),
    minutes: Math.floor((ms / 60_000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

// The clock as an external store, ticking once a second. The server (and the
// first render in the browser, while hydrating) gets null, so both show dashes
// and never disagree about the time.
const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const nowInSeconds = () => Math.floor(Date.now() / 1000);
const noTimeOnServer = () => null;

export default function Countdown({ target }: { target: string }) {
  const now = useSyncExternalStore(subscribe, nowInSeconds, noTimeOnServer);
  const left = now === null ? null : diff(new Date(target).getTime(), now * 1000);

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
