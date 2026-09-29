import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Building2, Download, Info, Lightbulb, List } from "lucide-react";
import { AdsTable } from "@/components/ads/ads-table";
import { BarList } from "@/components/charts/bar-list";
import { CompareBars, CompareLegend } from "@/components/charts/compare-bars";
import { SalaryCompare } from "@/components/charts/salary-compare";
import { OpenByDayChart, WeeklyBars } from "@/components/charts/time-charts";
import { CompanyPicker } from "@/components/company/company-picker";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EMPTY_FILTERS, toQuery } from "@/lib/filters";
import { date, dateTime, num } from "@/lib/format";
import { AD_FORMAT, catLabel, label, langLabel, SENIORITY, SENIORITY_ORDER, WORK_MODE } from "@/lib/labels";
import { companyHref } from "@/lib/links";
import { exportAds, getCompanyList, getCompanyProfile } from "@/lib/queries";
import type { CompanyProfile } from "@/lib/types";

type Props = { searchParams: Promise<{ name?: string | string[] }> };

const nameOf = async (sp: Props["searchParams"]) => {
  const v = (await sp).name;
  return (Array.isArray(v) ? v[0] : v)?.slice(0, 300) ?? "";
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const name = await nameOf(searchParams);
  return { title: name ? `${name} – uzņēmuma analīze` : "Uzņēmuma analīze" };
}

