import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PageHeader } from "@/components/page-header";
import { Ago } from "@/components/status/ago";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { dateTime, duration, num, weekdayTime } from "@/lib/format";
import { getFreshness, GRACE_MIN, HISTORY_DAYS, JITTER_MIN, SCRAPE_HOURS } from "@/lib/freshness";

export const metadata: Metadata = { title: "Datu statuss" };
// Always live: this page reports how stale everything else is.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const f = await getFreshness();
  const now = new Date(f.now).getTime();
  const lagMs = f.lastActivity ? now - new Date(f.lastActivity).getTime() : null;
  const inWindow =
    f.prevSlot != null &&
    now < new Date(f.prevSlot).getTime() + GRACE_MIN * 60000 &&
    (!f.lastActivity || f.lastActivity < f.prevSlot);

  const state =
    f.lastActivity == null
      ? { tone: "danger" as const, icon: XCircle, label: "Nav datu", text: "Datubāzē nav neviena konveijera ieraksta." }
      : f.missedSlots === 0
        ? inWindow
          ? { tone: "accent" as const, icon: Clock, label: "Gaida palaišanu", text: `Plānotā palaišana ${weekdayTime(f.prevSlot!)} vēl var notikt (sākums +0–${JITTER_MIN} min).` }
          : { tone: "ok" as const, icon: CheckCircle2, label: "Aktuāli", text: "Pēdējā plānotā palaišana ir atstājusi ierakstus." }
        : f.missedSlots <= 2
          ? { tone: "warn" as const, icon: AlertTriangle, label: "Iespējama kavēšanās", text: `${f.missedSlots} plānotā(-s) palaišana(-s) bez neviena ieraksta. Tas var nozīmēt arī to, ka jaunu sludinājumu nebija.` }
          : { tone: "danger" as const, icon: XCircle, label: "Dati kavējas", text: `${f.missedSlots} plānotās palaišanas pēc kārtas bez neviena ieraksta – visticamāk, konveijers nedarbojas.` };
  const StateIcon = state.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Datu statuss"
        description="Kad konveijers pēdējo reizi ierakstīja datus un cik liela ir nobīde no šī brīža. Lapa netiek kešota; nobīde atjaunojas ik pēc 30 s."
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-muted">Pēdējā datu ielāde</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">
              <Ago at={f.lastActivity} serverNow={f.now} />
            </p>
            <p className="mt-1 text-sm text-fg-subtle">
              {dateTime(f.lastActivity)}
              {lagMs != null && <> · nobīde {duration(lagMs)}</>}
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <Badge tone={state.tone} className="px-2 py-1 text-sm [&_svg]:size-4">
              <StateIcon /> {state.label}
            </Badge>
            <p className="text-xs text-fg-subtle">
              Nākamā plānotā: {weekdayTime(f.nextSlot)} (<Ago at={f.nextSlot} serverNow={f.now} />)
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-fg-muted">{state.text}</p>
      </Card>

      <section aria-label="Pēdējie ieraksti pa posmiem" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Jauns sludinājums saskrāpēts" value={<Ago at={f.lastScraped} serverNow={f.now} />} sub={dateTime(f.lastScraped)} />
        <StatTile label="Sludinājuma lapa apmeklēta" value={<Ago at={f.lastVisited} serverNow={f.now} />} sub={dateTime(f.lastVisited)} />
        <StatTile label="LLM apstrāde" value={<Ago at={f.lastEnriched} serverNow={f.now} />} sub={dateTime(f.lastEnriched)} />
        <StatTile label="Jaunākā publicēšana cv.lv" value={<Ago at={f.lastPublished} serverNow={f.now} />} sub={`${dateTime(f.lastPublished)} · avota laiks`} />
      </section>

      <section aria-label="Rinda" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Gaida lapas apmeklējumu" value={num(f.pendingVisit)} sub="nav detaļu / ekrānuzņēmuma" />
        <StatTile label="Gaida LLM apstrādi" value={num(f.pendingEnrich)} sub="kopsavilkums, prasmes u. c." />
        <StatTile label="Apstrādes kļūdas" value={num(f.enrichErrors)} sub={f.enrichErrors ? "tiks mēģināts atkārtoti" : "nav"} />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={`Palaišanas pēdējās ${HISTORY_DAYS} dienās`} description="Ieraksti, kas sagrupēti pēc laika (atstarpe > 40 min = jauna palaišana)" />
          <div className="p-4 pt-3">
            {f.runs.length === 0 ? (
              <p className="text-sm text-fg-muted">Šajā periodā nav neviena ieraksta.</p>
            ) : (
              <div className="max-h-[28rem] overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Konveijera palaišanas</caption>
                  <thead className="sticky top-0 bg-surface-2 text-xs">
                    <tr>
                      {["Sākums", "Ilgums", "Jauni", "Apmeklēti", "Apstrādāti"].map((h, i) => (
                        <th key={h} scope="col" className={`px-3 py-2 font-medium text-fg-muted ${i ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {f.runs.map((r) => (
                      <tr key={r.start} className="border-t border-border tabular-nums">
                        <td className="whitespace-nowrap px-3 py-1.5">{dateTime(r.start)}</td>
                        <td className="px-3 py-1.5 text-right text-fg-muted">{duration(new Date(r.end).getTime() - new Date(r.start).getTime())}</td>
                        <td className="px-3 py-1.5 text-right">{num(r.scraped)}</td>
                        <td className="px-3 py-1.5 text-right">{num(r.visited)}</td>
                        <td className="px-3 py-1.5 text-right">{num(r.enriched)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Grafiks" description="Laiki pēc Rīgas laika" />
          <div className="space-y-3 p-4 pt-3 text-sm text-fg-muted">
            <p>
              Darba dienās {SCRAPE_HOURS.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")} (+0–{JITTER_MIN} min nejauša sākuma nobīde):
              saskrāpēšana un LLM apstrāde. 17:00 papildu apstrāde.
            </p>
            <p>
              Palaišana tiek uzskatīta par izlaistu, ja {GRACE_MIN} min pēc plānotā laika nav neviena ieraksta. Svētku dienas netiek ņemtas vērā.
            </p>
            <p className="text-xs text-fg-subtle">
              Konveijers neglabā palaišanu žurnālu, tāpēc statuss balstās uz sludinājumu laikiem (saskrāpēts, apmeklēts, apstrādāts).
              Palaišana, kas neatrod nevienu jaunu sludinājumu, pēdas neatstāj.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
