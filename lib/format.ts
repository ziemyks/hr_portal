import { SALARY_PERIOD } from "./labels";

const TZ = "Europe/Riga";
const nf = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 2 });

export const num = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));

export function money(n: number | null | undefined, period?: string | null) {
  if (n == null) return "—";
  return `€ ${(period === "HOURLY" ? nf2 : nf).format(n)}`;
}

/** "€ 3 000–4 500 /mēn." — single amount (from = to) shows as "no € 3 000". */
export function salary(from: number | null, to: number | null, period: string | null) {
  if (from == null && to == null) return "Nav norādīts";
  const f = period === "HOURLY" ? nf2 : nf;
  const p = period ? ` ${SALARY_PERIOD[period] ?? period}` : "";
  if (from != null && to != null && from !== to) return `€ ${f.format(from)}–${f.format(to)}${p}`;
  return `no € ${f.format((from ?? to)!)}${p}`;
}

export const basisLabel = (basis: string | null, explicit = false) =>
  basis === "net" ? "neto" : explicit ? "bruto" : "bruto (pieņemts)";

/** Date-only strings (YYYY-MM-DD) are Riga calendar dates; timestamps are UTC. */
function toDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00Z`) : new Date(v);
}

export function date(v: string | null | undefined) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("lv-LV", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(toDate(v));
}

export function dateTime(v: string | null | undefined) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("lv-LV", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(toDate(v));
}

/** Today's Riga calendar date as YYYY-MM-DD. */
export function todayRiga() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** YYYY-MM-DD shifted by n calendar days. */
export function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

/** "pirms 3 d.", "šodien", "pēc 5 d." relative to today (Riga). */
export function relDays(v: string | null | undefined) {
  if (!v) return "—";
  const d = daysBetween(todayRiga(), v.slice(0, 10));
  if (d === 0) return "šodien";
  if (d === -1) return "vakar";
  if (d === 1) return "rīt";
  return d < 0 ? `pirms ${-d} d.` : `pēc ${d} d.`;
}

/** HR digest style: "publicēts 2× · atjaunots 1× · atvērts 70 d." */
export function repeatTooltip(r: { times_posted?: number | null; times_renewed?: number | null; days_open?: number | null }) {
  const parts = [`publicēts ${r.times_posted ?? 1}×`];
  if (r.times_renewed) parts.push(`atjaunots ${r.times_renewed}×`);
  if (r.days_open != null) parts.push(`atvērts ${r.days_open} d.`);
  return parts.join(" · ");
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);


/** Duration as "45 min", "3 h 10 min", "2 d. 4 h". */
export function duration(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d} d. ${h % 24} h` : `${d} d.`;
}

/** Riga weekday + time, e.g. "pirmd., 09:00". */
export function weekdayTime(v: string) {
  return new Intl.DateTimeFormat("lv-LV", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}