export default async function CompanyProfilePage({ searchParams }: Props) {
  const name = await nameOf(searchParams);
  if (!name) redirect("/companies");

  const adFilters = { ...EMPTY_FILTERS, status: "all" as const, company: [name] };
  const [p, companies, ads] = await Promise.all([getCompanyProfile(name), getCompanyList(), exportAds(adFilters)]);

  if (!p) {
    return (
      <div className="space-y-5">
        <CompanyPicker companies={companies} />
        <Card className="p-10 text-center">
          <Building2 className="mx-auto mb-3 size-8 text-fg-subtle" />
          <p className="font-medium">Uzņēmums „{name}” nav atrasts</p>
          <p className="mt-1 text-sm text-fg-subtle">Izvēlieties uzņēmumu no saraksta augstāk.</p>
        </Card>
      </div>
    );
  }

  const k = p.kpi;
  const salaryDiff = k.median_salary != null && k.market_median_salary ? Math.round(((k.median_salary - k.market_median_salary) / k.market_median_salary) * 100) : null;
  const repPct = k.total ? Math.round((k.repeating / k.total) * 100) : 0;
  const listQuery = toQuery({ status: "all", company: [name] });
  const sortSen = <T extends { key: string }>(rows: T[]) => [...rows].sort((a, b) => SENIORITY_ORDER.indexOf(a.key) - SENIORITY_ORDER.indexOf(b.key));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/companies" className="text-xs font-medium text-fg-muted hover:text-fg">← Visi uzņēmumi</Link>
        <CompanyPicker companies={companies} current={name} className="sm:w-96" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Uzņēmuma analīze</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{p.company}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
            {p.categories.slice(0, 4).map((c) => <Badge key={c.key} tone="outline" className="font-normal">{catLabel(c.key)}</Badge>)}
            <span className="text-fg-subtle">· sludinājumi kopš {date(k.first_seen)} · aprēķināts {dateTime(p.generated_at)}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ads${listQuery}`} className={buttonClass("outline", "sm")}><List /> Sludinājumu sarakstā</Link>
          <a href={`/api/export${listQuery}`} className={buttonClass("outline", "sm")} download><Download /> CSV</a>
        </div>
      </div>

      {p.recruiter && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-warn-soft px-4 py-3 text-sm text-fg">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" />
          Šī ir personāla atlases aģentūra – tā publicē sludinājumus citu uzņēmumu vārdā, tāpēc rādītāji apvieno vairākus darba devējus.
        </p>
      )}

      <section aria-label="Galvenie rādītāji" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Aktīvie sludinājumi" value={num(k.active)} sub={`#${k.rank_active} no ${num(k.companies_total)} uzņēmumiem`} />
        <StatTile label="Kopā publicēti" value={num(k.total)} sub={`${num(k.new_30d)} pēdējās 30 d. · ${Math.round((k.total / k.market_total) * 1000) / 10}% tirgus`} />
        <StatTile
          label="Mediānā alga"
          value={k.median_salary != null ? `€ ${num(k.median_salary)}` : "—"}
          sub={<>tirgū € {num(k.market_median_salary)}{salaryDiff != null && <span className="font-medium text-fg-muted"> ({salaryDiff > 0 ? "+" : ""}{salaryDiff}%)</span>}</>}
        />
        <StatTile label="Vid. atvērts (aktīvie)" value={k.avg_days_open != null ? `${num(k.avg_days_open)} d.` : "—"} sub={`tirgū ${num(k.market_avg_days_open)} d.`} />
        <StatTile label="Atkārtoti sludinājumi" value={`${repPct}%`} sub={`${num(k.repeating)} · tirgū ${num(k.market_repeating_pct)}%`} />
        <StatTile label="Skatījumi uz sludinājumu" value={num(k.avg_views)} sub={`tirgū ${num(k.market_avg_views)} (cv.lv)`} />
      </section>

      <Insights p={p} salaryDiff={salaryDiff} repPct={repPct} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Publicēšanas aktivitāte" description="Jauni sludinājumi pa nedēļām (pirmā publicēšana)" />
          <div className="p-4 pt-3"><WeeklyBars data={p.weekly} /></div>
        </Card>
        <Card>
          <CardHeader title="Aktīvo sludinājumu skaits laikā" description="Sludinājumi starp publicēšanu un termiņu katrā dienā" />
          <div className="p-4 pt-2"><OpenByDayChart data={p.open_by_day} /></div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Prasmes" description="% no uzņēmuma sludinājumiem pret % tirgū (top 20)" action={<CompareLegend />} />
          <div className="p-4">
            <CompareBars items={p.skills.map((s) => ({ key: s.key, label: s.label, pct: s.pct, market_pct: s.market_pct, n: s.n }))} />
          </div>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Alga pēc līmeņa" description={`Mēnešalga € bruto, ${num(k.salary_n)} sludinājumi ar mēneša likmi${k.hourly_ads ? ` · ${k.hourly_ads} stundas likmes nav iekļautas` : ""}`} />
            <div className="p-4"><SalaryCompare rows={sortSen(p.salary_by_seniority)} labelFor={(key) => label(SENIORITY, key)} /></div>
          </Card>
          <Card>
            <CardHeader title="Biežākie amati" description="Pēc nosaukuma (bez dzimtes galotnēm)" />
            <ul className="divide-y divide-border px-4 pb-2">
              {p.roles.map((r) => (
                <li key={r.title} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                  <span className="min-w-0 truncate">{r.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                    {r.n > 1 && <span className="font-medium text-fg">{r.n}× · </span>}
                    {r.active} akt. · {date(r.latest)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Mini title="Līmenis" legend>
          <CompareBars max={100} items={sortSen(p.seniority).map((s) => ({ key: s.key, label: label(SENIORITY, s.key), pct: s.pct, market_pct: s.market_pct, n: s.n }))} />
        </Mini>
        <Mini title="Darba veids" legend>
          <CompareBars max={100} items={p.work_mode.map((s) => ({ key: s.key, label: label(WORK_MODE, s.key), pct: s.pct, market_pct: s.market_pct, n: s.n }))} />
        </Mini>
        <Mini title="Prasītās valodas" legend>
          <CompareBars max={100} items={p.languages.map((s) => ({ key: s.key, label: langLabel(s.key), pct: s.pct, market_pct: s.market_pct, n: s.n }))} />
        </Mini>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ko piedāvā (tēmas)" description="% sludinājumu, kuros labumos minēta tēma, pret tirgu" action={<CompareLegend />} />
          <div className="p-4">
            <CompareBars max={100} items={p.benefit_themes.filter((t) => t.n > 0 || t.market_pct >= 10).map((t) => ({ key: t.key, label: t.label, pct: t.pct, market_pct: t.market_pct, n: t.n }))} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Biežāk minētie labumi" description="Kā rakstīts sludinājumos (AI izvilkts)" />
          <ul className="divide-y divide-border px-4 pb-2">
            {p.benefits_top.length === 0 && <li className="py-3 text-sm text-fg-subtle">Nav datu.</li>}
            {p.benefits_top.map((b) => (
              <li key={b.text} className="flex items-start justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0">{b.text}</span>
                <span className="shrink-0 text-xs tabular-nums text-fg-muted">{b.n}×</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Līdzīgākie darba devēji" description="Konkurenti par talantiem: līdzīgs prasmju profils (kosinusa līdzība)" />
          <ul className="divide-y divide-border px-4 pb-2">
            {p.competitors.length === 0 && <li className="py-3 text-sm text-fg-subtle">Nav pietiekami daudz prasmju datu.</li>}
            {p.competitors.map((c) => (
              <li key={c.company} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link href={companyHref(c.company)} className="text-[13px] font-medium hover:text-accent hover:underline">{c.company}</Link>
                  <p className="truncate text-xs text-fg-subtle">kopīgās: {c.shared_skills.join(", ")}</p>
                </div>
                <span className="shrink-0 text-right text-xs tabular-nums text-fg-muted">
                  <span className="block font-medium text-fg">{Math.round(c.similarity * 100)}%</span>
                  {c.n_active} akt. / {c.n}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <div className="space-y-5">
          <Mini title="Atrašanās vieta">
            <BarList items={p.towns.map((t) => ({ key: t.key, label: t.key === "—" ? "Nav norādīta / ārzemes" : t.key, n: t.n }))} />
          </Mini>
          <Mini title="Sludinājumu forma">
            <BarList items={p.ad_format.map((r) => ({ key: r.key, label: AD_FORMAT[r.key] ?? r.key, n: r.n }))} />
            <p className="mt-3 border-t border-border pt-3 text-xs text-fg-muted">
              Pieteikšanās: {num(p.apply_channel.own)} darba devēja sistēmā, {num(p.apply_channel.cvlv)} caur cv.lv.
              Pieredzi norāda {num(p.experience.stated)} no {num(p.experience.total)}, izglītību {num(p.experience.education_stated)}.
            </p>
          </Mini>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Visi sludinājumi <span className="font-normal text-fg-subtle">{num(ads.length)}</span></h2>
        <AdsTable rows={ads} filters={adFilters} sortable={false} />
      </div>
    </div>
  );
}

function Mini({ title, legend, children }: { title: string; legend?: boolean; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} action={legend ? <CompareLegend /> : undefined} className="flex-wrap" />
      <div className="p-4">{children}</div>
    </Card>
  );
}

/** Plain-language findings derived from the profile numbers. */
function Insights({ p, salaryDiff, repPct }: { p: CompanyProfile; salaryDiff: number | null; repPct: number }) {
  const k = p.kpi;
  const out: ReactNode[] = [];

  if (salaryDiff != null && k.salary_n >= 2) {
    if (Math.abs(salaryDiff) < 5) out.push(<>Atalgojums atbilst tirgum (mediāna € {num(k.median_salary)}).</>);
    else out.push(<>Atalgojums ir <b>{Math.abs(salaryDiff)}% {salaryDiff > 0 ? "virs" : "zem"}</b> tirgus mediānas (€ {num(k.median_salary)} pret € {num(k.market_median_salary)}).</>);
  }
  const bySen = p.salary_by_seniority.filter((s) => s.median != null && s.market_median && s.n >= 2);
  const gap = bySen.map((s) => ({ ...s, d: Math.round(((s.median! - s.market_median!) / s.market_median!) * 100) })).sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  if (gap && Math.abs(gap.d) >= 10)
    out.push(<>Lielākā algu atšķirība līmenī <b>{label(SENIORITY, gap.key)}</b>: {gap.d > 0 ? "+" : ""}{gap.d}% pret tirgu.</>);

  if (k.avg_days_open != null && k.market_avg_days_open) {
    const r = k.avg_days_open / k.market_avg_days_open;
    if (r >= 1.3) out.push(<>Sludinājumi ir atvērti <b>ilgāk nekā tirgū</b> ({num(k.avg_days_open)} pret {num(k.market_avg_days_open)} d.) – iespējamas grūtības atrast kandidātus.</>);
    else if (r <= 0.7) out.push(<>Sludinājumi ir atvērti īsāk nekā tirgū ({num(k.avg_days_open)} pret {num(k.market_avg_days_open)} d.).</>);
  }
  if (k.market_repeating_pct != null && repPct - k.market_repeating_pct >= 15)
    out.push(<><b>{repPct}%</b> sludinājumu ir atkārtoti (tirgū {num(k.market_repeating_pct)}%).</>);

  const distinctive = p.skills.filter((s) => s.n >= 2 && s.market_pct > 0 && s.pct / s.market_pct >= 2).slice(0, 4);
  if (distinctive.length) out.push(<>Raksturīgās prasmes (≥ 2× biežāk nekā tirgū): <b>{distinctive.map((s) => s.label).join(", ")}</b>.</>);
  else if (p.skills.length) out.push(<>Biežāk prasītās prasmes: <b>{p.skills.slice(0, 4).map((s) => s.label).join(", ")}</b>.</>);

  const topSen = [...p.seniority].sort((a, b) => b.pct - a.pct)[0];
  if (topSen && topSen.key !== "unknown" && topSen.pct >= 40) out.push(<>Galvenokārt meklē <b>{label(SENIORITY, topSen.key).toLowerCase()}</b> līmeni ({Math.round(topSen.pct)}%, tirgū {Math.round(topSen.market_pct)}%).</>);

  const remote = p.work_mode.filter((w) => w.key !== "ON_SITE" && w.key !== "UNKNOWN").reduce((s, w) => s + w.pct, 0);
  const mRemote = p.work_mode.filter((w) => w.key !== "ON_SITE" && w.key !== "UNKNOWN").reduce((s, w) => s + w.market_pct, 0);
  if (Math.abs(remote - mRemote) >= 15) out.push(<>Hibrīda/attālināto darbu piedāvā <b>{Math.round(remote)}%</b> sludinājumu (tirgū ~{Math.round(mRemote)}%).</>);

  const standout = p.benefit_themes.filter((t) => t.n >= 2 && t.pct - t.market_pct >= 20).slice(0, 3);
  if (standout.length) out.push(<>Izceļas ar: {standout.map((t) => t.label.toLowerCase()).join(", ")}.</>);

  if (k.new_30d === 0 && k.active === 0) out.push(<>Pēdējās 30 dienās jaunu sludinājumu nav.</>);
  else if (k.total && k.new_30d / k.total >= 0.6) out.push(<>Aktīvi pieņem darbā: <b>{num(k.new_30d)}</b> no {num(k.total)} sludinājumiem publicēti pēdējās 30 dienās.</>);

  if (!out.length) return null;
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-1.5"><Lightbulb className="size-4 text-fg-subtle" /> Galvenie secinājumi</span>} description="Automātiski no datiem; nelielam sludinājumu skaitam – orientējoši" />
      <ul className="grid gap-x-8 gap-y-2 p-4 text-sm md:grid-cols-2">
        {out.map((x, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="text-fg-muted [&_b]:font-semibold [&_b]:text-fg">{x}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
