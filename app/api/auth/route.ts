import { NextResponse } from "next/server";
import { ADMIN_COOKIE, COOKIE_MAX_AGE, SITE_COOKIE, checkPassword, makeToken } from "@/lib/auth";

// POST { password, scope?: "site" | "admin" } → sets the matching auth cookie.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const scope = body.scope === "admin" ? "admin" : "site";
  const password = typeof body.password === "string" ? body.password : "";

  if (!checkPassword(scope, password)) {
    return NextResponse.json({ error: "That's not quite right. Try again!" }, { status: 401 });
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
