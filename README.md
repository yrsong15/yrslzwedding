# yrslzwedding

Wedding website for Lauren & Young Re — July 24, 2027, Portland, OR.

**Live site: https://laurenyoungre.com**

Next.js (App Router) + Tailwind + Supabase, deployed on Vercel. The whole site sits behind a shared password; RSVPs are stored in Supabase.

## Links

| What | Link |
| --- | --- |
| Live site | https://laurenyoungre.com |
| Admin: RSVPs, invite cards, seating (admin password) | https://laurenyoungre.com/admin |
| Vercel (deployments, env vars, domains) | https://vercel.com/dashboard → `yrslzwedding` |
| Supabase project | https://supabase.com/dashboard/project/advualgyombhyhipussb |
| Supabase Table Editor (guests & RSVPs) | https://supabase.com/dashboard/project/advualgyombhyhipussb/editor |
| Supabase SQL Editor | https://supabase.com/dashboard/project/advualgyombhyhipussb/sql |

## Local development

```bash
npm install                   # one-time installation
cp .env.example .env.local    # then fill in the values
npm run dev                   # http://localhost:3000
```

## The guest site

Guests enter the shared guest password once, and then can browse every page. Each nav tab shows its Korean name when you hover over it on a laptop, and the phone menu always shows both names.

- **Home**: the date, the place, a message in Korean, and a countdown to the wedding.
- **RSVP**: guests search for their name as it appears on the invitation, and only invited guests come up. One person answers for their whole party:
  - whether each person is coming
  - welcome drinks on Friday
  - a meal choice and dietary notes for each person
  - names for any plus-ones

  They can come back later to see or change their answers.
- **Schedule**: the weekend's events.
- **Things to Do**: sights around Portland, plus the couple's favorite restaurants, cafés, and bars, with map links.
- **Travel & Lodging**: getting to Portland and where to stay.
- **FAQs**: dress code, parking, and other common questions.
- **Registry**: no gifts, please; instead, a few charities to donate to.

## Admin

The site has a separate admin section at [`/admin`](https://laurenyoungre.com/admin). It isn't linked from the site's nav, and it has its own password (`ADMIN_PASSWORD`), separate from the guest password. It has three pages:

- **Invite list**: the RSVP dashboard and the full guest list.
  - Totals: invited, attending, declined, and pending; welcome drinks; guests by side; meal counts; and everyone's dietary notes.
  - Invite or un-invite people or whole parties. Only invited guests can find themselves on the RSVP page.
  - Set whose guests each party is (Lauren's or Young Re's).
  - Add, rename, reorder, and delete people and parties.
  - Enter or correct someone's RSVP, e.g. for an answer given by phone.
  - Search and filter the list, and download it as a CSV.
- **Invite cards**: check off each invited party once its paper invitation is in the mail, with a count of how many are still to send. Once a party's card is marked sent, nobody invited in it can be un-invited or deleted, until the card is marked not sent again.
- **Seating chart**: a to-scale plan of the reception room with 23 tables of 8. Drag parties onto tables, then people between seats at their table. A party always sits together, and anyone who declines or is un-invited gives up their seat.

A bell in the top-right corner of every admin page counts new RSVP activity: each time a guest responds, changes, or clears their RSVP, with who did it and exactly what changed. Opening it lists the latest ones, and **See all notifications** goes to the full history. Lauren and Young Re each have their own unread count; the bell asks who's checking once per device.

For anything the admin pages don't cover, the Supabase dashboard has the raw `parties` and `guests` tables (editable in the Table Editor) and the `rsvp_summary` view, which gives one flat row per guest.

## Setting up the database

Build your guest list as `guests.csv` (see [`guests.example.csv`](guests.example.csv)), then run:

```bash
npm run import-guests -- guests.csv
```

- Rows that share a `party_name` become one invitation, and anyone in the party can RSVP for everyone in it.
- Set `is_plus_one=true` with blank names to give a party an unnamed "+1" slot.
- A guest with only a first name (e.g. a partner whose last name you don't know) shows up on the RSVP form as a blank "+1", and whoever RSVPs enters both their first and last name. Name such parties like "Alex Kim and +1".
- Every party is invited to the Friday welcome drinks.
- Re-running the import skips parties that already exist.

`guests.csv` is gitignored.

## Editing content

Almost all copy lives in [`lib/site.ts`](lib/site.ts):

- names, dates, schedule, hotel
- sights, plus restaurant, café, and bar recommendations
- FAQs, registry links, meal options
- the Korean text: the Home page message and each nav tab's Korean label

Page intros (like the Registry's no-gifts note) are in each page's file under `app/(site)/`.

If you change meal options, update the `CHECK` constraint on `guests.meal` in Supabase as well.

## Deploying

Every push to `main` redeploys automatically.

To set it up again from scratch, import the repo into [Vercel](https://vercel.com/new), paste in your `.env.local` contents as the environment variables (the names are in [`.env.example`](.env.example)), and deploy. Skip Vercel's Supabase integration, which can replace your Supabase settings with a new, empty project.

After changing an environment variable in Vercel, go to **Deployments → ⋯ → Redeploy** for it to take effect.
