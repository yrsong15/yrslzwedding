# Wedding site to-do

Check items off by changing `[ ]` to `[x]`. Most copy lives in [`lib/site.ts`](lib/site.ts).

## Content (placeholders still on the site)

- [ ] **Contact email.** Replace `hello@example.com` in `lib/site.ts`. It appears on the FAQ page and in the RSVP "we couldn't find your name" message.
- [ ] **Meal options.** The three dinners in `lib/site.ts` are placeholders. If you change the option *values* (`beef` / `fish` / `vegetarian`), also update the `meal` CHECK constraint in Supabase (see `supabase/schema.sql`).
- [ ] **FAQs.** Kids and venue parking still say "details coming soon". Review the dress code and the other answers too.
- [ ] **Things to do: Sights.** The five Sights picks were researched placeholders. Review them and swap in your own favorites. The restaurant, café, and bar lists are already yours.
- [x] **Korean text check.** Have a native-speaking family member review the Home page message (로렌과 영래가 함께 인생의 새로운 출발을 하려 합니다) and the nav tab labels, including the 영래 spelling.
- [ ] **Hotel room block (optional).** If you reserve one, fill in `hotel.block` in `lib/site.ts`; the Travel page switches to showing the code and deadline.
- [ ] **Look over every page** on your phone and on a laptop.

## Guest list & database

- [ ] **Delete the test data.** Remove The Smith Family, Alex Kim & Guest, and Pat Rivera in the Supabase Table Editor (deleting a party removes its guests). They're currently findable on the live site and counted in `/admin`.
- [ ] **Build `guests.csv`.** Use the format in `guests.example.csv`, then run `npm run import-guests -- guests.csv`.
- [ ] **Test RSVP yourself.** Look up a real name, submit, edit, and check `/admin`.

## Security

- [x] **Set a real `ADMIN_PASSWORD`** in `.env.local`. Save it in your password manager, and enter the same value in Vercel when you deploy.
- [ ] **(Optional) Tighten RSVP privacy.** Right now anyone with the site password and a guest's full name can see and change that party's answers, including dietary notes. A second check, like an email or another party member's name, could gate that.
- [x] **Decide on the guest password.** It's `pdx`; this goes on the invitations. If you change it in Vercel later, redeploy, and note that everyone gets logged out.

## Launch

- [x] **Commit the code to git.** `.env.local` and `guests.csv` are gitignored and must stay that way.
- [x] **Push to GitHub.** `yrsong15/yrslzwedding`, public by choice.
- [x] **Deploy on Vercel.** Live at https://yrslzwedding.vercel.app. Every push to `main` redeploys.
- [ ] **Custom domain (optional).** Buy one and connect it in Vercel.
- [ ] **Watch Supabase's free-tier pausing.** Free projects pause after about a week with no activity, and RSVPs fail while paused. Either upgrade, or make sure the project is unpaused before invitations go out and stays in use.

## After invitations go out

- [ ] **Switch the Supabase MCP to read-only** (or disconnect it) once real RSVPs arrive.
- [ ] **(Optional) Auto-close RSVPs** after March 1, 2027, with a "please email us" message.
- [ ] **Recheck time-sensitive details** closer to July 2027:
  - hotel valet price
  - Wayfinder Beer and Backwoods Brewing hours
  - the Multnomah Falls permit rules
  - that every recommended restaurant, café, and bar is still open (Javelina already moved once)
