"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

export type Job = {
  id: string;
  status: string;
  scheduled_date: string | null; // legacy date column
  scheduled_start: string | null; // new timestamptz column (Marine Tech App writes)
  scheduled_end_date: string | null;
  created_at: string;
  service_types: string[] | null;
  service_descriptions: Record<string, string> | null;
  notes: string | null;
  customers: { name: string | null } | null;
  boats: { name: string | null; make: string | null; model: string | null } | null;
  profiles: { full_name: string | null } | null;
};

// "When was this job scheduled?" — prefer the new timestamptz; fall back to
// the legacy date column. Returns 'YYYY-MM-DD' or null.
function jobScheduledDate(j: { scheduled_start: string | null; scheduled_date: string | null }): string | null {
  if (j.scheduled_start) return j.scheduled_start.slice(0, 10);
  return j.scheduled_date;
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-300",
  in_progress: "bg-amber-500/15 text-amber-300",
  completed: "bg-emerald-500/15 text-emerald-300",
};

/** A work-area photo a tech shot on the job from the field app. */
export type JobPhoto = {
  id: string;
  job_id: string | null;
  photo_url: string;
  caption: string | null;
};

export function JobsList({
  jobs,
  photos = {},
}: {
  jobs: Job[];
  photos?: Record<string, JobPhoto[]>;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (q ? jobs.filter((j) => (j.customers?.name ?? "").toLowerCase().includes(q)) : jobs),
    [jobs, q]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
          aria-label="Search clients"
          className="w-full rounded-xl border border-border bg-bg-card py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-gold focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-text-secondary">
            {q ? `No jobs for a client matching “${query.trim()}”.` : "No jobs found."}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((j) => {
              const boatLabel = j.boats?.name
                ? j.boats.name
                : [j.boats?.make, j.boats?.model].filter(Boolean).join(" ") || "Unknown vessel";
              return (
                <li key={j.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          STATUS_STYLES[j.status] ?? "bg-slate-700/40 text-slate-300"
                        }`}
                      >
                        {j.status.replace("_", " ")}
                      </span>
                      <p className="truncate font-medium text-text-primary">{boatLabel}</p>
                    </div>
                    <p className="mt-1 truncate text-sm text-text-secondary">
                      {[
                        j.customers?.name,
                        j.profiles?.full_name && `Tech: ${j.profiles.full_name}`,
                        j.service_types?.length && j.service_types.join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {j.service_descriptions && Object.keys(j.service_descriptions).length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(j.service_descriptions).map(([service, desc]) => (
                          <li key={service} className="truncate text-xs text-text-secondary/80">
                            <span className="text-text-secondary">{service}:</span> {desc}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-text-secondary">
                    <time className="block">{new Date(j.created_at).toLocaleDateString()}</time>
                    {(() => {
                      const start = jobScheduledDate(j);
                      if (!start) return null;
                      const end = j.scheduled_end_date;
                      const fmt = (d: string) =>
                        new Date(`${d}T12:00:00Z`).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        });
                      return (
                        <span className="mt-0.5 block text-gold">
                          {end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start)}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Photos the tech took at the boat. They appear here as soon
                      as the phone uploads them — same rows the dashboard reads. */}
                  {(photos[j.id]?.length ?? 0) > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {photos[j.id].map((p) => (
                        <a
                          key={p.id}
                          href={p.photo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={p.caption ?? "Photo from the field"}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.photo_url}
                            alt={p.caption ?? "Work area photo"}
                            loading="lazy"
                            className="h-16 w-16 rounded-lg border border-border object-cover transition-opacity hover:opacity-80"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
