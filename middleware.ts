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
  matcher: ["/((?!password|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
