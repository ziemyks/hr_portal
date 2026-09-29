import Link from "next/link";
import type { ReactNode } from "react";
import {
  Briefcase, Building2, CalendarClock, Clock, ExternalLink, GraduationCap, Languages, MapPin, Send, Sparkles, Wallet,
} from "lucide-react";
import { FavouriteStar } from "@/components/ads/favourite-star";
import { RepeatBadge } from "@/components/ads/repeat-badge";
import { Salary } from "@/components/ads/salary";
import { StatusPill } from "@/components/ads/status-pill";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { basisLabel, date, dateTime, relDays, salary } from "@/lib/format";
import { AD_FORMAT, catLabel, isRecruiter, label, langLabel, SENIORITY, WORK_MODE, WORK_TIME } from "@/lib/labels";
import type { Listing, ListingRow, SimilarListing } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_TEXT_TITLES = ["Lapas teksts (zīmola lapa)"];
const isPageText = (t: string) => PAGE_TEXT_TITLES.includes(t) || t.startsWith("Iegultā sludinājuma teksts");

export function Section({ title, icon, children, className, aside }: { title: ReactNode; icon?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode }) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold [&_svg]:size-4 [&_svg]:text-fg-subtle">
          {icon}
          {title}
        </h2>
        {aside}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------- header

export function AdHeader({ ad, compact }: { ad: Listing; compact?: boolean }) {
  const recruiter = isRecruiter(ad.company);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusPill isActive={ad.is_active} closingSoon={ad.closing_soon} deadline={ad.deadline} />
        <RepeatBadge is_repeating={ad.is_repeating} times_posted={ad.times_posted} times_renewed={ad.times_renewed} days_open={ad.days_open} />
        {ad.categories_all.slice(0, compact ? 2 : 6).map((c) => (
          <Badge key={c} tone="outline" className="font-normal">{catLabel(c)}</Badge>
        ))}
      </div>
      <div>
        <h1 className={cn("font-semibold leading-tight tracking-tight", compact ? "text-lg" : "text-2xl")}>{ad.title}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-fg-muted">
          <Link href={`/ads?status=all&company=${encodeURIComponent(ad.company)}`} className="font-medium hover:text-accent hover:underline">
            {ad.company}
          </Link>
          {recruiter && <Badge tone="neutral" title="Sludinājumu publicējusi personāla atlases aģentūra; īstais darba devējs var būt minēts tekstā">aģentūra</Badge>}
          {ad.town && <span className="text-fg-subtle">· {ad.town}</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <a href={ad.apply_url ?? ad.url} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "sm")}>
          <Send /> Pieteikties{ad.apply_url ? " (darba devēja lapā)" : ""}
        </a>
        <a href={ad.url} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
          <ExternalLink /> Atvērt cv.lv
        </a>
        <FavouriteStar id={ad.id} withLabel className="border border-border" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- key facts

function Fact({ icon, label: l, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 gap-2.5">
      <span className="mt-0.5 text-fg-subtle [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-fg-subtle">{l}</dt>
        <dd className="text-sm font-medium text-fg">{children}</dd>
      </div>
    </div>
  );
}

export function Facts({ ad, columns = 3 }: { ad: Listing; columns?: 2 | 3 }) {
  const explicitBasis = ad.salary_basis === "net";
  return (
    <dl className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}>
      <Fact icon={<Wallet />} label="Alga">
        <Salary from={ad.salary_from} to={ad.salary_to} period={ad.salary_period} />
        <span className="block text-xs font-normal text-fg-subtle">
          {basisLabel(ad.salary_basis, explicitBasis)}
          {ad.salary_from != null && ad.salary_from === ad.salary_to && " · viena summa, var būt minimums"}
        </span>
      </Fact>
      <Fact icon={<MapPin />} label="Atrašanās vieta">
        {ad.town ?? "Nav norādīts"}
        {ad.address && <span className="block text-xs font-normal text-fg-subtle">{ad.address}</span>}
      </Fact>
      <Fact icon={<Building2 />} label="Darba veids">
        {label(WORK_MODE, ad.work_mode)}
        {ad.work_times?.length ? (
          <span className="block text-xs font-normal text-fg-subtle">{ad.work_times.map((w) => label(WORK_TIME, w)).join(", ")}</span>
        ) : null}
      </Fact>
      <Fact icon={<Briefcase />} label="Līmenis / pieredze">
        {label(SENIORITY, ad.seniority)}
        <span className="block text-xs font-normal text-fg-subtle">
          {ad.experience_years_min != null ? `vismaz ${ad.experience_years_min} g. pieredze` : "pieredze nav norādīta"}
        </span>
      </Fact>
      <Fact icon={<GraduationCap />} label="Izglītība">
        <span className="font-normal">{ad.education ?? "Nav norādīta"}</span>
      </Fact>
      <Fact icon={<Languages />} label="Valodas">
        {ad.languages_norm.length ? ad.languages_norm.map(langLabel).join(", ") : "Nav norādītas"}
      </Fact>
      <Fact icon={<CalendarClock />} label="Pieteikšanās termiņš">
        {date(ad.deadline)} <span className="font-normal text-fg-subtle">({relDays(ad.deadline)})</span>
      </Fact>
      <Fact icon={<Clock />} label="Atvērts">
        {ad.days_open != null ? `${ad.days_open} dienas` : "—"}
        <span className="block text-xs font-normal text-fg-subtle">kopš {date(ad.first_published_at)}</span>
      </Fact>
    </dl>
  );
}

