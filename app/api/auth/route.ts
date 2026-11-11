import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, COOKIE_MAX_AGE, SITE_COOKIE, checkPassword, makeToken } from "@/lib/auth";

const schema = z.object({ password: z.string().max(200), scope: z.enum(["site", "admin"]).default("site") });

// POST { password, scope?: "site" | "admin" } → sets the matching auth cookie.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));

  // A malformed body is just a wrong password.
  if (!parsed.success || !(await checkPassword(parsed.data.scope, parsed.data.password))) {
    return NextResponse.json({ error: "That's not quite right. Try again!" }, { status: 401 });
  }
  const { scope } = parsed.data;

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
