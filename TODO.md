# Wedding site to-do

Check items off by changing `[ ]` to `[x]`. Most copy lives in [`lib/site.ts`](lib/site.ts).

## Content (placeholders still on the site)

- [ ] **Contact email.** Replace `hello@example.com` in `lib/site.ts`. It appears on the FAQ page and in the RSVP "we couldn't find your name" message.
- [ ] **Meal options.** The three dinners in `lib/site.ts` are placeholders. If you change the option *values* (`beef` / `fish` / `vegetarian`), also update the `meal` CHECK constraint in Supabase (see `supabase/schema.sql`).
- [ ] **FAQs.** Kids and venue parking still say "details coming soon". Review the dress code and the other answers too.
- [ ] **Things to do.** Review the five picks and swap in your own favorites.
- [ ] **Hotel room block (optional).** If you reserve one, fill in `hotel.block` in `lib/site.ts`; the Travel page switches to showing the code and deadline.
- [ ] **Look over every page** on your phone and on a laptop.

## Guest list & database

- [ ] **Delete the test data.** Remove The Smith Family, Alex Kim & Guest, and Pat Rivera in the Supabase Table Editor (deleting a party removes its guests).
- [ ] **Build `guests.csv`.** Use the format in `guests.example.csv`, then run `npm run import-guests -- guests.csv`.
- [ ] **Test RSVP yourself.** Look up a real name, submit, edit, and check `/admin`.

## Security

- [ ] **Set a real `ADMIN_PASSWORD`** in `.env.local` (currently `change-me`).
- [ ] **Decide on the guest password.** It's `nyc` now; whatever you choose goes on the invitations.

## Launch

- [ ] **Commit the code to git.** Nothing is committed yet. `.env.local` and `guests.csv` are gitignored and must stay that way.
- [ ] **Push to a GitHub repo.** Private is recommended.
- [ ] **Deploy on Vercel.** Import the repo and add the five env vars from `.env.example` with your real values.
- [ ] **Custom domain (optional).** Buy one and connect it in Vercel.
- [ ] **Watch Supabase's free-tier pausing.** Free projects pause after about a week with no activity, and RSVPs fail while paused. Either upgrade, or make sure the project is unpaused before invitations go out and stays in use.

## After invitations go out

- [ ] **Switch the Supabase MCP to read-only** (or disconnect it) once real RSVPs arrive.
- [ ] **(Optional) Auto-close RSVPs** after March 1, 2027, with a "please email us" message.
- [ ] **Recheck time-sensitive details** closer to July 2027: hotel valet price, Wayfinder Beer hours, the Multnomah Falls permit rules.
