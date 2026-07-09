/**
 * Instant skeleton shown while a portal tab's server component renders.
 *
 * Portal pages are dynamically rendered (auth needs cookies), so every tab
 * click blocks on a fresh server render (auth + Supabase queries). Without a
 * loading boundary the UI froze on the *previous* page until that render
 * finished — the main reason switching tabs felt slow. This paints
 * immediately and also gives <Link> prefetch a boundary to warm.
 *
 * It renders inside the padded <main> from (portal)/layout.tsx, so it needs
 * no outer padding of its own.
 */
export default function PortalLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-hidden="true">
      {/* Header */}
      <div className="space-y-3">
        <div className="h-7 w-56 rounded-md bg-white/10" />
        <div className="h-4 w-80 max-w-full rounded bg-white/5" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="h-4 w-20 rounded bg-white/10" />
            <div className="mt-4 h-8 w-16 rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Content rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
    </div>
  );
}
