# blt — data dictionary (Supabase table, view and Storage)

Reference for anyone building on top of the `blt` job-ad data, first of all
the **UI portal**. It describes every column, every JSON structure and the
Storage bucket: what each value means, where it comes from, how complete it
is, and what to watch out for.

- Pipeline that produces the data: [blt-insurance-banking-scraper.md](blt-insurance-banking-scraper.md),
  runbook [runbooks/blt-insurance-banking/README.md](../../runbooks/blt-insurance-banking/README.md)
- Project, DDL and migrations: [supabase.md](supabase.md)
- Fill rates and value distributions below were measured on **2026-09-29
  (426 rows)**. Re-measure before relying on exact numbers.

## Quick facts

| | |
|---|---|
| Supabase project | shared free-tier project (also holds unrelated flight data in `public`) → credential: `supabase-blt-service-role` (URL + key) |
| Schema | `blt` (must be sent as `Accept-Profile: blt` / `Content-Profile: blt`, or `supabase.schema('blt')`) |
| Table | `blt.blt_listings`: one row per cv.lv ad ID, including hidden duplicates |
| **View to use** | **`blt.listings`**: the table minus LV/EN duplicates, plus 3 computed columns |
| Storage bucket | `job-screenshots` (public), path `cvlv/<numeric id>.jpg` |
| Source | cv.lv (CV-Online Latvia), categories `BANKING_INSURANCE` + `INFORMATION_TECHNOLOGY`, all of Latvia |
| Size (2026-09-29) | 426 rows (418 unique in the view), 418 screenshots ≈ 186 MB |
| Writers | only the server pipeline (`blt-scrape.py`, `blt-enrich.py`, `blt-notify.py`). **The portal must treat the data as read-only.** |
| Update cadence | Mon–Fri: scrape + enrich at 09:00, 12:00 and 15:00 Riga (+0–45 min random start); enrich safety run 17:00; HR digest 09:00 |
| Timezone | all `timestamptz` values are stored and returned in UTC; `date` columns are Riga calendar dates |

## 1. Which object to query

| Object | Use it for | Notes |
|---|---|---|
| `blt.listings` (view) | **everything in the UI** | `where duplicate_of is null` is already applied. Adds `is_repeating`, `times_posted`, `days_open`. `security_invoker = on`, so the caller's rights on the table apply. |
| `blt.blt_listings` (table) | admin or debug only | Also contains the hidden LV/EN twin rows (`duplicate_of` set). |

Currently **only the `service_role` has access**. `anon` and
`authenticated` have no grants, and RLS is enabled on the table with no
policies. See §9 for how to give the portal access safely.

## 2. How a row is born and changes (lifecycle)

A row is **not static**. The pipeline fills it in stages and may rewrite it
later. The portal should read the timestamps below, not assume completeness.

```
cv.lv search page ──► row inserted (scraped_at)       search-record fields + raw_data
        │
        ▼  same run, human-paced browser visit
  ad page opened ──► visited_at                        detail_data, sections, OCR text,
        │                                              screenshot, salary/work fields refined
        ▼  right after the scrape run (and 17:00 safety run)
  local LLM ──────► enriched_at                        responsibilities, requirements, benefits,
        │                                              skills, languages, seniority, summary …
        ├─► twin check ──► duplicate_of (row disappears from the view)
        ├─► repost check ─► repost_of / repost_root
        ▼  next weekday 09:00
  HR digest ──────► notified_at
        ⋮
  every later scrape that sees the ad on a search page:
        publishDate moved? ─► times_renewed +1, renewal_dates += date, last_published_at
```

**Re-processing.** If a row is re-queued (`visited_at` and `enriched_at` set
back to NULL), its detail, OCR, screenshot and LLM fields are overwritten on
the next run. This happens after a pipeline fix. So:
- a row with `enriched_at IS NULL` has NULL/empty LLM fields. That is
  "pending", not "missing";
- a row with `visited_at IS NULL` has no `detail_data`/`sections` yet;
- cache by `(id, enriched_at)`, not by `id` alone.

**Expired ads stay in the table.** Nothing is deleted when an ad leaves
cv.lv. There is **no "active" flag yet** (see §10). The best current
approximation is `deadline >= current_date`.

