import { Loader2 } from "lucide-react";

/**
 * Placeholder rendered by /compare and /catalog until the browser has
 * hydrated.
 *
 * Both tools keep their state in localStorage, which the server cannot see —
 * `loadCatalog()` returns the seed list on the server and the visitor's real
 * catalog in the browser. Rendering the live catalog straight away therefore
 * produced a hydration mismatch (React error #418) for anyone who had saved a
 * yacht, and React responds to that by throwing away the server HTML and
 * re-rendering the whole tree.
 *
 * The fix is to render something that does NOT depend on localStorage until
 * after mount. The `hydrated` flag is false during the server render *and* the
 * first client render, so the two agree and hydration succeeds; the effect then
 * flips it and the real tool renders. The heading stays server-rendered so the
 * page still has real content for crawlers and during the brief swap.
 */
export function ToolShell({
  title,
  description,
  maxWidth = "max-w-7xl",
}: {
  title: string;
  description: string;
  maxWidth?: string;
}) {
  return (
    <div className="min-h-screen bg-bg-primary">
      <div className={`mx-auto ${maxWidth} px-6 pb-24 pt-32 sm:px-10`}>
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-wide text-text-primary sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
          {description}
        </p>
        <div className="mt-16 flex items-center gap-3 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          Loading your catalog&hellip;
        </div>
      </div>
    </div>
  );
}
