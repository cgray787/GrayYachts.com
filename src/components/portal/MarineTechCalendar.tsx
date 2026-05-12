import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CalendarJob = {
  id: string;
  status: string;
  scheduled_date: string | null;
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
};

const STATUS_DOT: Record<string, string> = {
  new: "bg-blue-400",
  in_progress: "bg-amber-400",
  completed: "bg-emerald-400",
};

const STATUS_TINT: Record<string, string> = {
  new: "border-blue-400/30 bg-blue-500/10 text-blue-200 hover:bg-blue-500/15",
  in_progress: "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
  completed: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseMonth(value: string | undefined): { year: number; month0: number } {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (y >= 1970 && m >= 1 && m <= 12) return { year: y, month0: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month0: now.getMonth() };
}

function formatMonth(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}

function shiftMonth(year: number, month0: number, delta: number) {
  const d = new Date(year, month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

function boatLabel(j: CalendarJob): string {
  return (
    j.boats?.name ||
    [j.boats?.make, j.boats?.model].filter(Boolean).join(" ") ||
    j.customers?.name ||
    "Job"
  );
}

export function buildMonthRange(value: string | undefined): {
  start: string;
  end: string;
  year: number;
  month0: number;
} {
  const { year, month0 } = parseMonth(value);
  const start = new Date(year, month0, 1);
  const end = new Date(year, month0 + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    year,
    month0,
  };
}

export function MarineTechCalendar({
  jobs,
  monthParam,
}: {
  jobs: CalendarJob[];
  monthParam: string | undefined;
}) {
  const { year, month0 } = parseMonth(monthParam);

  const byDate = new Map<string, CalendarJob[]>();
  for (const j of jobs) {
    if (!j.scheduled_date) continue;
    const arr = byDate.get(j.scheduled_date) ?? [];
    arr.push(j);
    byDate.set(j.scheduled_date, arr);
  }

  const firstOfMonth = new Date(year, month0, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: new Date(year, month0, -startOffset + i + 1), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month0, d), inMonth: true });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, inMonth: next.getMonth() === month0 });
  }

  const todayISO = (() => {
    const t = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  })();

  const prev = shiftMonth(year, month0, -1);
  const next = shiftMonth(year, month0, +1);

  return (
    <div className="rounded-xl border border-border bg-bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
            Schedule
          </h2>
          <p className="text-xs text-text-secondary">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} scheduled this month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/portal/marine-tech?month=${formatMonth(prev.year, prev.month0)}`}
            scroll={false}
            aria-label="Previous month"
            className="rounded-lg border border-border bg-bg-primary p-1.5 text-text-secondary transition-colors hover:text-gold"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-[140px] text-center text-sm font-medium text-text-primary">
            {MONTHS[month0]} {year}
          </div>
          <Link
            href={`/portal/marine-tech?month=${formatMonth(next.year, next.month0)}`}
            scroll={false}
            aria-label="Next month"
            className="rounded-lg border border-border bg-bg-primary p-1.5 text-text-secondary transition-colors hover:text-gold"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/portal/marine-tech"
            scroll={false}
            className="ml-1 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-xs text-text-secondary transition-colors hover:text-gold"
          >
            Today
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border text-[11px] uppercase tracking-wide text-text-secondary">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const iso = (() => {
            const pad = (n: number) => String(n).padStart(2, "0");
            return `${cell.date.getFullYear()}-${pad(cell.date.getMonth() + 1)}-${pad(cell.date.getDate())}`;
          })();
          const dayJobs = byDate.get(iso) ?? [];
          const isToday = iso === todayISO;
          return (
            <div
              key={i}
              className={`min-h-[88px] border-b border-r border-border p-1.5 ${
                cell.inMonth ? "" : "bg-bg-primary/40"
              } ${(i + 1) % 7 === 0 ? "border-r-0" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <span
                  className={`text-[11px] ${
                    isToday
                      ? "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 font-semibold text-bg-primary"
                      : cell.inMonth
                      ? "text-text-secondary"
                      : "text-text-secondary/40"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                {dayJobs.length > 2 && (
                  <span className="text-[10px] text-text-secondary">
                    +{dayJobs.length - 2}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayJobs.slice(0, 2).map((j) => (
                  <Link
                    key={j.id}
                    href="/portal/marine-tech/jobs"
                    className={`flex items-center gap-1 truncate rounded border px-1.5 py-0.5 text-[11px] transition-colors ${
                      STATUS_TINT[j.status] ??
                      "border-slate-500/30 bg-slate-500/10 text-slate-200"
                    }`}
                    title={`${boatLabel(j)} · ${j.status.replace("_", " ")}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        STATUS_DOT[j.status] ?? "bg-slate-300"
                      }`}
                    />
                    <span className="truncate">{boatLabel(j)}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-border p-3 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400" /> New
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> In Progress
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Completed
        </span>
      </div>
    </div>
  );
}
