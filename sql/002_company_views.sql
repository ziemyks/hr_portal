-- Company analysis for the portal (list + full profile vs market).
-- Read-only, safe to re-run. Requires 001_portal_views.sql. Run in the Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- All companies with headline numbers (for the company list / picker).
-- ---------------------------------------------------------------------------

create or replace function blt.company_list()
returns jsonb language sql stable
set search_path = blt, extensions, public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.n_active desc, x.n desc, x.company), '[]')
  from (
    select lp.company,
           count(*) as n,
           count(*) filter (where lp.is_active) as n_active,
           percentile_cont(0.5) within group (order by lp.salary_mid_monthly) as median_salary,
           round(avg(lp.days_open) filter (where lp.is_active), 1) as avg_days_open,
           count(*) filter (where lp.is_repeating) as n_repeating,
           min(lp.first_published_at) as first_seen,
           max(lp.first_published_at) as last_posted,
           mode() within group (order by lp.category) as main_category,
           (lp.company ~* '(recruit|personāl|personal|atlase|cv-online|workforce|headhunt)') as recruiter
    from blt.listings_portal lp
    group by lp.company
  ) x
$$;

-- ---------------------------------------------------------------------------
-- Full profile of one company, every metric next to the market value.
-- Returns null when the company has no ads.
-- ---------------------------------------------------------------------------

