"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Parse a YYYY-MM-DD string into a local Date (no timezone shift).
function parseISO(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

// Format a Date back into YYYY-MM-DD (local).
function toISO(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DateFieldWithCalendar({
  name,
  defaultValue,
  required = false,
  clearable = false,
  ariaLabel,
}: {
  name: string;
  defaultValue: string;
  required?: boolean;
  clearable?: boolean;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  // Month currently shown in the grid (anchored to the selected day, else today).
  const initialMonth = parseISO(defaultValue) ?? new Date();
  const [viewMonth, setViewMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Outside-click + Escape to close.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPopover() {
    const anchor = parseISO(value) ?? new Date();
    setViewMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1));
    setOpen(true);
  }

  function pickDay(d: Date) {
    setValue(toISO(d));
    setOpen(false);
  }

  const today = new Date();
  const selected = parseISO(value);
  const firstWeekday = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  ).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative mt-1">
        {/* Real input keeps the form-field name so the server action still receives it. */}
        <input
          type="date"
          name={name}
          value={value}
          required={required}
          aria-label={ariaLabel}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 pr-9 text-sm text-text-primary focus:border-gold focus:outline-none [&::-webkit-calendar-picker-indicator]:opacity-0"
        />
        <button
          type="button"
          aria-label="Open calendar"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openPopover())}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-text-secondary transition-colors hover:text-gold"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 z-[60] mt-1 w-64 rounded-lg border border-border bg-bg-primary p-2 shadow-2xl"
        >
          <div className="flex items-center justify-between px-1 pb-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
                )
              }
              className="rounded p-1 text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-gold"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-text-primary">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setViewMonth(
                  new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
                )
              }
              className="rounded p-1 text-text-secondary transition-colors hover:bg-bg-card-hover hover:text-gold"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 px-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-text-secondary/70"
              >
                {w}
              </div>
            ))}
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} />;
              const isToday = sameDay(d, today);
              const isSelected = selected ? sameDay(d, selected) : false;
              return (
                <button
                  key={toISO(d)}
                  type="button"
                  onClick={() => pickDay(d)}
                  aria-pressed={isSelected}
                  aria-label={toISO(d)}
                  className={[
                    "flex h-7 w-7 items-center justify-center rounded text-xs transition-colors",
                    isSelected
                      ? "bg-gold font-medium text-bg-primary"
                      : isToday
                        ? "border border-gold/60 text-gold hover:bg-bg-card-hover"
                        : "text-text-primary hover:bg-bg-card-hover",
                  ].join(" ")}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {clearable && (
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <button
                type="button"
                onClick={() => {
                  setValue("");
                  setOpen(false);
                }}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-gold"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