## 3. Column reference

Fill = rows with a non-empty value / 426, measured 2026-09-29.
"Pipeline" = which script writes it: **S** = `blt-scrape.py`, **E** =
`blt-enrich.py`, **N** = `blt-notify.py`, **V** = computed by the view.

### 3.1 Identity and links

| Column | Type | Null | Fill | Pipeline | Meaning / UI notes |
|---|---|---|---|---|---|
| `id` | text PK | no | 426 | S | `cvlv:<numeric cv.lv id>`, e.g. `cvlv:1652254`. The numeric part equals `raw_data.id` and the id in `url`. Stable forever. |
| `source` | text | no | 426 | S | Always `cv.lv` today. Keep it in filters for future sources. |
| `url` | text | no | 426 | S | `https://www.cv.lv/vacancy/<id>`. Public ad page (redirects to the LV/EN variant). |
| `apply_url` | text | yes | 246 | S | Employer's own application link (`detail_data.settings.applyingUrl`). NULL means "apply on cv.lv" (`url`). Can be up to 305 chars. |
| `title` | text | no | 426 | S | Position title as published, ≤ 100 chars. Often bilingual ("Datu zinātnieks / Data Scientist") and full of gender forms (`/-e`, `/-ā`). Display as-is. |
| `company` | text | no | 426 | S | Employer name **as shown on cv.lv**. ⚠️ Recruitment agencies post for clients: "CV-Online Recruitment" is the poster, and the real employer (e.g. Cembra) is often only named in `summary`/ad text. No normalisation (legal suffixes like `SIA`/`AAS` included). |
| `category` | text | no | 426 | S | Which of the two **searched** categories found the ad: `INFORMATION_TECHNOLOGY` (267) or `BANKING_INSURANCE` (159). An ad in both is stored once, as `BANKING_INSURANCE`. The full cv.lv category list is `detail_data.settings.categories` (§4.3). |

### 3.2 Publishing timeline

| Column | Type | Null | Fill | Pipeline | Meaning / UI notes |
|---|---|---|---|---|---|
| `first_published_at` | date | yes | 426 | S/E | Date the ad **first** went live (`detail_data.firstPublishDate`). Does not move on renewal. Earliest seen: 2026-06-08. **Use this for "posted on" and for age.** |
| `published_at` | timestamptz | yes | 426 | S | cv.lv `publishDate` at insert time. ⚠️ cv.lv **overwrites** it when the employer renews, so it is "last (re)published at insert time", not the first-publish date. Legacy field, prefer the two columns around it. |
| `published_raw` | text | no | 426 | S | `published_at` as the original string. Debug only. |
| `last_published_at` | timestamptz | yes | 426 | S | Latest `publishDate` seen (moves with every renewal). "Last refreshed on". |
| `times_renewed` | int | no (default 0) | 426 | S | Renewals of **this** ad ID. ⚠️ cv.lv keeps no history, so for ads first seen already renewed the start value is **1 = "at least once"**. Exact counting started 2026-09-29. Current range 0–1. |
| `renewal_dates` | jsonb array | no (default `[]`) | 231 non-empty | S | ISO timestamps of observed renewals, e.g. `["2026-09-27T15:00:00.727+00:00"]`. For start value 1 the only element is cv.lv's `renewedDate`. |
| `deadline` | date | yes | 426 | S | Application deadline (`settings.dateTo`, fallback `raw_data.expirationDate`). Range now 2026-09-28 … 2026-10-29. |
| `days_open` | int | — | view | V | `current_date − first_published_at` of the **first posting in the repost chain**. `current_date` is the DB server date (UTC). |

### 3.3 Location and work arrangement

| Column | Type | Null | Fill | Pipeline | Meaning / UI notes |
|---|---|---|---|---|---|
| `town` | text | yes | 403 | S | Town name from cv.lv's location classifier (`townId` → name; falls back to county/region, e.g. `Latgales reģ.`). NULL (23) = abroad or unspecified. Mostly `Rīga`. Values include municipality forms like `Mārupes novads`. |
| `address` | text | yes | 323 | S | Free-text street address from the ad, sometimes with postcode/country (`Skanstes iela 12, 1013 Rīga, Latvia`). Not geocoded. |
| `work_mode` | text | yes | 426 | S | `ON_SITE` (192), `HYBRID` (226), `FULLY_REMOTE` (8). |
| `work_times` | text[] | yes | 415 | S | Working-time types, see §5. Mostly `{FULL_TIME}`. |

