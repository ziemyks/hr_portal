-- Portal read layer for blt (views + RPC functions).
-- Read-only: nothing here writes to blt.blt_listings. Safe to re-run.
-- Run in the Supabase SQL editor (as postgres). See blt-data-dictionary.md §9.

create extension if not exists pg_trgm with schema extensions;
grant usage on schema extensions to service_role; -- already true on Supabase; needed for similarity()

-- ---------------------------------------------------------------------------
-- Normalisation helpers
-- ---------------------------------------------------------------------------

-- Grouping key for a skill: 'Microsoft Power BI' / 'PowerBI' / 'power bi' -> 'powerbi'.
create or replace function blt.norm_skill_key(s text)
returns text language sql immutable parallel safe as $$
  with k as (
    select regexp_replace(
             regexp_replace(lower(trim(coalesce(s, ''))), '^(microsoft|ms)\s+', ''),
             '[\s\.\-_/]+', '', 'g') as key
  )
  select case key
    when 'js' then 'javascript'
    when 'ts' then 'typescript'
    when 'reactjs' then 'react'
    when 'nodejs' then 'node'
    when 'postgres' then 'postgresql'
    when 'k8s' then 'kubernetes'
    when 'golang' then 'go'
    when 'msexcel' then 'excel'
    when 'powerbidesktop' then 'powerbi'
    when 'amazonwebservices' then 'aws'
    when 'googlecloudplatform' then 'gcp'
    when 'googlecloud' then 'gcp'
    when 'azurecloud' then 'azure'
    when 'microsoftazure' then 'azure'
    else key end
  from k
$$;

-- Language names are Latvian, lowercase; fold synonyms.
create or replace function blt.norm_language(s text)
returns text language sql immutable parallel safe as $$
  select case v
    when 'estoniešu' then 'igauņu'
    when 'angliski' then 'angļu'
    when 'latviski' then 'latviešu'
    when 'krieviski' then 'krievu'
    else v end
  from (select regexp_replace(lower(trim(coalesce(s, ''))), '\s+valoda$', '') as v) x
$$;

-- Title without gender endings ('Analītiķis/-e' -> 'analītiķis'), for similarity.
create or replace function blt.norm_title(s text)
returns text language sql immutable parallel safe as $$
  select trim(regexp_replace(
           regexp_replace(lower(coalesce(s, '')), '\(?\s*/\s*-[a-zāčēģīķļņšūž]{1,4}\)?|\(-[a-zāčēģīķļņšūž]{1,4}\)', '', 'g'),
           '\s+', ' ', 'g'))
$$;

-- ---------------------------------------------------------------------------
-- Portal view: blt.listings + computed columns
-- ---------------------------------------------------------------------------

