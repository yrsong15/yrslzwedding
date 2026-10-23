"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { sides } from "@/lib/site";
import type { BellData, Side } from "@/lib/types";
import { WhoPicker } from "./controls";
import { CompactNotification, NOTIFICATIONS_PATH } from "./NotificationItem";
import { send } from "./send";

const POLL_MS = 60_000;

/**
 * Bell with a count of new RSVP notifications. Opening it lists the latest ones
 * and counts them as seen: the badge clears, and what was new stays highlighted
 * until it closes.
 */
export default function NotificationBell({ initial }: { initial: BellData }) {
  const pathname = usePathname();
  const onPage = pathname === NOTIFICATIONS_PATH;
  const [data, setData] = useState(initial);
  const [open, setOpen] = useState(false);
  // How many were new when it opened.
  const [fresh, setFresh] = useState(0);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const loggedOut = useRef(false);
  const panelId = useId();

  // A router.refresh() re-renders the layout with newer data.
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setData(initial);
  }

  const refresh = useCallback(async (): Promise<BellData | null> => {
    if (loggedOut.current) return null;
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" });
      if (res.status === 401) loggedOut.current = true;
      if (!res.ok) return null;
      const next = (await res.json()) as BellData;
      setData(next);
      return next;
    } catch {
      return null;
    }
  }, []);

  // Keep the count fresh: every minute while the tab is showing (and the list
  // isn't open, so it doesn't shift while being read), as soon as it shows
  // again, and on each admin page (the notifications page marks things seen).
  useEffect(() => {
    if (open) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [open, refresh]);
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    void refresh();
  }, [pathname, refresh]);

  /** Count everything shown as seen by whoever's checking. */
  function markSeen(d: BellData) {
    setFresh(d.unread);
    if (!d.who || d.unread === 0 || d.items.length === 0) return;
    setData({ ...d, unread: 0 });
    void send("PATCH", "/api/admin/notifications", { action: "seen", id: d.items[0].id, list: false });
  }

  async function show() {
    setOpen(true);
    setError("");
    // Highlight what's known to be new right away, then catch up with anything
    // that came in since the last check before marking it all seen.
    setFresh(data.unread);
    markSeen((await refresh()) ?? data);
  }

  async function pick(who: Side) {
    setPicking(true);
    setError("");
    const problem = await send("PATCH", "/api/admin/notifications", { action: "who", who });
    if (problem) setError(problem);
    const next = await refresh();
    setPicking(false);
    if (next) markSeen(next);
  }

  // Escape (back to the bell) or a click outside closes it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const me = sides.find((s) => s.value === data.who);
  const other = sides.find((s) => s.value !== data.who)!;
  // On the notifications page, everything is being read already.
  const count = open || onPage || !data.who ? 0 : data.unread;
  // Until they say who they are, a dot asks them to open it.
  const dot = !data.who && data.items.length > 0;
  const newShown = data.who ? Math.min(fresh, data.items.length) : 0;
  const label = count > 0 ? `Notifications, ${count} new` : "Notifications";
  const close = () => setOpen(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative">
        <button
          ref={button}
          type="button"
          aria-label={label}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => (open ? close() : void show())}
          className={`relative flex size-11 items-center justify-center rounded-full border border-ink/10 bg-cream/90 text-plum shadow-sm backdrop-blur transition hover:border-lavender hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender ${
            open ? "border-lavender bg-white" : ""
          }`}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="size-5.5" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9a6 6 0 1 1 12 0c0 4.5 1.5 6.5 2.5 7.5h-17C4.5 15.5 6 13.5 6 9Z" />
            <path d="M10 19.5a2 2 0 0 0 4 0" />
          </svg>
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                aria-hidden
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-dark px-1.5 text-[11px] font-medium tabular-nums leading-none text-cream ring-2 ring-cream"
              >
                {count > 99 ? "99+" : count}
              </motion.span>
            )}
            {dot && !open && (
              <motion.span
                key="dot"
                aria-hidden
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute right-0.5 top-0.5 size-2.5 rounded-full bg-orange-dark ring-2 ring-cream"
              />
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              ref={panel}
              id={panelId}
              role="region"
              aria-label="Latest notifications"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 flex max-h-[min(36rem,75svh)] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-ink/10 bg-cream text-left shadow-xl"
            >
              <div className="flex items-baseline justify-between gap-3 border-b border-ink/10 px-4 py-3">
                <h2 className="font-serif text-2xl text-plum">Notifications</h2>
                {me && (
                  <button
                    type="button"
                    disabled={picking}
                    onClick={() => void pick(other.value)}
                    className="text-xs text-muted underline-offset-4 hover:text-orange-dark hover:underline disabled:opacity-50"
                  >
                    Not {me.label}? Switch
                  </button>
                )}
              </div>
              {!data.who && (
                <div className="border-b border-ink/10 px-4 py-4">
                  <WhoPicker onPick={(who) => void pick(who)} disabled={picking} />
                </div>
              )}
              {error && (
                <p role="alert" className="px-4 pt-3 text-sm text-orange-dark">
                  {error}
                </p>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {data.items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted">No RSVPs yet. You&apos;ll see them here as guests respond.</p>
                ) : (
                  <>
                    {newShown > 0 && <GroupLabel>New</GroupLabel>}
                    <ul>
                      {data.items.slice(0, newShown).map((n) => (
                        <li key={n.id}>
                          <CompactNotification n={n} isNew onNavigate={() => close()} />
                        </li>
                      ))}
                    </ul>
                    {fresh > data.items.length && (
                      <p className="px-4 py-2 text-xs text-muted">and {fresh - data.items.length} more on the notifications page</p>
                    )}
                    {newShown > 0 && newShown < data.items.length && <GroupLabel>Earlier</GroupLabel>}
                    <ul>
                      {data.items.slice(newShown).map((n) => (
                        <li key={n.id}>
                          <CompactNotification n={n} isNew={false} onNavigate={() => close()} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <Link
                href={NOTIFICATIONS_PATH}
                onClick={() => close()}
                className="block border-t border-ink/10 px-4 py-3 text-center text-xs uppercase tracking-[0.2em] text-orange-dark transition hover:bg-linen focus-visible:bg-linen focus-visible:outline-none"
              >
                See all notifications →
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-4 pb-1 pt-3 text-xs uppercase tracking-[0.2em] text-lavender">{children}</p>;
}