### 3.4 Salary

| Column | Type | Null | Fill | Pipeline | Meaning / UI notes |
|---|---|---|---|---|---|
| `salary_from` | numeric | yes | 426 | S/E | Lower bound, EUR. |
| `salary_to` | numeric | yes | 426 | S/E | Upper bound, EUR. |
| `salary_period` | text | yes | 426 | S | `MONTHLY` (424) or `HOURLY` (2, e.g. €5.12/h, €25–28/h). ⚠️ Always check before comparing or sorting amounts. |
| `salary_basis` | text | yes | 426 | E | `gross` or `net`. |

**Salary rules (house rules, 2026-09-27):**
1. If an ad gives only one amount ("no 3000"), `salary_from` =
   `salary_to` = that amount. A range of zero width therefore means "one
   amount given", which may be a minimum.
2. `salary_basis` is `net` only when the ad explicitly says
   neto/net/pēc nodokļiem. Otherwise it is **`gross` by default**. All 426
   are `gross` today, and most ads don't state it at all.
   `enrichment.raw.salary_basis` holds the model's unverified guess (§4.4).
3. Salary is present on every row today (all 426 ads had a structured
   salary on cv.lv). When cv.lv's structured salary is missing, the LLM may fill it
   from the text, and only if the number is literally in the ad. That is
   flagged `enrichment.salary_from_text = true` (0 rows so far).

### 3.5 Ad content (raw text sources)

These are the inputs the LLM read. Show them in a "full ad" view, or use them
for search.

| Column | Type | Null | Fill | Pipeline | Meaning / UI notes |
|---|---|---|---|---|---|
| `sections` | jsonb | yes | 345 non-empty | S | The ad's text blocks, `[{title, text}]`. **Best source for rendering the ad text**, see §4.1. |
| `ad_image_text` | text | yes | 172 | S | OCR (Tesseract, lav+eng) of **image ads**, where the whole ad is a picture. Raw OCR, so line breaks, stray symbols and occasional misreads. ≤ ~7.5k chars. Show it as plain text, clearly labelled as machine-read. |
| `description` | text | yes | 293 | S | cv.lv search-result snippet (`positionContent`, HTML stripped). ⚠️ Often **only the benefits line**, sometimes the full ad, sometimes a pointer ("Sludinājums latviešu valodā: …"). Not authoritative. Prefer `sections`. |
| `screenshot_url` | text | yes | 418 | S | Public URL of the full-page screenshot (§7). NULL = the screenshot failed, or the row is a hidden twin. |

**Which text an ad has** depends on how the employer published it:

| Ad type | How to recognise it | Where the text is |
|---|---|---|
| Standard cv.lv text ad | `detail_data.urlDetailsType = 'DISABLED'`, no `fileDetails` | `sections` (titled blocks) |
| Image ad (whole ad is a picture) | `detail_data.details.fileDetails.fileId` set | `ad_image_text` (OCR) + screenshot |
| IFRAME ad (embedded external page) | `detail_data.urlDetailsType = 'IFRAME'` (42) | `sections` item titled `Iegultā sludinājuma teksts (<host>)` |
| Employer-branded page | no `__NEXT_DATA__`, or empty sections | `sections` item titled `Lapas teksts (zīmola lapa)`: the whole page's text, including cookie/footer noise |

### 3.6 LLM-extracted fields (local model, grounded)

Written by `blt-enrich.py` with the local Ollama model `qwen3-fast`. The
list fields are **grounding-checked**: an item is kept only if ≥ 60% of its
words occur in the ad text, so generic invented items are dropped (counts
in `enrichment.dropped_ungrounded`). Items are **in the ad's own language**
(Latvian or English, not translated). Only `summary` and `languages` are
always Latvian. All are NULL while `enriched_at IS NULL`.

