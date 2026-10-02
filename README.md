# Darba tirgus portāls (BLT HR portal)

Next.js 15 portal on top of the `blt` Supabase data (cv.lv IT + banking/insurance ads):
market dashboard, ad browser with active/inactive status, ad detail with screenshot and
similar ads, ⌘K search, favourites and saved views. Data reference: [blt-data-dictionary.md](blt-data-dictionary.md).

The portal is **read-only**. All queries run server-side with the `service_role` key;
the browser only talks to the Next.js server, behind one shared password.

## Setup

1. **Database**: run these in the Supabase SQL editor, in order. All are idempotent: re-run them after every change.
   - [sql/001_portal_views.sql](sql/001_portal_views.sql): `blt.listings_portal` view, `blt.skill_labels`,
     RPCs `portal_facets`, `dashboard_stats` and `similar_listings`, plus two indexes.
   - [sql/002_company_views.sql](sql/002_company_views.sql): RPCs `company_list` and `company_profile` (company analysis).
   - [sql/003_login_limit.sql](sql/003_login_limit.sql): `blt.login_attempts` table and RPCs `login_attempt` / `login_succeeded`
     (login brute-force limit: 5 failures per IP per 15 min, 30 failures overall per hour; tuned in `app/api/login/route.ts`).
2. **Env**: `cp .env.example .env.local` and fill in:

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | Project URL (`https://<ref>.supabase.co`; a `/rest/v1/` suffix is tolerated) |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key. **Server-only, never `NEXT_PUBLIC_`** |
   | `PORTAL_PASSWORD` | Shared login password |
   | `AUTH_SECRET` | ≥ 32 random chars, signs the session cookie (`openssl rand -base64 48`) |

3. `npm install && npm run dev` → http://localhost:3000

## Deploy (Vercel)

1. Push this repo to GitHub, then Vercel → **Add New Project** → import it (framework is auto-detected).
2. Add the four env vars above under **Settings → Environment Variables** (Production + Preview).
3. Deploy. Changing `PORTAL_PASSWORD` needs a redeploy; changing `AUTH_SECRET` logs everyone out.

Vercel's Hobby plan is for non-commercial use; for company use pick Pro, or run `npm run build && npm start`
on any Node 20+ host.

## Where things are

| Path | What |
|---|---|
| `app/(portal)/page.tsx` | Dashboard (one `dashboard_stats` RPC call) |
| `app/(portal)/ads/page.tsx` | Ad list: filters live in the URL (`lib/filters.ts`) |
| `app/(portal)/ads/[id]/page.tsx` | Full ad page |
| `app/(portal)/companies/…` | Company list and profile (`/companies/profile?name=…`); every metric is compared with the market |
| `app/(portal)/@drawer/(.)ads/[id]` | Same ad as a side panel when opened from a list (intercepting route) |
| `lib/queries.ts` | All data access (server-only) |
| `lib/auth.ts`, `middleware.ts` | Password gate (HMAC-signed cookie, 30 days) |
| `lib/storage.ts` | Favourites / saved views (browser localStorage, exportable as JSON) |
| `lib/labels.ts` | Latvian labels for enums |

## Data caveats shown in the UI

- "Aktīvs" = `deadline >= today`. There is no real active flag yet (dictionary §10), so an ad the employer removed early still counts as active until its deadline.
- Salaries are treated as gross unless the ad says net. Hourly ads are left out of salary statistics.
- Skills, seniority and summaries are LLM-extracted. Skill spellings are merged by `blt.norm_skill_key`; extend its alias list in the SQL as new variants show up.