create or replace function blt.company_profile(p_company text)
returns jsonb language sql stable
set search_path = blt, extensions, public as $$
  with
  m as materialized (select * from blt.listings_portal),
  c as materialized (select * from m where m.company = p_company),
  tot as (
    select (select count(*) from c) as c_n, (select count(*) from m) as m_n,
           (select count(*) from c where is_active) as c_active, (select count(*) from m where is_active) as m_active
  ),
  -- benefit themes: share of ads whose benefits mention the theme
  themes(key, label, pattern) as (values
    ('health',    'Veselības apdrošināšana',          '(veselības apdro|health insurance|medical insurance|veselības polis)'),
    ('remote',    'Attālinātais / hibrīda darbs',     '(attālin|hibrīd|remote|hybrid|home office|no mājām)'),
    ('training',  'Apmācības un attīstība',           '(apmācīb|mācīb|training|learning|kursi|sertifik|development)'),
    ('bonus',     'Prēmijas / bonusi',                '(prēmij|bonus)'),
    ('vacation',  'Papildu atvaļinājums / brīvdienas','(atvaļināj|vacation|holiday|days off|brīvdien)'),
    ('flex',      'Elastīgs darba laiks',             '(elastīg|flexible)'),
    ('sport',     'Sports un labsajūta',              '(sport|fitness|trenažier|baseins|gym|wellbeing|labsajūt)'),
    ('pension',   'Pensiju / dzīvības apdrošināšana', '(pensij|pension|dzīvības apdro|life insurance)'),
    ('equipment', 'Darba tehnika',                    '(portatīv|laptop|dator|equipment|tālrun)'),
    ('events',    'Kolektīva pasākumi',               '(pasākum|team building|teambuilding|events|ballīt)'),
    ('office',    'Moderns birojs / atrašanās vieta', '(birojs|biroja|office)'),
    ('food',      'Ēdināšana / kafija',               '(ēdin|pusdien|kafij|coffee|lunch|snack|augļ)')
  ),
  -- skill vectors per company (for the competitor similarity)
  cs as (select m.company, k, count(*)::numeric as n from m, unnest(m.skills_norm) k group by 1, 2),
  cs_norm as (select company, sqrt(sum(n * n)) as norm from cs group by 1),
  mine as (select k, n from cs where cs.company = p_company)
  select case when (select c_n from tot) = 0 then null else jsonb_build_object(
    'company', p_company,
    'generated_at', now(),
    'recruiter', p_company ~* '(recruit|personāl|personal|atlase|cv-online|workforce|headhunt)',

    'kpi', (select jsonb_build_object(
      'total', t.c_n,
      'active', t.c_active,
      'inactive', t.c_n - t.c_active,
      'market_total', t.m_n,
      'market_active', t.m_active,
      'companies_total', (select count(distinct company) from m),
      'rank_active', (select r from (select company, rank() over (order by count(*) filter (where is_active) desc) r from m group by company) z where z.company = p_company),
      'first_seen', (select min(first_published_at) from c),
      'last_posted', (select max(first_published_at) from c),
      'new_30d', (select count(*) from c where first_published_at > current_date - 30),
      'median_salary', (select percentile_cont(0.5) within group (order by salary_mid_monthly) from c),
      'market_median_salary', (select percentile_cont(0.5) within group (order by salary_mid_monthly) from m),
      'salary_n', (select count(salary_mid_monthly) from c),
      'avg_days_open', (select round(avg(days_open) filter (where is_active), 1) from c),
      'market_avg_days_open', (select round(avg(days_open) filter (where is_active), 1) from m),
      'repeating', (select count(*) filter (where is_repeating) from c),
      'market_repeating_pct', (select round(100.0 * count(*) filter (where is_repeating) / nullif(count(*), 0), 1) from m),
      'avg_views', (select round(avg(views)) from c),
      'market_avg_views', (select round(avg(views)) from m),
      'avg_experience', (select round(avg(experience_years_min), 1) from c),
      'market_avg_experience', (select round(avg(experience_years_min), 1) from m),
      'hourly_ads', (select count(*) from c where salary_period = 'HOURLY')
    ) from tot t),

    'weekly', (select coalesce(jsonb_agg(jsonb_build_object('week', w, 'n', n) order by w), '[]')
               from (select date_trunc('week', first_published_at)::date w, count(*) n
                     from c where first_published_at is not null group by 1) x),

    'open_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'n', n) order by d), '[]')
                    from (select d::date d, count(c.id) n
                          from generate_series((select min(first_published_at) from c), current_date, interval '1 day') d
                          left join c on c.first_published_at <= d::date and c.deadline >= d::date
                          group by 1) x),

    'skills', (select coalesce(jsonb_agg(jsonb_build_object(
                  'key', x.k, 'label', coalesce(sl.label, x.k), 'n', x.n,
                  'pct', round(100.0 * x.n / t.c_n, 1),
                  'market_pct', round(100.0 * coalesce(mk.n, 0) / t.m_n, 1)) order by x.n desc, x.k), '[]')
               from (select k, count(*) n from c, unnest(c.skills_norm) k group by 1 order by 2 desc, 1 limit 20) x
               cross join tot t
               left join (select k, count(*) n from m, unnest(m.skills_norm) k group by 1) mk on mk.k = x.k
               left join blt.skill_labels sl on sl.key = x.k),

    'seniority', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', cn, 'pct', round(100.0 * cn / t.c_n, 1), 'market_pct', round(100.0 * mn / t.m_n, 1)) order by cn desc, mn desc), '[]')
                  from (select coalesce(m.seniority, 'unknown') k, count(*) filter (where m.company = p_company) cn, count(*) mn from m group by 1) x, tot t
                  where cn > 0),

    'work_mode', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', cn, 'pct', round(100.0 * cn / t.c_n, 1), 'market_pct', round(100.0 * mn / t.m_n, 1)) order by cn desc, mn desc), '[]')
                  from (select coalesce(m.work_mode, 'UNKNOWN') k, count(*) filter (where m.company = p_company) cn, count(*) mn from m group by 1) x, tot t
                  where cn > 0),

    'languages', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', cn, 'pct', round(100.0 * cn / t.c_n, 1), 'market_pct', round(100.0 * mn / t.m_n, 1)) order by cn desc), '[]')
                  from (select k, count(*) filter (where m.company = p_company) cn, count(*) mn from m, unnest(m.languages_norm) k group by 1) x, tot t
                  where cn > 0),

    'categories', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                   from (select k, count(*) n from c, unnest(c.categories_all) k group by 1) x),

    'towns', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
              from (select coalesce(town, '—') k, count(*) n from c group by 1) x),

    'salary_by_seniority', (select coalesce(jsonb_agg(jsonb_build_object(
                               'key', x.k, 'n', x.n, 'median', x.med, 'min', x.lo, 'max', x.hi,
                               'market_median', mk.med, 'market_n', mk.n)), '[]')
                            from (select coalesce(seniority, 'unknown') k, count(*) n,
                                         percentile_cont(0.5) within group (order by salary_mid_monthly) med,
                                         min(salary_mid_monthly) lo, max(salary_mid_monthly) hi
                                  from c where salary_mid_monthly is not null group by 1) x
                            left join (select coalesce(seniority, 'unknown') k, count(*) n,
                                              percentile_cont(0.5) within group (order by salary_mid_monthly) med
                                       from m where salary_mid_monthly is not null group by 1) mk on mk.k = x.k),

    'benefit_themes', (select coalesce(jsonb_agg(jsonb_build_object(
                          'key', th.key, 'label', th.label,
                          'n', x.cn, 'pct', round(100.0 * x.cn / t.c_n, 1),
                          'market_pct', round(100.0 * x.mn / t.m_n, 1)) order by x.cn desc, x.mn desc), '[]')
                       from themes th
                       cross join tot t
                       cross join lateral (
                         select count(*) filter (where m.company = p_company) cn, count(*) mn
                         from m where array_to_string(m.benefits, ' ') ~* th.pattern
                       ) x),

    'benefits_top', (select coalesce(jsonb_agg(jsonb_build_object('text', b, 'n', n) order by n desc, b), '[]')
                     from (select min(trim(b)) b, count(*) n from c, unnest(c.benefits) b
                           where length(trim(b)) between 3 and 160
                           group by lower(trim(b)) order by 2 desc, 1 limit 15) x),

    'roles', (select coalesce(jsonb_agg(jsonb_build_object('title', title, 'n', n, 'active', n_active, 'latest', latest) order by n desc, latest desc), '[]')
              from (select min(title) title, count(*) n, count(*) filter (where is_active) n_active, max(first_published_at) latest
                    from c group by title_norm order by 2 desc, 4 desc limit 15) x),

    'experience', (select jsonb_build_object(
                     'stated', count(experience_years_min), 'total', count(*),
                     'education_stated', count(education)) from c),

    'ad_format', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]')
                  from (select ad_format k, count(*) n from c group by 1) x),
    'apply_channel', (select jsonb_build_object('own', count(*) filter (where apply_url is not null), 'cvlv', count(*) filter (where apply_url is null)) from c),

    'competitors', (select coalesce(jsonb_agg(to_jsonb(z) order by z.similarity desc), '[]')
                    from (select o.company,
                                 round(sum(o.n * mine.n) / nullif(cn_me.norm * cn_o.norm, 0), 3) as similarity,
                                 (array_agg(coalesce(sl.label, o.k) order by o.n * mine.n desc, o.k))[1:6] as shared_skills,
                                 (select count(*) from m where m.company = o.company) as n,
                                 (select count(*) from m where m.company = o.company and m.is_active) as n_active
                          from cs o
                          join mine on mine.k = o.k
                          join cs_norm cn_o on cn_o.company = o.company
                          left join blt.skill_labels sl on sl.key = o.k
                          cross join (select norm from cs_norm where company = p_company) cn_me
                          where o.company <> p_company
                          group by o.company, cn_me.norm, cn_o.norm
                          order by 2 desc nulls last
                          limit 8) z)
  ) end
$$;

revoke all on function blt.company_list(), blt.company_profile(text) from public, anon, authenticated;
grant execute on function blt.company_list(), blt.company_profile(text) to service_role;

notify pgrst, 'reload schema';
