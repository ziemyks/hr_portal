import type { NextRequest } from "next/server";
import { parseFilters } from "@/lib/filters";
import { exportAds } from "@/lib/queries";
import { todayRiga } from "@/lib/format";

const COLUMNS: [string, (r: Awaited<ReturnType<typeof exportAds>>[number]) => unknown][] = [
  ["id", (r) => r.id],
  ["amats", (r) => r.title],
  ["uznemums", (r) => r.company],
  ["kategorija", (r) => r.category],
  ["statuss", (r) => (r.is_active ? "aktīvs" : "neaktīvs")],
  ["pilseta", (r) => r.town],
  ["darba_veids", (r) => r.work_mode],
  ["limenis", (r) => r.seniority],
  ["alga_no", (r) => r.salary_from],
  ["alga_lidz", (r) => r.salary_to],
  ["alga_periods", (r) => r.salary_period],
  ["prasmes", (r) => (r.skills ?? []).join("; ")],
  ["pirmo_reizi_publicets", (r) => r.first_published_at],
  ["termins", (r) => r.deadline],
  ["atverts_dienas", (r) => r.days_open],
  ["atkartots", (r) => (r.is_repeating ? "jā" : "nē")],
  ["publicets_reizes", (r) => r.times_posted],
  ["atjaunots_reizes", (r) => r.times_renewed],
  ["skatijumi", (r) => r.views],
  ["kopsavilkums", (r) => r.summary],
  ["saite", (r) => r.url],
];

function cell(v: unknown) {
  if (v == null) return "";
  const s = String(v);
  // Quote always; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const filters = parseFilters(req.nextUrl.searchParams);
  const rows = await exportAds(filters);
  const lines = [COLUMNS.map(([h]) => h).join(","), ...rows.map((r) => COLUMNS.map(([, f]) => cell(f(r))).join(","))];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sludinajumi-${todayRiga()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
