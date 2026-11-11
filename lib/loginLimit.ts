import "server-only";
import { supabase } from "./supabase";

// Slows down guessing of the admin password: after MAX_FAILURES wrong tries
// from one IP address within WINDOW_MINUTES, that address is refused until the
// oldest of them ages out. The guest password isn't limited: it's on every
// invitation, so there's nothing to guess.
const MAX_FAILURES = 10;
const WINDOW_MINUTES = 15;

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

/** The caller's address. Vercel sets x-forwarded-for itself, so a client can't fake it there. */
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

/**
 * Whether this address has used up its wrong tries. If the check itself fails
 * it answers no: a database hiccup shouldn't lock the couple out.
 */
export async function tooManyFailures(ip: string): Promise<boolean> {
  const { count, error } = await supabase()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gt("at", minutesAgo(WINDOW_MINUTES));
  if (error) {
    console.error("Login limit check failed", error);
    return false;
  }
  return (count ?? 0) >= MAX_FAILURES;
}

/** Note a wrong try, and clear out rows too old to count. Never throws. */
export async function recordFailure(ip: string): Promise<void> {
  const db = supabase();
  const { error } = await db.from("login_attempts").insert({ ip });
  if (error) console.error("Login attempt not recorded", error);
  const { error: pErr } = await db.from("login_attempts").delete().lt("at", minutesAgo(24 * 60));
  if (pErr) console.error("Old login attempts not cleared", pErr);
}