| Column | Type | Fill | Meaning / UI notes |
|---|---|---|---|
| `summary` | text | 426 | 1–2 sentences in **Latvian**: what the role is and at which company. ≤ ~365 chars. Good for cards and list rows. Occasional awkward Latvian grammar (small model). |
| `responsibilities` | text[] | 421 | Duties, avg 7.5 items (max 25). `[]` = nothing extractable (thin ad text); NULL = not enriched yet. |
| `requirements` | text[] | 421 | Candidate requirements, avg 7.9 (max 19). |
| `benefits` | text[] | 422 | What the employer offers besides the salary figure, avg 6.5 (max 15). Sometimes includes the salary sentence or a section heading ("Work-Life Balance"). |
| `skills` | text[] | 385 | Named tools, technologies and methods (`SQL`, `Power BI`, `IFRS`, `Java`, …), avg 6.7 (max 25). ⚠️ Not normalised: `PowerBI` / `Power BI` / `Microsoft Power BI` all occur, in LV or EN. Normalise case and spacing before faceting. |
| `languages` | text[] | 409 | Required human languages, Latvian names in lowercase: `angļu` (321), `latviešu` (270), `krievu` (16), `lietuviešu`, `vācu`, `igauņu`, … ⚠️ Not a closed list, and synonyms occur (`igauņu` vs `estoniešu`). Map them in the UI. |
| `seniority` | text | 426 | `intern`, `junior`, `mid`, `senior`, `lead`, `manager`, `director`, `unknown`. Judged from title and requirements. `unknown` = 102. |
| `experience_years_min` | numeric | 202 | Minimum years of experience **if a number is stated** (0–8 seen). NULL = not stated. |
| `education` | text | 195 | Required education as a short phrase in the ad's language, ≤ 200 chars. NULL = not stated. |

### 3.7 Hiring-difficulty signal (repeat marker)

User requirement (2026-09-29): an ad that keeps coming back means the
employer struggles to hire.

| Column | Type | Pipeline | Meaning |
|---|---|---|---|
| `is_repeating` | boolean | V | `times_renewed > 0` **or** part of a repost chain. **This is the marker.** 230 of 418 today, most of them "renewed at least once". |
| `times_posted` | bigint | V | Number of postings (distinct ad IDs) of the same vacancy in its repost chain. 1 = never reposted. |
| `times_renewed` | int | S | See §3.2 (renewals of this ID). |
| `repost_of` | text FK → `id` | E | The **previous** posting of the same vacancy under an older ID. |
| `repost_root` | text FK → `id` | E | The **first** posting of the chain. NULL on the root itself. |
| `days_open` | int | V | See §3.2. Days since the chain's first posting. |

**Repost rule:** same employer (`detail_data.employerId`) + same title after
removing only gender endings (bracket qualifiers such as "(ar igauņu
valodu)" or "(Information Security)" are kept, because they distinguish
roles) + first-publish dates ≥ 3 days apart. Same-day look-alikes are
parallel postings (several seats or cities), not reposts. Wrong links are
removed automatically on every run. Only 1 real chain exists so far (Senior
Product Designer, 2026-08-31 → 2026-09-29). Expect more as ads expire and
reappear.

Suggested UI: a 🔁 badge when `is_repeating`, and a tooltip like
"publicēts 2× · atjaunots 1× · atvērts 70 d." (the HR digest uses this
format).

### 3.8 Duplicates (LV/EN twins)

| Column | Type | Pipeline | Meaning |
|---|---|---|---|
| `duplicate_of` | text FK → `id` | E | Set on the hidden twin: cv.lv often publishes one vacancy twice, in LV and EN, under two IDs. The Latvian one is kept; the other points to it. Twin rows have `notified_at` set and their screenshot deleted. **Excluded from `blt.listings`.** 8 today. |

Twin rule: same employer, salary, deadline, town and first-publish date,
titles in different languages, and cross-language similarity of
duties + requirements ≥ 0.83 (multilingual embeddings, `bge-m3`).

### 3.9 Pipeline bookkeeping

