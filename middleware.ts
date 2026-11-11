import { NextResponse, type NextRequest } from "next/server";
import { SITE_COOKIE, verifyToken } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const ok = await verifyToken("site", req.cookies.get(SITE_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/password";
  url.search = "";
  const next = req.nextUrl.pathname + req.nextUrl.search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the password screen, its API, and static assets.
  // - (?![\w-]) keeps those two exact: a later /password-reset or /api/auth-x
  //   page would be gated, not let through by its prefix.
  // - Image files skip the gate only outside /api/, so no API path gets
  //   through by ending in ".png".
  matcher: [
    "/((?!password(?![\\w-])|api/auth(?![\\w-])|_next/static|_next/image|favicon.ico|(?!api/).*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
