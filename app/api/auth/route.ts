import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, COOKIE_MAX_AGE, SITE_COOKIE, checkPassword, makeToken } from "@/lib/auth";
import { clientIp, recordFailure, tooManyFailures } from "@/lib/loginLimit";

const schema = z.object({ password: z.string().max(200), scope: z.enum(["site", "admin"]).default("site") });

const wrong = () => NextResponse.json({ error: "That's not quite right. Try again!" }, { status: 401 });

// POST { password, scope?: "site" | "admin" } → sets the matching auth cookie.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  // A malformed body is just a wrong password.
  if (!parsed.success) return wrong();
  const { scope, password } = parsed.data;

  // Only the admin password is worth guessing, so only it is limited. Checked
  // before the password, so the right one doesn't get through mid-lockout.
  const ip = clientIp(req);
  if (scope === "admin" && (await tooManyFailures(ip))) {
    return NextResponse.json({ error: "Too many tries. Please wait 15 minutes and try again." }, { status: 429 });
  }

  if (!(await checkPassword(scope, password))) {
    if (scope === "admin") await recordFailure(ip);
    return wrong();
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(scope === "admin" ? ADMIN_COOKIE : SITE_COOKIE, await makeToken(scope), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