| Column | Type | Fill | Meaning / UI notes |
|---|---|---|---|
| `scraped_at` | timestamptz, not null | 426 | Row first inserted. "Seen by us since". |
| `visited_at` | timestamptz | 408 | Ad page last opened by the browser (detail, OCR and screenshot captured). NULL = pending (first visit, or re-queued after a fix). |
| `enriched_at` | timestamptz | 426 | LLM fields last written. NULL = pending. Also set on failure (see `enrich_error`). |
| `enrich_model` | text | 426 | Model that produced the LLM fields (`qwen3-fast`). |
| `enrich_error` | text | 0 | NULL = OK. `enrich failed: …` = transient, retried automatically. `no ad text to extract from …` = the ad had no usable text. |
| `notified_at` | timestamptz | 359 | HR Discord digest bookkeeping: set when posted, **and also** set silently for the pre-launch backlog and for twins. **Don't use it as "was shown to HR".** |
| `enrichment` | jsonb | 426 | Raw model output + audit data (§4.4). |

## 4. JSON columns

### 4.1 `sections`: ad text blocks

```json
[
  {"title": "Prasības kandidātiem",  "text": "Pieredze … ; …"},
  {"title": "Darba pienākumu apraksts", "text": "…"},
  {"title": "Mēs piedāvājam",        "text": "…"},
  {"title": "Papildu labumi",        "text": "veselības apdrošināšana, …"}
]
```

- `text` is plain text (HTML stripped, whitespace collapsed). Up to 15,000
  chars per item for page-text captures.
- `title` is the employer's own heading, in either language, and is often
  `""` (159 untitled blocks). Most frequent: `Papildu labumi`, `Mēs
  piedāvājam`, `Prasības kandidātiem`, `Darba pienākumu apraksts`,
  `Responsibilities:`, `Requirements:`, `What we offer:`.
- Titles the **pipeline** adds (not the employer):

| Title | Content |
|---|---|
| `Papildu labumi` | cv.lv `additionalBenefits`: a short benefits line |
| `Iegultā sludinājuma teksts (<host>)` | full text of an embedded external ad (IFRAME ads, e.g. talent.sage.hr, join.balcia.com) |
| `Lapas teksts (zīmola lapa)` | full visible text of an employer-branded page, including navigation, cookie and footer noise |

Rendering: show the blocks in order, using `title` as a heading when it is
not empty. For the two page-text titles, show them collapsed or as "full
text" because of the noise.

### 4.2 `raw_data`: cv.lv search-result record (as fetched)

The complete search-result object, never modified. Useful keys:

| Key | Type | Notes |
|---|---|---|
| `id` | int | cv.lv vacancy id |
| `positionTitle`, `employerName`, `employerId` | str / int | = `title`, `company`, employer id |
| `positionContent` | str (HTML) | source of `description` |
| `salaryFrom`, `salaryTo`, `hourlySalary` | int / bool | the original salary before house rules |
| `publishDate`, `renewedDate`, `expirationDate` | ISO str | `renewedDate` set = renewed at least once |
| `townId`, `countyId`, `countryId` | int | location ids (101 = Latvia, 543 = Rīga) |
| `remoteWork`, `remoteWorkType` | bool / str | |
| `workTimes`, `categories`, `languages` | int[] | ⚠️ **numeric codes, no mapping stored.** Use the string versions in `detail_data`. |
| `keywords` | str[] | employer-entered search keywords |
| `quickApply`, `suitableForRefugees` | bool | |
| `logoId` | str (uuid) | employer logo, see §8 |

### 4.3 `detail_data`: vacancy-page record

The record from the ad page (`pageProps.vacancy[<id>]`). It is NULL for the
11 rows where the page had none (branded template) and for pending rows.
**Recruiter `contacts` are removed on purpose** (personal data). Useful keys:

