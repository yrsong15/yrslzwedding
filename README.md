# yrslzwedding

Wedding website for Lauren & Young Re — July 24, 2027, Portland, OR.

**Live site: https://laurenyoungre.com**

Next.js (App Router) + Tailwind + Supabase, deployed on Vercel. The whole site sits behind a shared password; RSVPs are stored in Supabase.

## Links

| What | Link |
| --- | --- |
| Live site | https://laurenyoungre.com |
| RSVP dashboard (admin password) | https://laurenyoungre.com/admin |
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

## Setting up the database
Build your guest list as `guests.csv` (see [`guests.example.csv`](guests.example.csv)), then run:
   ```bash
   npm run import-guests -- guests.csv
   ```
   - Rows that share a `party_name` become one invitation, and anyone in the party can RSVP for everyone in it.
   - Set `is_plus_one=true` with blank names to give a party an unnamed "+1" slot.
   - A guest with only a first name (e.g. a partner whose last name you don't know) shows up on the RSVP form as a blank "+1", and whoever RSVPs enters both their first and last name. Name such parties like "Alex Kim and +1".
   - Set `invited_to_welcome=false` to hide the Friday welcome-drinks question for that party.
   - Re-running the import skips parties that already exist.

`guests.csv` is gitignored.

## Reviewing RSVPs

- **`/admin`** (uses `ADMIN_PASSWORD`): the **Invite list** (headcounts, meal totals, welcome-drinks count, dietary notes, a full guest table, and **Download CSV**) and the **Seating chart** (drag parties onto the 23 tables, and people between seats at their table).
- **Supabase dashboard**: the `rsvp_summary` view gives one flat row per guest. The raw `parties` and `guests` tables can be edited directly in the Table Editor.

## Editing content

Almost all copy lives in [`lib/site.ts`](lib/site.ts):
- names, dates, schedule, hotel
- sights, plus restaurant, café, and bar recommendations
- FAQs, registry links, meal options
- the Korean text: the Home page message and each nav tab's Korean label

Page intros (like the Registry's no-gifts note) are in each page's file under `app/(site)/`.

If you change meal options, update the `CHECK` constraint on `guests.meal` in Supabase as well.

## Deploying

Already deployed. Every push to `main` redeploys automatically.

To set it up again from scratch, import the repo into [Vercel](https://vercel.com/new), paste in your `.env.local` contents as the environment variables (the names are in [`.env.example`](.env.example)), and deploy. Skip Vercel's Supabase integration, which can replace your Supabase settings with a new, empty project.

After changing an environment variable in Vercel, go to **Deployments → ⋯ → Redeploy** for it to take effect.
