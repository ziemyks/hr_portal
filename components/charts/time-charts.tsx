"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { catLabel } from "@/lib/labels";

const nf = new Intl.NumberFormat("lv-LV");
const dFmt = (v: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("lv-LV", { ...opts, timeZone: "UTC" }).format(new Date(`${v}T00:00:00Z`));
const shortDate = (v: string) => dFmt(v, { day: "2-digit", month: "2-digit" });
const longDate = (v: string) => dFmt(v, { day: "numeric", month: "long", year: "numeric" });

const axis = { stroke: "var(--chart-axis)", tick: { fill: "var(--chart-ink)", fontSize: 11 }, tickLine: false } as const;

function Tip({ active, payload, label, title }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string }[];
  label?: string;
  title: (l: string) => string;
}) {
  if (!active || !payload?.length || !label) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-fg">{title(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-fg-muted">
          <span className="size-2 rounded-sm" style={{ background: p.color }} aria-hidden />
          <span className="flex-1">{p.name}</span>
          <span className="font-medium tabular-nums text-fg">{nf.format(p.value ?? 0)}</span>
        </p>
      ))}
      {payload.length > 1 && (
        <p className="mt-1 flex justify-between border-t border-border pt-1 text-fg-muted">
          Kopā <span className="font-medium tabular-nums text-fg">{nf.format(total)}</span>
        </p>
      )}
    </div>
  );
}

/** Single series: open ads per day (reconstructed from publish date..deadline). */
export function OpenByDayChart({ data }: { data: { day: string; n: number }[] }) {
  const last = data.at(-1);
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 40, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="day" {...axis} tickFormatter={shortDate} minTickGap={32} />
          <YAxis {...axis} axisLine={false} allowDecimals={false} width={48} tickFormatter={(v) => nf.format(v)} />
          <Tooltip
            content={<Tip title={longDate} />}
            cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="n"
            name="Aktīvi sludinājumi"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="var(--chart-wash)"
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--chart-1)" }}
            dot={false}
            isAnimationActive={false}
            label={(p: { index?: number; x?: number | string; y?: number | string }) =>
              p.index === data.length - 1 && last ? (
                <text key="end" x={Number(p.x ?? 0) + 6} y={Number(p.y ?? 0) + 4} fontSize={12} fontWeight={600} fill="var(--fg)">
                  {nf.format(last.n)}
                </text>
              ) : (
                <g key={p.index} />
              )
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const CATS = ["INFORMATION_TECHNOLOGY", "BANKING_INSURANCE"] as const;
const CAT_COLOR: Record<string, string> = {
  INFORMATION_TECHNOLOGY: "var(--chart-1)",
  BANKING_INSURANCE: "var(--chart-2)",
};

/** Stacked weekly columns, two fixed series (colour follows the category, never rank). */
export function WeeklyNewChart({ data }: { data: { week: string; category: string; n: number }[] }) {
  const weeks = [...new Set(data.map((d) => d.week))].sort();
  const rows = weeks.map((w) => {
    const r: Record<string, number | string> = { week: w };
    for (const c of CATS) r[c] = data.find((d) => d.week === w && d.category === c)?.n ?? 0;
    return r;
  });
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-fg-muted" aria-hidden>
        {CATS.map((c) => (
          <span key={c} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: CAT_COLOR[c] }} /> {catLabel(c)}
          </span>
        ))}
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="week" {...axis} tickFormatter={shortDate} minTickGap={16} />
            <YAxis {...axis} axisLine={false} allowDecimals={false} width={48} />
            <Tooltip content={<Tip title={(w) => `Nedēļa no ${longDate(w)}`} />} cursor={{ fill: "var(--surface-2)" }} />
            {CATS.map((c, i) => (
              <Bar
                key={c}
                dataKey={c}
                name={catLabel(c)}
                stackId="a"
                fill={CAT_COLOR[c]}
                maxBarSize={24}
                stroke="var(--surface)"
                strokeWidth={1}
                radius={i === CATS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
