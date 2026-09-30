import Link from "next/link";
import type { ReactNode } from "react";
import { Info, Repeat } from "lucide-react";
import { BarList } from "@/components/charts/bar-list";
import { SalaryRange } from "@/components/charts/salary-range";
import { OpenByDayChart, WeeklyNewChart } from "@/components/charts/time-charts";
import { DashFiltersBar } from "@/components/dashboard/dash-filters";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { dashAsAdFilters, dashToAdsQuery, parseDashFilters, type DashFilters } from "@/lib/filters";
import { date, dateTime, num, pct, relDays, salary } from "@/lib/format";
import { AD_FORMAT, catLabel, label, langLabel, SENIORITY, SENIORITY_ORDER, WORK_MODE, WORK_TIME } from "@/lib/labels";
import { getDashboard, getListFacets } from "@/lib/queries";
import { companyHref } from "@/lib/links";
import type { AdFilters } from "@/lib/filters";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const f = parseDashFilters(await searchParams);
  const [d, facetCounts] = await Promise.all([getDashboard(f), getListFacets(dashAsAdFilters(f))]);
  const k = d.kpi;
  const ads = (extra: Partial<AdFilters> = {}) => `/ads${dashToAdsQuery(f, extra)}`;

  const senRows = [...d.salary_by_seniority].sort((a, b) => SENIORITY_ORDER.indexOf(a.key) - SENIORITY_ORDER.indexOf(b.key));
  const maxSkill = Math.max(1, ...d.top_skills.map((s) => s.n));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tirgus pārskats"
        description={
          <>
            IT un banku/apdrošināšanas vakances cv.lv visā Latvijā. Dati atjaunojas darba dienās 3× dienā · aprēķināts {dateTime(d.generated_at)}.
          </>
        }
      />
      <DashFiltersBar filters={f} facetCounts={facetCounts} />

      {k.total === 0 ? (
        <Card className="p-10 text-center text-sm text-fg-muted">Izvēlētajiem filtriem nav datu.</Card>
      ) : (
        <>
          <section aria-label="Galvenie rādītāji" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="col-span-2 md:col-span-1">
              <StatTile hero label="Aktīvie sludinājumi" value={num(k.active)} sub={`no ${num(k.total)} kopā · ${num(k.companies_active)} uzņēmumi`} href={ads({ status: "active" })} />
            </div>
            <StatTile label="Jauni pēdējās 7 d." value={num(k.new_7d)} delta={{ value: k.new_7d - k.new_prev_7d, label: "pret iepr. 7 d." }} href={ads({ status: "all", sort: "new", recent: 7 })} />
            <StatTile label="Beidzas 7 dienās" value={num(k.closing_soon)} sub="pieteikšanās termiņš" href={ads({ sort: "deadline" })} />
            <StatTile label="Atkārtoti (aktīvie)" value={`${pct(k.repeating_active, k.active)}%`} sub={`${num(k.repeating_active)} – grūtāk aizpildāmi`} href={ads({ rep: true, sort: "open" })} />
            <StatTile label="Mediānā alga (aktīvie)" value={k.median_salary_active != null ? `€ ${num(k.median_salary_active)}` : "—"} sub="/mēn. bruto, diapazona vidus" />
            <StatTile label="Vid. atvērts" value={k.avg_days_open_active != null ? `${num(k.avg_days_open_active)} d.` : "—"} sub="aktīvajiem sludinājumiem" />
          </section>

          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader title="Aktīvo sludinājumu skaits laikā" description="Sludinājumi starp pirmo publicēšanu un termiņu katrā dienā" />
              <div className="p-4 pt-2">
                <OpenByDayChart data={d.open_by_day} />
                <DataTable
                  caption="Aktīvie sludinājumi pa dienām"
                  head={["Diena", "Aktīvi"]}
                  rows={d.open_by_day.slice(-30).reverse().map((r) => [date(r.day), num(r.n)])}
                />
              </div>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Jauni sludinājumi pa nedēļām" description="Pēc pirmās publicēšanas datuma" />
              <div className="p-4 pt-3">
                <WeeklyNewChart data={d.weekly_new} />
                <DataTable
                  caption="Jauni sludinājumi pa nedēļām"
                  head={["Nedēļa no", "Kategorija", "Skaits"]}
                  rows={[...d.weekly_new].reverse().map((r) => [date(r.week), catLabel(r.category), num(r.n)])}
                />
              </div>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Pieprasītākās prasmes"
                description="Sludinājumu skaits · izmaiņas: pēdējās 30 d. pret iepriekšējām 30 d. · mediānā alga"
                action={<Link href={ads()} className="text-xs text-accent hover:underline">Visi</Link>}
              />
              <div className="p-4">
                <SkillTable skills={d.top_skills.slice(0, 15)} max={maxSkill} f={f} />
              </div>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader title="Alga pēc līmeņa" description="Mēnešalga € bruto: mediāna un 25.–75. procentile (tikai mēneša likmes)" />
                <div className="p-4">
                  <SalaryRange rows={senRows} labelFor={(key) => label(SENIORITY, key)} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Alga pēc kategorijas" description="Kategorija, kurā sludinājums atrasts meklēšanā" />
                <div className="p-4">
                  <SalaryRange rows={d.salary_by_category} labelFor={catLabel} />
                </div>
              </Card>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <MiniCard title="Darba veids">
              <BarList items={d.work_mode.map((r) => ({ key: r.key, label: label(WORK_MODE, r.key), n: r.n, href: r.key !== "UNKNOWN" ? ads({ status: "all", mode: [r.key] }) : undefined }))} />
            </MiniCard>
            <MiniCard title="Līmenis" note="AI novērtējums pēc amata un prasībām">
              <BarList
                items={[...d.seniority]
                  .sort((a, b) => SENIORITY_ORDER.indexOf(a.key) - SENIORITY_ORDER.indexOf(b.key))
                  .map((r) => ({ key: r.key, label: label(SENIORITY, r.key), n: r.n, href: ads({ status: "all", sen: [r.key] }) }))}
              />
            </MiniCard>
            <MiniCard title="Prasītās valodas" note="% no sludinājumiem">
              <BarList total={k.total} items={d.languages.slice(0, 7).map((r) => ({ key: r.key, label: langLabel(r.key), n: r.n, href: ads({ status: "all", lang: [r.key] }) }))} />
            </MiniCard>
            <MiniCard title="Pieredze (gadi)" note="Tikai ~pusē sludinājumu norādīta">
              <BarList items={d.experience.map((r) => ({ key: r.key, label: r.key, n: r.n }))} />
            </MiniCard>
            <MiniCard title="Pilsētas">
              <BarList items={d.towns.slice(0, 8).map((r) => ({ key: r.key, label: r.key === "—" ? "Nav norādīta / ārzemes" : r.key, n: r.n, href: r.key !== "—" ? ads({ status: "all", town: [r.key] }) : undefined }))} />
            </MiniCard>
            <MiniCard title="Apakškategorijas" note="Pilns cv.lv kategoriju saraksts; sludinājumam var būt vairākas · % no sludinājumiem">
              <BarList total={k.total} items={d.categories_all.slice(0, 8).map((r) => ({ key: r.key, label: catLabel(r.key), n: r.n, href: ads({ status: "all", sub: [r.key] }) }))} />
            </MiniCard>
            <MiniCard title="Slodze" note="% no sludinājumiem">
              <BarList total={k.total} items={d.work_times.slice(0, 7).map((r) => ({ key: r.key, label: label(WORK_TIME, r.key), n: r.n }))} />
            </MiniCard>
            <MiniCard title="Sludinājuma formāts un pieteikšanās">
              <BarList items={d.ad_format.map((r) => ({ key: r.key, label: AD_FORMAT[r.key] ?? r.key, n: r.n }))} />
              <div className="mt-4 border-t border-border pt-3">
                <BarList
                  items={[
                    { key: "own", label: "Darba devēja sistēmā", n: d.apply_channel.own },
                    { key: "cvlv", label: "Caur cv.lv", n: d.apply_channel.cvlv },
                  ]}
                />
              </div>
            </MiniCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Aktīvākie darba devēji" description="Pēc aktīvo sludinājumu skaita" action={<Link href="/companies" className="text-xs text-accent hover:underline">Visi uzņēmumi</Link>} />
              <div className="overflow-x-auto p-4 pt-2">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-fg-subtle">
                      <th scope="col" className="py-2 font-medium">Uzņēmums</th>
                      <th scope="col" className="py-2 text-right font-medium">Aktīvi</th>
                      <th scope="col" className="py-2 text-right font-medium">Kopā</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.companies.map((c) => (
                      <tr key={c.key} className="border-b border-border last:border-0">
                        <td className="py-2 pr-2">
                          <Link href={companyHref(c.key)} className="hover:text-accent hover:underline">{c.key}</Link>
                          {c.recruiter && <Badge className="ml-1.5" title="Atlases aģentūra – publicē citu uzņēmumu vārdā">aģentūra</Badge>}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums">{num(c.n_active)}</td>
                        <td className="py-2 text-right tabular-nums text-fg-muted">{num(c.n)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <CardHeader
                title={<span className="flex items-center gap-1.5"><Repeat className="size-4 text-fg-subtle" /> Grūti aizpildāmās vakances</span>}
                description="Aktīvi sludinājumi, kas atkārtoti publicēti vai atjaunoti, un ilgāk atvērtie"
                action={<Link href={ads({ rep: true, sort: "open" })} className="text-xs text-accent hover:underline">Visi</Link>}
              />
              <ul className="divide-y divide-border px-4 pb-2">
                {d.hardest_to_fill.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/ads/${h.id}`} className="min-w-0 group">
                      <span className="block truncate text-[13px] font-medium group-hover:text-accent group-hover:underline">{h.title}</span>
                      <span className="block truncate text-xs text-fg-muted">{h.company}</span>
                    </Link>
                    <span className="shrink-0 text-right text-xs tabular-nums text-fg-muted">
                      <span className="block font-medium text-fg">{h.days_open ?? "—"} d.</span>
                      {h.is_repeating && <span>publ. {h.times_posted}× · atj. {h.times_renewed}×</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader title="Beidzas drīz" description="Pieteikšanās termiņš nākamajās 7 dienās" action={<Link href={ads({ sort: "deadline" })} className="text-xs text-accent hover:underline">Visi</Link>} />
              <ul className="divide-y divide-border px-4 pb-2">
                {d.closing_soon.length === 0 && <li className="py-3 text-sm text-fg-subtle">Nav.</li>}
                {d.closing_soon.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/ads/${c.id}`} className="min-w-0 group">
                      <span className="block truncate text-[13px] font-medium group-hover:text-accent group-hover:underline">{c.title}</span>
                      <span className="block truncate text-xs text-fg-muted">{c.company} · {salary(c.salary_from, c.salary_to, c.salary_period)}</span>
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-fg-muted">{relDays(c.deadline)}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Skatītākie" description="cv.lv skatījumi dienā (momentuzņēmums apmeklējuma brīdī, nav tiešraide)" />
              <ul className="divide-y divide-border px-4 pb-2">
                {d.most_viewed.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/ads/${m.id}`} className="min-w-0 group">
                      <span className="block truncate text-[13px] font-medium group-hover:text-accent group-hover:underline">{m.title}</span>
                      <span className="block truncate text-xs text-fg-muted">{m.company}</span>
                    </Link>
                    <span className="shrink-0 text-right text-xs tabular-nums text-fg-muted">
                      <span className="block font-medium text-fg">{num(m.views_per_day)}/d.</span>
                      {num(m.views)} kopā
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <p className="flex items-start gap-2 text-xs text-fg-subtle">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            „Aktīvs” nozīmē, ka termiņš nav beidzies – darba devēja agrāk noņemts sludinājums tiek skaitīts līdz termiņam. Algas pieņemtas kā bruto, ja nav norādīts citādi;
            {k.hourly_ads > 0 && ` ${k.hourly_ads} stundas likmes sludinājumi nav iekļauti algu statistikā;`} prasmes un līmenis ir AI izvilkti no sludinājuma teksta.
          </p>
        </>
      )}
    </div>
  );
}

function MiniCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={note} />
      <div className="p-4">{children}</div>
    </Card>
  );
}

function SkillTable({ skills, max, f }: { skills: { key: string; label: string; n: number; n_active: number; n_recent: number; n_prev: number; median_salary: number | null }[]; max: number; f: DashFilters }) {
  if (!skills.length) return <p className="text-sm text-fg-subtle">Nav datu.</p>;
  return (
    <table className="w-full text-[13px]">
      <caption className="sr-only">Pieprasītākās prasmes</caption>
      <thead>
        <tr className="text-left text-xs text-fg-subtle">
          <th scope="col" className="pb-2 font-medium">Prasme</th>
          <th scope="col" className="pb-2 text-right font-medium">Sludin.</th>
          <th scope="col" className="hidden pb-2 text-right font-medium sm:table-cell">30 d.</th>
          <th scope="col" className="pb-2 text-right font-medium">Mediāna</th>
        </tr>
      </thead>
      <tbody>
        {skills.map((s) => {
          const change = s.n_recent - s.n_prev;
          return (
            <tr key={s.key}>
              <td className="py-1.5 pr-3">
                <Link href={`/ads${dashToAdsQuery(f, { status: "all", skill: [s.key] })}`} className="group block">
                  <span className="block truncate group-hover:text-accent group-hover:underline">{s.label}</span>
                  <span className="mt-1 block h-1.5 rounded-full bg-surface-2">
                    <span className="block h-1.5 rounded-full bg-chart-1" style={{ width: `${Math.max(2, (s.n / max) * 100)}%` }} />
                  </span>
                </Link>
              </td>
              <td className="py-1.5 text-right align-top font-medium tabular-nums">
                {num(s.n)}
                <span className="block text-[11px] font-normal text-fg-subtle">{num(s.n_active)} akt.</span>
              </td>
              <td className="hidden py-1.5 text-right align-top tabular-nums text-fg-muted sm:table-cell">
                {num(s.n_recent)}
                <span className="block text-[11px] text-fg-subtle">{change > 0 ? `+${change}` : change}</span>
              </td>
              <td className="py-1.5 pl-3 text-right align-top tabular-nums">{s.median_salary != null ? `€ ${num(s.median_salary)}` : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs text-fg-subtle hover:text-fg">Skatīt kā tabulu</summary>
      <div className="mt-2 max-h-60 overflow-auto rounded-md border border-border">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-surface-2">
            <tr>{head.map((h) => <th key={h} scope="col" className="px-2 py-1.5 text-left font-medium text-fg-muted">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {r.map((c, j) => <td key={j} className="px-2 py-1 tabular-nums">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
