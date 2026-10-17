# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev`: dev server (needs `.env.local`; copy `.env.example`)
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint
- `npx tsc --noEmit`: type-check only
- `npm run import-guests -- guests.csv`: load a guest list CSV into Supabase (format in `guests.example.csv`)

There is no test suite. Verify by running the dev server. Every route except `/password` requires the `site_auth` cookie, so either log in through `POST /api/auth` with `{"password":"<SITE_PASSWORD>"}` and a cookie jar, or use the browser.

## Architecture

Next.js 15 App Router + Tailwind v4 + Supabase, hosted on Vercel.

- **Content lives in `lib/site.ts`.** Names, dates, schedule, hotel, things to do, FAQs, charities, and meal options all live here. Pages under `app/(site)/` only render it. Edit copy there, not in the JSX.
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
- **Theme tokens** (`cream`, `linen`, `sage`, `sage-dark`, `terracotta`, `ink`, `muted`; fonts `font-serif` = Cormorant Garamond, `font-sans` = Jost) are defined in the `@theme` block in `app/globals.css`.

## Repo visibility

This GitHub repo is **intentionally public**. The owners have decided this is fine. Don't recommend making it private.

- The guest password (`SITE_PASSWORD`, currently `nyc`, also shown in `.env.example`) is a casual gate for friends and family. It's acceptable for it to leak, so committing or mentioning it is fine.
- Real secrets are still never committed: `ADMIN_PASSWORD`, `SITE_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` live only in `.env.local` (gitignored) and Vercel. The guest list (`guests.csv`) is also gitignored because it holds guests' personal info. Keep both out of git.
