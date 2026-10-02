import "server-only";
import { dbFresh } from "./supabase.server";

// Pipeline schedule (see blt-data-dictionary.md "Update cadence"): Mon–Fri scrape + enrich
// at 09:00, 12:00, 15:00 Riga with a 0–45 min random start. Holidays are not modelled.
export const SCRAPE_HOURS = [9, 12, 15];
const JITTER_MIN = 45;
// A run counts as missed once its window (start + jitter + time to finish) has passed.
const GRACE_MIN = 90;
const RUN_GAP_MIN = 40; // writes further apart than this belong to separate runs
const HISTORY_DAYS = 14;

const VIEW = "listings_portal";
const TZ = "Europe/Riga";

export type Run = { start: string; end: string; scraped: number; visited: number; enriched: number };

export type Freshness = {
  now: string;
  lastScraped: string | null;
  lastVisited: string | null;
  lastEnriched: string | null;
  lastPublished: string | null;
  lastActivity: string | null;
  pendingVisit: number;
  pendingEnrich: number;
  enrichErrors: number;
  prevSlot: string | null;
  nextSlot: string;
  missedSlots: number;
  runs: Run[];
};

/** UTC instant of a Riga wall-clock time (handles DST via the zone's offset on that day). */
function rigaInstant(ymd: string, hour: number) {
  const guess = new Date(`${ymd}T${String(hour).padStart(2, "0")}:00:00Z`);
  const off = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(guess)
    .find((p) => p.type === "timeZoneName")!.value; // "GMT+03:00"
  const m = off.match(/([+-])(\d{2}):(\d{2})/);
  const mins = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  return new Date(guess.getTime() - mins * 60000);
}

/** Scheduled run starts (UTC) from `days` days back to `days` days ahead, ascending. */
function scheduleSlots(now: Date, days: number) {
  const slots: Date[] = [];
  for (let i = -days; i <= days; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
    const wd = new Date(`${ymd}T12:00:00Z`).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    for (const h of SCRAPE_HOURS) slots.push(rigaInstant(ymd, h));
  }
  return slots;
}

/** Group pipeline writes into runs: consecutive timestamps less than RUN_GAP_MIN apart. */
function groupRuns(events: { at: number; kind: "scraped" | "visited" | "enriched" }[]): Run[] {
  events.sort((a, b) => a.at - b.at);
  const runs: { start: number; end: number; scraped: number; visited: number; enriched: number }[] = [];
  for (const e of events) {
    const cur = runs[runs.length - 1];
    if (!cur || e.at - cur.end > RUN_GAP_MIN * 60000) runs.push({ start: e.at, end: e.at, scraped: 0, visited: 0, enriched: 0 });
    const r = runs[runs.length - 1];
    r.end = e.at;
    r[e.kind]++;
  }
  return runs
    .reverse()
    .map((r) => ({ ...r, start: new Date(r.start).toISOString(), end: new Date(r.end).toISOString() }));
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`${what}: ${error?.message ?? "unknown error"}`);
}

// Always fresh (dbFresh): the point of this page is to show the current state, not a cached one.
async function latest(col: string) {
  const { data, error } = await dbFresh().from(VIEW).select(col).not(col, "is", null).order(col, { ascending: false }).limit(1);
  if (error) fail(`latest ${col}`, error);
  return ((data?.[0] as unknown as Record<string, string> | undefined)?.[col] ?? null);
}

async function countWhere(col: string, op: "null" | "notnull") {
  let q = dbFresh().from(VIEW).select("id", { count: "exact", head: true });
  q = op === "null" ? q.is(col, null) : q.not(col, "is", null);
  const { count, error } = await q;
  if (error) fail(`count ${col}`, error);
  return count ?? 0;
}

export async function getFreshness(): Promise<Freshness> {
  const now = new Date();
  const since = new Date(now.getTime() - HISTORY_DAYS * 86400000).toISOString();

  const [lastScraped, lastVisited, lastEnriched, lastPublished, pendingVisit, pendingEnrich, enrichErrors, recent] = await Promise.all([
    latest("scraped_at"),
    latest("visited_at"),
    latest("enriched_at"),
    latest("last_published_at"),
    countWhere("visited_at", "null"),
    countWhere("enriched_at", "null"),
    countWhere("enrich_error", "notnull"),
    dbFresh()
      .from(VIEW)
      .select("scraped_at,visited_at,enriched_at")
      .or(`scraped_at.gte.${since},visited_at.gte.${since},enriched_at.gte.${since}`)
      .limit(1000),
  ]);
  if (recent.error) fail("recent writes", recent.error);

  const events: { at: number; kind: "scraped" | "visited" | "enriched" }[] = [];
  for (const r of (recent.data ?? []) as Record<"scraped_at" | "visited_at" | "enriched_at", string | null>[]) {
    for (const [col, kind] of [["scraped_at", "scraped"], ["visited_at", "visited"], ["enriched_at", "enriched"]] as const) {
      const v = r[col];
      if (v && v >= since) events.push({ at: new Date(v).getTime(), kind });
    }
  }

  const lastActivity = [lastScraped, lastVisited, lastEnriched].filter(Boolean).sort().pop() ?? null;
  const lastMs = lastActivity ? new Date(lastActivity).getTime() : 0;

  const slots = scheduleSlots(now, 10);
  const past = slots.filter((s) => s.getTime() <= now.getTime());
  const nextSlot = slots.find((s) => s.getTime() > now.getTime())!;
  // Slots whose window has closed with no pipeline write since the slot started.
  const missedSlots = past.filter((s) => s.getTime() + GRACE_MIN * 60000 < now.getTime() && s.getTime() > lastMs).length;

  return {
    now: now.toISOString(),
    lastScraped,
    lastVisited,
    lastEnriched,
    lastPublished,
    lastActivity,
    pendingVisit,
    pendingEnrich,
    enrichErrors,
    prevSlot: past.length ? past[past.length - 1].toISOString() : null,
    nextSlot: nextSlot.toISOString(),
    missedSlots,
    runs: groupRuns(events),
  };
}

export { JITTER_MIN, GRACE_MIN, HISTORY_DAYS };
