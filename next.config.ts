import type { NextConfig } from "next";

// Sent with every response. The CSP has no script-src: a strict one needs a
// nonce per request, which would stop every page from being prerendered.
const securityHeaders = [
  // Don't guess a file's type from its contents.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites see only that a link came from here, never which page.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Never shown inside another site's frame (frame-ancestors is the modern form).
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