| Path | Type | Notes |
|---|---|---|
| `firstPublishDate` | date str | → `first_published_at` |
| `views` | int | cv.lv view counter **at the moment of our visit** (a snapshot, not live) |
| `languageIso` | str | ⚠️ unreliable (both LV and EN twins say `en`) |
| `urlDetailsType` | str | `DISABLED` (standard/image ad, 373) or `IFRAME` (42) |
| `details.standardDetails[]` | `{id, title, content(HTML)}` | source of `sections` (content can be null on branded templates) |
| `details.fileDetails.fileId` | uuid | set = **image ad**, see §8 |
| `details.urlDetails` | url | the embedded page of IFRAME ads |
| `highlights.salaryFrom/salaryTo/ratePer` | int / str | `ratePer`: `MONTHLY`, `HOURLY` |
| `highlights.workTimes` | str[] | → `work_times` |
| `highlights.remoteWorkType`, `flexibleSchedule` | str / bool | |
| `highlights.address`, `highlights.location{townId,countyId,countryId}` | | → `address` |
| `highlights.additionalBenefits` | str | → section `Papildu labumi` |
| `settings.categories` | str[] | **full** cv.lv category list of the ad (multi-valued), e.g. `INFORMATION_TECHNOLOGY` 309, `BANKING_INSURANCE` 157, `FINANCE_ACCOUNTING` 87, `TECHNICAL_ENGINEERING` 61, `ORGANISATION_MANAGEMENT` 43, `ELECTRONICS_TELECOM` 38, `ADMINISTRATION` 37, `SALES` 35, … Good for a richer category facet than `category`. |
| `settings.keywords[]` | `{id, value}` | employer keywords |
| `settings.applyingUrl`, `settings.dateTo`, `settings.dateStart` | | → `apply_url`, `deadline` |
| `settings.vacancyType`, `highlights.type` | str | `REGULAR` mostly |
| `employer.about` | str (HTML) | company description (sanitise before rendering) |
| `employer.webpageUrl`, `employer.videoUrl`, `employer.regCode` | str | `regCode` sometimes holds the company name, not the registration number |
| `employer.logoFileId`, `employer.coverFileId` | uuid | see §8 |
| `questions[]` | `{value, type, mandatory, …}` | employer's application questions |

### 4.4 `enrichment`: LLM audit

```json
{
  "raw": { "responsibilities": [...], "requirements": [...], "benefits": [...],
           "skills": [...], "languages": [...], "seniority": "mid",
           "experience_years_min": 3, "education": "...", "salary_basis": "unknown",
           "salary_min": null, "salary_max": null, "salary_period": "unknown",
           "summary_lv": "..." },
  "dropped_ungrounded": {"responsibilities": 0, "requirements": 0, "benefits": 1, "skills": 2},
  "source_chars": 3239,
  "salary_from_text": false
}
```

- `raw` is the model's **unfiltered** answer. The columns hold the
  checked values. Don't show `raw` to users.
- `dropped_ungrounded`: items removed because they weren't in the ad
  (totals today: skills 49, benefits 17, responsibilities 4, requirements 3).
- `source_chars`: size of the text the model read. Below ~300 means a thin ad.

### 4.5 `renewal_dates`

A JSON array of ISO timestamp strings, oldest first. Empty `[]` = never
renewed as far as we know.

## 5. Enumerations

| Column | Values (count 2026-09-29) |
|---|---|
| `category` | `INFORMATION_TECHNOLOGY` (267), `BANKING_INSURANCE` (159) |
| `work_mode` | `HYBRID` (226), `ON_SITE` (192), `FULLY_REMOTE` (8) |
| `work_times` (array) | `FULL_TIME` (406), `FIXED_TERM` (9), `FULL_TIME_WITH_SHIFTS` (8), `PART_TIME` (3), `PRACTICE` (2), `FREELANCE` (2), `WORK_AFTER_CLASSES` (2). More cv.lv values may appear. |
| `salary_period` | `MONTHLY` (424), `HOURLY` (2). `YEARLY` is possible from text extraction. |
| `salary_basis` | `gross` (426), `net` (0) |
| `seniority` | `mid` 176, `unknown` 102, `senior` 74, `junior` 39, `lead` 24, `manager` 8, `intern` 3, `director` 0 |
| `languages` | open list of Latvian language names (lowercase). See §3.6. |

Suggested Latvian UI labels: `ON_SITE` klātienē, `HYBRID` hibrīds,
`FULLY_REMOTE` attālināti; `FULL_TIME` pilna slodze, `PART_TIME` nepilna
slodze, `FIXED_TERM` uz noteiktu laiku, `FULL_TIME_WITH_SHIFTS` maiņu darbs,
`PRACTICE` prakse, `FREELANCE` ārštata, `WORK_AFTER_CLASSES` darbs pēc
mācībām; `MONTHLY` /mēn., `HOURLY` /h.