create or replace view blt.listings_portal with (security_invoker = on) as
select
  l.*,
  (l.deadline >= current_date) as is_active,
  (l.deadline >= current_date and l.deadline <= current_date + 7) as closing_soon,
  case when coalesce(l.salary_from, l.salary_to) is not null
       then (coalesce(l.salary_from, l.salary_to) + coalesce(l.salary_to, l.salary_from)) / 2 end as salary_mid,
  case when l.salary_period = 'MONTHLY' and coalesce(l.salary_from, l.salary_to) is not null
       then (coalesce(l.salary_from, l.salary_to) + coalesce(l.salary_to, l.salary_from)) / 2 end as salary_mid_monthly,
  case
    when l.visited_at is null and l.detail_data is null then 'pending'
    when l.detail_data #>> '{details,fileDetails,fileId}' is not null then 'image'
    when l.detail_data ->> 'urlDetailsType' = 'IFRAME' then 'iframe'
    when l.detail_data is null
      or (jsonb_typeof(l.sections) = 'array'
          and exists (select 1 from jsonb_array_elements(l.sections) e
                      where e ->> 'title' = 'Lapas teksts (zīmola lapa)')) then 'branded'
    else 'text'
  end as ad_format,
  coalesce((select array_agg(distinct k order by k)
            from (select blt.norm_skill_key(s) k from unnest(l.skills) s) x
            where k <> ''), '{}'::text[]) as skills_norm,
  coalesce((select array_agg(distinct v order by v)
            from (select blt.norm_language(s) v from unnest(l.languages) s) x
            where v <> ''), '{}'::text[]) as languages_norm,
  case when jsonb_typeof(l.detail_data #> '{settings,categories}') = 'array'
            and jsonb_array_length(l.detail_data #> '{settings,categories}') > 0
       then array(select jsonb_array_elements_text(l.detail_data #> '{settings,categories}'))
       else array[l.category] end as categories_all,
  case when l.detail_data ->> 'views' ~ '^\d+(\.\d+)?$'
       then (l.detail_data ->> 'views')::numeric::int end as views,
  blt.norm_title(l.title) as title_norm
from blt.listings l;

-- Display label per skill key (most frequent original spelling).
create or replace view blt.skill_labels with (security_invoker = on) as
select blt.norm_skill_key(s) as key,
       mode() within group (order by s) as label,
       count(*) as n
from blt.listings l, unnest(l.skills) s
where blt.norm_skill_key(s) <> ''
group by 1;

-- ---------------------------------------------------------------------------
-- Facets for the list filters
-- ---------------------------------------------------------------------------

create or replace function blt.portal_facets()
returns jsonb language sql stable
set search_path = blt, extensions, public as $$
  with f as (select * from blt.listings_portal)
  select jsonb_build_object(
    'total',     (select count(*) from f),
    'active',    (select count(*) from f where is_active),
    'companies', (select coalesce(jsonb_agg(jsonb_build_object('value', company, 'n', n) order by n desc, company), '[]')
                  from (select company, count(*) n from f group by 1) x),
    'towns',     (select coalesce(jsonb_agg(jsonb_build_object('value', town, 'n', n) order by n desc, town), '[]')
                  from (select town, count(*) n from f where town is not null group by 1) x),
    'skills',    (select coalesce(jsonb_agg(jsonb_build_object('value', x.k, 'label', coalesce(sl.label, x.k), 'n', x.n) order by x.n desc, x.k), '[]')
                  from (select k, count(*) n from f, unnest(f.skills_norm) k group by 1) x
                  left join blt.skill_labels sl on sl.key = x.k),
    'languages', (select coalesce(jsonb_agg(jsonb_build_object('value', v, 'n', n) order by n desc, v), '[]')
                  from (select v, count(*) n from f, unnest(f.languages_norm) v group by 1) x),
    'categories',(select coalesce(jsonb_agg(jsonb_build_object('value', c, 'n', n) order by n desc, c), '[]')
                  from (select c, count(*) n from f, unnest(f.categories_all) c group by 1) x)
  )
$$;

-- ---------------------------------------------------------------------------
-- Dashboard: every widget in one call. Null parameters = no filter.
-- p_from/p_to filter by first_published_at.
-- ---------------------------------------------------------------------------

create or replace function blt.dashboard_stats(
  p_from date default null,
  p_to date default null,
  p_category text default null,
  p_seniority text default null,
  p_town text default null,
  p_work_mode text default null
)
returns jsonb language sql stable
set search_path = blt, extensions, public as $$
  with f as materialized (
    select * from blt.listings_portal lp
    where (p_from is null or lp.first_published_at >= p_from)
      and (p_to is null or lp.first_published_at <= p_to)
      and (p_category is null or p_category = any(lp.categories_all))
      and (p_seniority is null or lp.seniority = p_seniority)
      and (p_town is null or lp.town = p_town)
      and (p_work_mode is null or lp.work_mode = p_work_mode)
  ),
  days as (
    select d::date as day
    from generate_series(
      greatest(coalesce(p_from, (select min(first_published_at) from f)), (select min(first_published_at) from f)),
      least(coalesce(p_to, current_date), current_date),
      interval '1 day') d
  ),
  sk as (
    select k, f.* from f, unnest(f.skills_norm) k
  )
  select jsonb_build_object(
    'generated_at', now(),
    'kpi', (
      select jsonb_build_object(
        'total', count(*),
        'active', count(*) filter (where is_active),
        'inactive', count(*) filter (where not is_active or deadline is null),
        'new_7d', count(*) filter (where first_published_at > current_date - 7),
        'new_prev_7d', count(*) filter (where first_published_at > current_date - 14 and first_published_at <= current_date - 7),
        'closing_soon', count(*) filter (where closing_soon),
        'repeating_active', count(*) filter (where is_active and is_repeating),
        'avg_days_open_active', round(avg(days_open) filter (where is_active), 1),
        'median_salary_active', percentile_cont(0.5) within group (order by salary_mid_monthly) filter (where is_active),
        'median_salary_all', percentile_cont(0.5) within group (order by salary_mid_monthly),
        'hourly_ads', count(*) filter (where salary_period = 'HOURLY'),
        'companies_active', count(distinct company) filter (where is_active)
      ) from f
    ),
    'weekly_new', (
      select coalesce(jsonb_agg(jsonb_build_object('week', week, 'category', category, 'n', n) order by week, category), '[]')
      from (select date_trunc('week', first_published_at)::date week, category, count(*) n
            from f where first_published_at is not null group by 1, 2) x
    ),
    'open_by_day', (
      select coalesce(jsonb_agg(jsonb_build_object('day', day, 'n', n) order by day), '[]')
      from (select days.day, count(f.id) n
            from days left join f on f.first_published_at <= days.day and f.deadline >= days.day
            group by 1) x
    ),
    'salary_by_seniority', (
      select coalesce(jsonb_agg(jsonb_build_object('key', seniority, 'n', n, 'p25', p25, 'median', p50, 'p75', p75)), '[]')
      from (select seniority, count(*) n,
                   percentile_cont(0.25) within group (order by salary_mid_monthly) p25,
                   percentile_cont(0.5)  within group (order by salary_mid_monthly) p50,
                   percentile_cont(0.75) within group (order by salary_mid_monthly) p75
            from f where salary_mid_monthly is not null group by 1) x
    ),
    'salary_by_category', (
      select coalesce(jsonb_agg(jsonb_build_object('key', category, 'n', n, 'p25', p25, 'median', p50, 'p75', p75)), '[]')
      from (select category, count(*) n,
                   percentile_cont(0.25) within group (order by salary_mid_monthly) p25,
                   percentile_cont(0.5)  within group (order by salary_mid_monthly) p50,
                   percentile_cont(0.75) within group (order by salary_mid_monthly) p75
            from f where salary_mid_monthly is not null group by 1) x
    ),
    'top_skills', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'key', x.k, 'label', coalesce(sl.label, x.k), 'n', x.n, 'n_active', x.n_active,
               'n_recent', x.n_recent, 'n_prev', x.n_prev, 'median_salary', x.med) order by x.n desc, x.k), '[]')
      from (select k, count(*) n,
                   count(*) filter (where is_active) n_active,
                   count(*) filter (where first_published_at > current_date - 30) n_recent,
                   count(*) filter (where first_published_at > current_date - 60 and first_published_at <= current_date - 30) n_prev,
                   percentile_cont(0.5) within group (order by salary_mid_monthly) med
            from sk group by 1 order by count(*) desc, 1 limit 30) x
      left join blt.skill_labels sl on sl.key = x.k
    ),
    'seniority', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                  from (select coalesce(seniority, 'unknown') k, count(*) n from f group by 1) x),
    'work_mode', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                  from (select coalesce(work_mode, 'UNKNOWN') k, count(*) n from f group by 1) x),
    'work_times', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                   from (select k, count(*) n from f, unnest(f.work_times) k group by 1) x),
    'languages', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                  from (select k, count(*) n from f, unnest(f.languages_norm) k group by 1) x),
    'towns', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
              from (select coalesce(town, '—') k, count(*) n from f group by 1 order by 2 desc limit 12) x),
    'categories_all', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                       from (select k, count(*) n from f, unnest(f.categories_all) k group by 1 order by 2 desc limit 12) x),
    'ad_format', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                  from (select ad_format k, count(*) n from f group by 1) x),
    'apply_channel', (select jsonb_build_object(
                        'own', count(*) filter (where apply_url is not null),
                        'cvlv', count(*) filter (where apply_url is null)) from f),
    'experience', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by ord), '[]')
                   from (select b.k, min(b.ord) ord, count(*) n
                         from f cross join lateral (
                           select case when f.experience_years_min is null then 'nav norādīts'
                                       when f.experience_years_min < 1 then '0'
                                       when f.experience_years_min < 3 then '1–2'
                                       when f.experience_years_min < 5 then '3–4'
                                       else '5+' end k,
                                  case when f.experience_years_min is null then 9
                                       when f.experience_years_min < 1 then 0
                                       when f.experience_years_min < 3 then 1
                                       when f.experience_years_min < 5 then 3
                                       else 5 end ord) b
                         group by b.k) x),
    'companies', (select coalesce(jsonb_agg(jsonb_build_object('key', company, 'n', n, 'n_active', n_active,
                                                               'recruiter', recruiter) order by n_active desc, n desc), '[]')
                  from (select company, count(*) n, count(*) filter (where is_active) n_active,
                               (company ~* '(recruit|personāl|personal|atlase|cv-online|workforce|headhunt)') recruiter
                        from f group by 1 order by count(*) filter (where is_active) desc, count(*) desc limit 15) x),
    'hardest_to_fill', (select coalesce(jsonb_agg(to_jsonb(x) order by is_repeating desc, days_open desc nulls last), '[]')
                        from (select id, title, company, days_open, times_posted, times_renewed, is_repeating, deadline
                              from f where is_active order by is_repeating desc, days_open desc nulls last limit 10) x),
    'closing_soon', (select coalesce(jsonb_agg(to_jsonb(x) order by deadline), '[]')
                     from (select id, title, company, deadline, salary_from, salary_to, salary_period
                           from f where closing_soon order by deadline limit 10) x),
    'most_viewed', (select coalesce(jsonb_agg(to_jsonb(x) order by views_per_day desc), '[]')
                    from (select id, title, company, views,
                                 round(views::numeric / greatest(1, (visited_at at time zone 'Europe/Riga')::date - first_published_at), 1) views_per_day
                          from f where views is not null and visited_at is not null and first_published_at is not null
                          order by 5 desc limit 10) x)
  )
  from (select 1) one
