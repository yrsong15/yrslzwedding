# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: dev server (needs `.env.local`; copy `.env.example`)
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint
- `npx tsc --noEmit`: type-check only
- `npm run import-guests -- guests.csv`: load a guest list CSV into Supabase (format in `guests.example.csv`)

There is no test suite. Verify by running the dev server. After changing `SITE_PASSWORD` or `ADMIN_PASSWORD` in `.env.local`, restart `npm run dev`. The route handlers pick up the new value, but the Edge middleware keeps the old one, so every login bounces back to `/password`. Production isn't affected. Every route except `/password` requires the `site_auth` cookie, so either log in through `POST /api/auth` with `{"password":"<SITE_PASSWORD>"}` and a cookie jar, or use the browser.

## Architecture

Next.js 15 App Router + Tailwind v4 + Supabase, hosted on Vercel.

- **Most content lives in `lib/site.ts`:**
  - names, dates, the Korean Home message (`koreanMessage`)
  - nav labels (each with its Korean `ko` label)
  - schedule, hotel
  - Sights (`thingsToDo`) and food & drink (`foodAndDrink`)
  - FAQs, charities, and meal options

  Exceptions written directly in the page files: `PageHeader` intros (e.g. the Registry's no-gifts text) and the Travel page's airport tips.
- **Food & drink entries** (`foodAndDrink`): a single-location place gets `map` (name + address, turned into a Google Maps search link). A place with several locations gets `multiple: true` and no link. Pho Van is deliberately a `map` entry pointing at its original 82nd Ave location. Javelina's query is name-only because the restaurant moved in 2025.
- **Bilingual nav** (`components/Nav.tsx`): on desktop, `BilingualLabel` flips each tab's English label to its Korean `ko` label on hover, keyboard focus, or press.
  - Both labels share one grid cell, so each tab is as wide as its longer label, with the English centered. There's no layout shift.
  - The slide is `motion-safe` only, so reduced-motion users get a fade.
  - The mobile menu instead shows the Korean as a permanent second line, because touch screens can't hover.
- **Password gate:** `middleware.ts` protects everything except `/password`, `/api/auth`, and static assets. The cookie token is an HMAC of `scope:password` keyed by `SITE_SECRET` (`lib/auth.ts`, Web Crypto so it runs on the Edge). `/admin` uses a second scope (`admin_auth` cookie, `ADMIN_PASSWORD`), checked server-side in the page and the export route via `lib/admin.ts`, not in middleware.
- **Route groups:** `app/(site)/layout.tsx` adds the nav and footer for the gated pages. `app/password/` sits outside the group, so it gets a bare layout.
- **Database access is server-only.** `lib/supabase.ts` (marked `server-only`) uses the secret/service-role key (`SUPABASE_SERVICE_ROLE_KEY`, an `sb_secret_…` key). The `anon` and `authenticated` roles are locked out three ways:
  - RLS is enabled with no policies.
  - `schema.sql` explicitly revokes their grants and grants only `service_role`, because the project has "Automatically expose new tables" off.
  - `rsvp_summary` is a `security_invoker` view, so it can't bypass RLS.

  Keep all three when adding tables or views. Client components must import row types from `lib/types.ts`, never from `lib/supabase.ts` or `lib/rsvp.ts`.
- **RSVP model** (`supabase/schema.sql`): `parties` 1→N `guests`. Guests look up their exact full name (case-insensitive). Plus-ones are excluded from the lookup. The match returns the whole party, and one person RSVPs for everyone. Plus-ones are guest rows with `is_plus_one=true` and empty names that get filled in at RSVP time. `null` on `attending` / `attending_welcome` means no answer yet. The `rsvp_summary` view flattens everything for `/admin` and the CSV export.
- **RSVP API:** `lib/rsvp.ts` holds the logic (zod schema, `validateAgainstParty`, `saveRsvp`, `clearRsvp`). The route handlers in `app/api/rsvp/` are thin wrappers. `POST` overwrites the earlier answers (edits) and `DELETE` resets a party to unanswered. Validation runs both client-side (`components/rsvp/RsvpForm.tsx`) and server-side, so keep the two in sync.
- **Meal options** are defined in `lib/site.ts` and also enforced by a `CHECK` constraint on `guests.meal`. Changing one means changing both.
- **Animations** use framer-motion through `components/FadeIn.tsx` (scroll-triggered) and per-component `motion` elements.
- **Theme tokens** ("orange and violet wildflowers", kept muted): `cream` (background), `linen` (pale lavender alternate sections), `lavender` (labels, dots, focus rings), `plum` (headings, logo letters, dark buttons and cards), `poppy` / `poppy-dark` (primary buttons, links, the logo's Y; hover), `ink`, and `muted`. They're in the `@theme` block in `app/globals.css`, with roles and contrast notes. A palette change also requires regenerating `public/logo.svg` and the favicon files, whose colors are baked in. Fonts (`font-serif` = Cormorant Garamond, `font-sans` = Jost, `font-korean` = Noto Serif KR) are in a separate `@theme inline` block. This must stay `inline`: `next/font` defines the font variables on `<body>`, so a plain `@theme` resolves them on `:root`, where they're undefined, and every serif heading silently falls back to the sans font. Neither Cormorant nor Jost has Hangul, so all Korean text needs `font-korean` (and `lang="ko"`). Noto Serif KR uses `preload: false` on purpose: next/font has no Korean subset, and Google splits the font into unicode-range chunks, so browsers download only the glyphs a page uses.
- **Logo** (`components/Logo.tsx`): serif L and R with a hand-drawn SVG arrow-fork "Y". The SVG's left and right margins are intentionally unequal, so the *ink* gap on both sides of the Y is 0.08em (L and R have different side bearings, as the comment explains). Don't "fix" them to match. `public/logo.svg` is a standalone copy with the letters converted to outlines (no font dependency); regenerate it whenever the component changes. An alternate "L & YR" version is in `design/logo-backups/` (the `.tsx.txt` extension keeps it out of the build).
- **Favicon:** `app/icon.svg` (cream Y on a poppy tile), `app/favicon.ico` (16/32/48 PNGs), and `app/apple-icon.png` (180px, full-bleed). Next.js serves them automatically, and the middleware matcher lets them through without login.

## Deployment & services

- **Live:** https://yrslzwedding.vercel.app (Vercel project `yrslzwedding`, deployed from GitHub `yrsong15/yrslzwedding`). Every push to `main` redeploys.
- **Env vars in Vercel** mirror `.env.local`. Changing one in Vercel takes effect only after a redeploy. Changing `SITE_PASSWORD` or `ADMIN_PASSWORD` logs everyone out of that scope, because the cookie token is derived from the password.
- **Don't add Vercel's Supabase integration.** It can create a new project and overwrite `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`, pointing the site at an empty database.
- **Supabase MCP** is configured in `.mcp.json` (project-scoped, not read-only). It's useful for inspecting data and running schema SQL. Destructive statements against the real guest data need the user's go-ahead.

## Repo visibility

This GitHub repo is **intentionally public**. The owners have decided this is fine. Don't recommend making it private.

- The guest password (`SITE_PASSWORD`, currently `pdx`) is a casual gate for friends and family. It's acceptable for it to leak, so mentioning it is fine. (`.env.example` holds a placeholder value, not the real one.)
- Real secrets are still never committed: `ADMIN_PASSWORD`, `SITE_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` live only in `.env.local` (gitignored) and Vercel. The guest list (`guests.csv`) is also gitignored because it holds guests' personal info. Keep both out of git.