## 6. Indexes (for query planning)

| Index | On |
|---|---|
| `blt_listings_pkey` | `id` |
| `blt_listings_published_idx` | `published_at desc` |
| `blt_listings_unnotified_idx` | `scraped_at` where `notified_at is null` |
| `blt_listings_enrich_pending_idx` | `published_at desc` where `enriched_at is null and visited_at is not null` |
| `blt_listings_repost_root_idx` | `repost_root` |

There are no indexes on `first_published_at`, `deadline`, `company`,
`skills` or the text columns. That's fine at today's size (~few thousand
rows max), but add them if the portal filters on them heavily. There is no
full-text index either: `ilike` works at this scale.

## 7. Storage: `job-screenshots`

| | |
|---|---|
| Bucket | `job-screenshots`, **public** (anyone with the URL can read it; the content is screenshots of already-public ads) |
| Object path | `cvlv/<numeric cv.lv id>.jpg`, e.g. `cvlv/1652254.jpg`. The only top-level folder today is `cvlv/`. |
| Public URL | `{SUPABASE_URL}/storage/v1/object/public/job-screenshots/cvlv/<id>.jpg`, the same value as `screenshot_url` |
| Format | JPEG, quality 80, `image/jpeg`, **full page** (the whole cv.lv page including header, "similar ads" and footer) |
| Dimensions | width = the run's browser viewport: 1280, 1366, 1440, 1536 or 1920 px (random per run). Height depends on the ad, ~2000–7700 px. |
| Size | 418 objects, 186 MB total, avg ~445 KB, max ~1.3 MB (2026-09-29) |
| Cache | uploaded with `cacheControl: no-cache` |
| Lifecycle | taken on each visit; a revisit **overwrites** the same path (`x-upsert`). Deleted for LV/EN twins. Never deleted when an ad expires (it's kept as evidence). |
| Quota | ⚠️ Supabase free tier = 1 GB Storage, **shared with the flight-data project**. At ~445 KB × ~20 new ads per working day, roughly 3 months until a cleanup policy is needed (tracked in `TODO.md`). |

UI notes:
- **Don't load full screenshots in lists.** They're tall, heavy JPEGs. Use
  Supabase image transformations (a paid-plan feature) or show them only on
  a detail page, lazy-loaded, in a scroll box.
- Some branded-page screenshots include a **cookie banner** over the top
  part of the page.
- The screenshot shows the page as it was at `visited_at`, not live.

## 8. External assets that are NOT stored

Employer logos, cover images and the original ad images are **not copied**
to Storage. They exist only on cv.lv:

```
https://www.cv.lv/api/v1/files-service/<fileId>
```

`<fileId>` = `raw_data.logoId`, `detail_data.employer.logoFileId`,
`detail_data.employer.coverFileId` or `detail_data.details.fileDetails.fileId`.
Hot-linking them makes every portal page view a request to cv.lv, and they
disappear when cv.lv removes them. If the portal needs logos, ask for the
pipeline to copy them to Storage once per employer.

## 9. Access for the portal

**Never put the `service_role` key in a browser.** It bypasses RLS and can
read and write every schema in the shared project, including the flight
data. Two safe patterns:

1. **Server-side portal** (recommended to start): the portal's backend or
   API routes query with `service_role` from a server-only env var, and the
   browser only talks to the backend.
2. **Browser + Supabase Auth**: give signed-in users read-only access to the
   view. Not applied yet; run it in the SQL Editor when needed:

   ```sql
   grant usage on schema blt to authenticated;
   grant select on blt.blt_listings to authenticated;
   grant select on blt.listings to authenticated;
   create policy "portal read" on blt.blt_listings
     for select to authenticated using (true);
   ```

   Because the view is `security_invoker`, this RLS policy is what governs
   the view too. `anon` stays without access.

Both need `blt` in Settings → API → Exposed schemas (already done).

### Query examples

supabase-js:

```js
const { data, error, count } = await supabase
  .schema('blt')
  .from('listings')
  .select('id,title,company,town,salary_from,salary_to,salary_period,work_mode,seniority,summary,skills,is_repeating,times_posted,times_renewed,days_open,first_published_at,deadline,url,screenshot_url', { count: 'exact' })
  .gte('deadline', new Date().toISOString().slice(0, 10))   // still open (approximation, see §10)
  .eq('category', 'INFORMATION_TECHNOLOGY')
  .order('first_published_at', { ascending: false })
  .range(0, 49);
```

PostgREST (raw HTTP; the `Accept-Profile` header is required):

```bash
# newest open ads in Rīga with salary ≥ 3000/month
curl -s "$SUPABASE_URL/rest/v1/listings?select=id,title,company,salary_from,salary_to&town=eq.R%C4%ABga&salary_period=eq.MONTHLY&salary_to=gte.3000&deadline=gte.2026-09-29&order=first_published_at.desc&limit=50" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Accept-Profile: blt"

# skill facet: ads whose skills array contains "SQL" (exact element, case-sensitive)
curl -s "$SUPABASE_URL/rest/v1/listings?select=id,title&skills=cs.%7BSQL%7D" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Accept-Profile: blt"

# hiring-difficulty list
curl -s "$SUPABASE_URL/rest/v1/listings?select=id,title,company,times_posted,times_renewed,days_open&is_repeating=is.true&order=days_open.desc" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Accept-Profile: blt"

# text search in title or summary
curl -s "$SUPABASE_URL/rest/v1/listings?select=id,title&or=(title.ilike.*analītiķ*,summary.ilike.*analītiķ*)" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Accept-Profile: blt"

# JSON path: full cv.lv category list contains FINANCE_ACCOUNTING
curl -s "$SUPABASE_URL/rest/v1/listings?select=id,title&detail_data->settings->categories=cs.%5B%22FINANCE_ACCOUNTING%22%5D" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Accept-Profile: blt"
```

Notes:
- PostgREST returns at most 1000 rows per request. Page with `.range()` or
  the `Range` header, and get totals with `Prefer: count=exact`.
- **Aggregations** (ads per company, median salary per seniority, top
  skills) are not expressible in plain PostgREST filters. Create SQL views
  or RPC functions in `blt` for them (and grant them like the view above),
  or aggregate server-side.

## 10. Known gaps and data-quality caveats

| Gap | Impact | Possible fix (not done yet) |
|---|---|---|
| **No "active" flag / `last_seen_at`** | An ad removed early by the employer still looks open until its `deadline`. | Have the scrape record `last_seen_at` for every ad on the search pages it walks (the morning run does a full sweep daily). |
| `company` = poster, not always the employer | Recruiter posts (CV-Online Recruitment) group many employers under one name. | LLM-extract the real employer into a new column. |
| Skills and language names not normalised | Facets split (`Power BI` vs `PowerBI`, `igauņu` vs `estoniešu`). | A mapping table or UI-side normalisation. |
| LLM list items mix LV and EN | A mixed-language UI. | Keep the originals; optional translated columns. |
| `times_renewed` history starts 2026-09-29 | Older renewal counts are only "≥ 1". | None (cv.lv exposes no history). |
| `salary_basis` mostly defaulted | "gross" is an assumption for most rows. | Show it as "bruto (pieņemts)" unless the ad states it. |
| OCR noise in `ad_image_text` | Misread characters. | Already grayscale + 2× upscale; show as machine-read. |
| Branded page text includes page chrome | Noise in `sections` for ~12 ads. | Render collapsed. |
| `description` inconsistent | Snippet vs full text. | Prefer `sections`. |
| Hourly salaries (2 rows) | Break "sort by salary". | Filter or convert by `salary_period`. |
| Logos and ad images not stored | Hot-linking to cv.lv. | Copy logos to Storage. |

## 11. Keeping this document true

Update this file whenever a migration adds or changes a column, a pipeline
rule changes, or the Storage layout changes. Add a changelog entry at the
same time. Re-run the profile (fill rates, enums) after large changes. The
queries used for this version are simple `select=*` dumps through PostgREST
with `Accept-Profile: blt`, plus Storage `object/list/job-screenshots`.