$$;

-- ---------------------------------------------------------------------------
-- Similar ads for the detail page.
-- Excludes the ad itself, its repost chain and the same company (shown separately).
-- ---------------------------------------------------------------------------

create or replace function blt.similar_listings(p_id text, p_limit int default 8)
returns table (
  id text, title text, company text, town text,
  salary_from numeric, salary_to numeric, salary_period text,
  seniority text, work_mode text, is_active boolean, deadline date, first_published_at date,
  score numeric, title_sim numeric, shared_skills text[]
)
language sql stable
set search_path = blt, extensions, public as $$
  with me as (select * from blt.listings_portal m where m.id = p_id)
  select o.id, o.title, o.company, o.town,
         o.salary_from, o.salary_to, o.salary_period,
         o.seniority, o.work_mode, o.is_active, o.deadline, o.first_published_at,
         round(s.score::numeric, 3), round(s.tsim::numeric, 3), s.shared
  from me
  join blt.listings_portal o
    on o.id <> me.id
   and o.company <> me.company
   and coalesce(o.repost_root, o.id) <> coalesce(me.repost_root, me.id)
  cross join lateral (
    select sh.shared, t.tsim,
           0.40 * t.tsim
         + 0.35 * case when u.union_n = 0 then 0 else cardinality(sh.shared)::numeric / u.union_n end
         + 0.10 * coalesce(o.seniority = me.seniority and o.seniority <> 'unknown', false)::int
         + 0.10 * (o.categories_all && me.categories_all)::int
         + 0.05 * (o.town is not distinct from me.town)::int as score
    from (select array(select unnest(o.skills_norm) intersect select unnest(me.skills_norm)) as shared) sh,
         (select similarity(o.title_norm, me.title_norm) as tsim) t,
         lateral (select cardinality(o.skills_norm) + cardinality(me.skills_norm) - cardinality(sh.shared) as union_n) u
  ) s
  order by s.score + 0.03 * o.is_active::int desc, o.first_published_at desc
  limit greatest(1, least(p_limit, 50))
$$;

-- ---------------------------------------------------------------------------
-- Indexes used by portal filters/sorts
-- ---------------------------------------------------------------------------

create index if not exists blt_listings_first_published_idx on blt.blt_listings (first_published_at desc);
create index if not exists blt_listings_deadline_idx on blt.blt_listings (deadline);

-- ---------------------------------------------------------------------------
-- Access: service_role only (the portal queries server-side). anon/authenticated
-- have no usage on schema blt; revoke the default PUBLIC execute anyway.
-- ---------------------------------------------------------------------------

revoke all on function blt.norm_skill_key(text), blt.norm_language(text), blt.norm_title(text),
  blt.portal_facets(), blt.dashboard_stats(date, date, text, text, text, text),
  blt.similar_listings(text, int) from public, anon, authenticated;
grant execute on function blt.norm_skill_key(text), blt.norm_language(text), blt.norm_title(text),
  blt.portal_facets(), blt.dashboard_stats(date, date, text, text, text, text),
  blt.similar_listings(text, int) to service_role;
grant select on blt.listings_portal, blt.skill_labels to service_role;

notify pgrst, 'reload schema';