// ---------------------------------------------------------------- AI extraction

function List({ items }: { items: string[] | null }) {
  if (items == null) return <p className="text-sm text-fg-subtle">AI apstrāde vēl notiek.</p>;
  if (!items.length) return <p className="text-sm text-fg-subtle">Sludinājuma tekstā nav atrasts.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((x, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-fg-subtle" aria-hidden />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

export function Skills({ ad }: { ad: Listing }) {
  if (!ad.skills?.length) return <p className="text-sm text-fg-subtle">{ad.enriched_at ? "Nav norādītas." : "AI apstrāde vēl notiek."}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ad.skills.map((s) => (
        <Badge key={s} tone="outline" className="py-1 text-[13px] font-normal text-fg">{s}</Badge>
      ))}
    </div>
  );
}

export function AiSummary({ ad, compact }: { ad: Listing; compact?: boolean }) {
  const pending = !ad.enriched_at;
  return (
    <Section
      title="AI izvilkums"
      icon={<Sparkles />}
      aside={<span className="text-[11px] text-fg-subtle">{pending ? "gaida apstrādi" : "automātiski, pārbaudīts pret tekstu"}</span>}
    >
      {ad.summary && <p className="mb-4 text-[15px] leading-relaxed">{ad.summary}</p>}
      <div className={cn("grid gap-6", !compact && "lg:grid-cols-3")}>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Pienākumi</h3>
          <List items={ad.responsibilities} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Prasības</h3>
          <List items={ad.requirements} />
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Piedāvājam</h3>
          <List items={ad.benefits} />
        </div>
      </div>
      {ad.enrich_error && <p className="mt-4 text-xs text-danger">Apstrādes kļūda: {ad.enrich_error}</p>}
    </Section>
  );
}

// ---------------------------------------------------------------- original text

export function AdText({ ad }: { ad: Listing }) {
  const sections = Array.isArray(ad.sections) ? ad.sections.filter((s) => s?.text) : [];
  const hasOcr = !!ad.ad_image_text;
  return (
    <Section title="Sludinājuma teksts" aside={<Badge tone="outline" className="font-normal">{AD_FORMAT[ad.ad_format] ?? ad.ad_format}</Badge>}>
      <div className="space-y-5">
        {sections.map((s, i) =>
          isPageText(s.title) ? (
            <details key={i} className="group rounded-md border border-border">
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-fg-muted hover:text-fg">
                {s.title} <span className="font-normal text-fg-subtle">— pilns teksts, var saturēt lapas navigāciju</span>
              </summary>
              <p className="whitespace-pre-line border-t border-border px-3 py-3 text-sm leading-relaxed text-fg-muted">{s.text}</p>
            </details>
          ) : (
            <div key={i}>
              {s.title && <h3 className="mb-1.5 text-sm font-semibold">{s.title}</h3>}
              <p className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">{s.text}</p>
            </div>
          ),
        )}
        {hasOcr && (
          <div>
            <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
              Teksts no attēla <Badge tone="neutral">mašīnlasīts (OCR)</Badge>
            </h3>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-mono text-xs leading-relaxed text-fg-muted">
              {ad.ad_image_text}
            </pre>
            <p className="mt-1 text-[11px] text-fg-subtle">Automātiski nolasīts no attēla – iespējamas kļūdas. Oriģinālu skatiet ekrānuzņēmumā.</p>
          </div>
        )}
        {!sections.length && !hasOcr && ad.description && (
          <div>
            <p className="mb-1 text-xs text-fg-subtle">Tikai meklēšanas fragments no cv.lv:</p>
            <p className="whitespace-pre-line text-sm text-fg-muted">{ad.description}</p>
          </div>
        )}
        {!sections.length && !hasOcr && !ad.description && (
          <p className="text-sm text-fg-subtle">{ad.visited_at ? "Teksts nav pieejams." : "Sludinājuma lapa vēl nav apmeklēta."}</p>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- timeline

type Ev = { at: string; label: string; detail?: string; future?: boolean };

export function Timeline({ ad, chain }: { ad: Listing; chain: Pick<Listing, "id" | "title" | "first_published_at" | "deadline" | "is_active">[] }) {
  const ev: Ev[] = [];
  if (ad.first_published_at) ev.push({ at: ad.first_published_at, label: "Pirmo reizi publicēts" });
  for (const r of Array.isArray(ad.renewal_dates) ? ad.renewal_dates : []) ev.push({ at: r, label: "Atjaunots" });
  if (ad.last_published_at && !(ad.renewal_dates ?? []).some((r) => r.slice(0, 10) === ad.last_published_at!.slice(0, 10)) && ad.last_published_at.slice(0, 10) !== ad.first_published_at)
    ev.push({ at: ad.last_published_at, label: "Pēdējo reizi atsvaidzināts" });
  ev.push({ at: ad.scraped_at, label: "Pamanīts mūsu sistēmā" });
  if (ad.visited_at) ev.push({ at: ad.visited_at, label: "Lapa apmeklēta", detail: "teksts un ekrānuzņēmums" });
  if (ad.deadline) ev.push({ at: ad.deadline, label: ad.is_active ? "Pieteikšanās termiņš" : "Termiņš beidzās", future: !!ad.is_active });
  ev.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Section title="Laika līnija" icon={<CalendarClock />}>
      <ol className="relative space-y-3 border-l border-border pl-4">
        {ev.map((e, i) => (
          <li key={i} className="relative">
            <span
              className={cn(
                "absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface",
                e.future ? "bg-surface-3 ring-1 ring-border-strong" : "bg-accent",
              )}
              aria-hidden
            />
            <p className="text-sm font-medium">{e.label}</p>
            <p className="text-xs text-fg-subtle">
              {e.at.length > 10 ? dateTime(e.at) : date(e.at)}
              {e.detail && ` · ${e.detail}`}
            </p>
          </li>
        ))}
      </ol>
      {ad.times_renewed > 0 && (ad.renewal_dates?.length ?? 0) <= 1 && ad.scraped_at < "2026-09-30" && (
        <p className="mt-3 text-[11px] text-fg-subtle">Atjaunošanas vēsture precīza tikai kopš 29.09.2026; „1×” nozīmē „vismaz vienreiz”.</p>
      )}
      {chain.length > 1 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Publicēts atkārtoti ({chain.length}×)</p>
          <ul className="space-y-1">
            {chain.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                {c.id === ad.id ? (
                  <span className="font-medium">{date(c.first_published_at)} · šis sludinājums</span>
                ) : (
                  <Link href={`/ads/${c.id}`} className="text-accent hover:underline">{date(c.first_published_at)} · {c.id.replace("cvlv:", "#")}</Link>
                )}
                <StatusPill isActive={c.is_active} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------- employer

export function Employer({ ad, aboutHtml }: { ad: Listing; aboutHtml: string }) {
  const emp = ad.detail_data?.employer;
  const keywords = ad.detail_data?.settings?.keywords?.map((k) => k.value).filter(Boolean) ?? [];
  const questions = ad.detail_data?.questions ?? [];
  if (!aboutHtml && !emp?.webpageUrl && !keywords.length && !questions.length) return null;
  return (
    <Section title="Darba devējs" icon={<Building2 />}>
      <div className="space-y-4">
        {aboutHtml && (
          <details className="group" open={aboutHtml.length < 600}>
            <summary className="cursor-pointer text-xs font-medium text-fg-muted hover:text-fg">Par uzņēmumu</summary>
            <div className="prose-lite mt-2 text-sm text-fg-muted" dangerouslySetInnerHTML={{ __html: aboutHtml }} />
          </details>
        )}
        {emp?.webpageUrl && /^https?:\/\//.test(emp.webpageUrl) && (
          <a href={emp.webpageUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
            <ExternalLink className="size-3.5" /> {emp.webpageUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}
        {questions.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Pieteikuma jautājumi</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-fg-muted">
              {questions.map((q, i) => (
                <li key={i}>
                  {q.value}
                  {q.mandatory && <span className="text-fg-subtle"> (obligāts)</span>}
                </li>
              ))}
            </ol>
          </div>
        )}
        {keywords.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Atslēgvārdi</p>
            <div className="flex flex-wrap gap-1">
              {keywords.map((k) => <Badge key={k} tone="neutral" className="font-normal">{k}</Badge>)}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------- related ads

export function SimilarAds({ items }: { items: SimilarListing[] }) {
  return (
    <Section title="Līdzīgi sludinājumi" icon={<Sparkles />}>
      {items.length === 0 ? (
        <p className="text-sm text-fg-subtle">Līdzīgu sludinājumu nav atrasts.</p>
      ) : (
        <ul className="-my-2 divide-y divide-border">
          {items.map((s) => {
            const reason = s.shared_skills.length
              ? `kopīgas prasmes: ${s.shared_skills.slice(0, 4).join(", ")}${s.shared_skills.length > 4 ? "…" : ""}`
              : s.title_sim >= 0.3 ? "līdzīgs amata nosaukums" : "tā pati joma un līmenis";
            return (
              <li key={s.id} className="py-2">
                <Link href={`/ads/${s.id}`} className="group block">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug group-hover:text-accent group-hover:underline">{s.title}</p>
                    <span className="shrink-0 text-[11px] tabular-nums text-fg-subtle" title="Līdzības rādītājs">{Math.round(s.score * 100)}%</span>
                  </div>
                  <p className="truncate text-xs text-fg-muted">
                    {s.company} · {salary(s.salary_from, s.salary_to, s.salary_period)}
                    {!s.is_active && " · neaktīvs"}
                  </p>
                  <p className="truncate text-[11px] text-fg-subtle">{reason}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

export function CompanyAds({ company, items }: { company: string; items: ListingRow[] }) {
  if (!items.length) return null;
  return (
    <Section
      title={`Citi ${company} sludinājumi`}
      icon={<Building2 />}
      aside={
        <Link href={`/ads?status=all&company=${encodeURIComponent(company)}`} className="text-xs text-accent hover:underline">
          Visi
        </Link>
      }
    >
      <ul className="-my-2 divide-y divide-border">
        {items.map((r) => (
          <li key={r.id} className="py-2">
            <Link href={`/ads/${r.id}`} className="group flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-snug group-hover:text-accent group-hover:underline">{r.title}</span>
                <span className="block text-xs text-fg-muted">{salary(r.salary_from, r.salary_to, r.salary_period)} · {date(r.first_published_at)}</span>
              </span>
              <StatusPill isActive={r.is_active} />
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------- tech

export function TechInfo({ ad }: { ad: Listing }) {
  const e = ad.enrichment;
  const dropped = e?.dropped_ungrounded ? Object.entries(e.dropped_ungrounded).filter(([, n]) => n > 0) : [];
  return (
    <details className="rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer px-4 py-2.5 text-xs font-medium text-fg-subtle hover:text-fg">Tehniskā informācija</summary>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-xs">
        <dt className="text-fg-subtle">ID</dt><dd className="font-mono">{ad.id}</dd>
        <dt className="text-fg-subtle">Kategorija (meklēšana)</dt><dd>{catLabel(ad.category)}</dd>
        <dt className="text-fg-subtle">Formāts</dt><dd>{AD_FORMAT[ad.ad_format]}</dd>
        <dt className="text-fg-subtle">cv.lv skatījumi</dt><dd>{ad.views ?? "—"} <span className="text-fg-subtle">(uz {date(ad.visited_at)})</span></dd>
        <dt className="text-fg-subtle">AI modelis</dt><dd>{ad.enrich_model ?? "—"} · {dateTime(ad.enriched_at)}</dd>
        <dt className="text-fg-subtle">Teksta apjoms</dt><dd>{e?.source_chars != null ? `${e.source_chars} zīmes${e.source_chars < 300 ? " (maz teksta)" : ""}` : "—"}</dd>
        <dt className="text-fg-subtle">Izmesti neapstiprināti</dt><dd>{dropped.length ? dropped.map(([k, n]) => `${k}: ${n}`).join(", ") : "nav"}</dd>
      </dl>
    </details>
  );
}
