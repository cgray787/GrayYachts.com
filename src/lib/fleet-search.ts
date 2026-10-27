/** Fleet URLs retain only recognized filter values; unknown options cannot hide all boats. */
export const FLEET_SORTS = [
  "Featured", "Price: Low to High", "Price: High to Low", "Length: Small to Large",
  "Length: Large to Small", "Year: Newest", "Year: Oldest",
] as const;
export type FleetSort = (typeof FLEET_SORTS)[number];
const FILTER_KEYS = ["price", "length", "year", "location", "type"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
export type FleetSearch = Record<FilterKey, string | null> & { query: string; sort: FleetSort };
export type FleetChoices = Record<FilterKey, readonly string[]>;
export const DEFAULT_FLEET_SORT: FleetSort = "Price: High to Low";

export function readFleetSearch(params: URLSearchParams, choices: FleetChoices): FleetSearch {
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => {
    const value = params.get(key);
    return [key, value && choices[key].includes(value) ? value : null];
  })) as Record<FilterKey, string | null>;
  const sort = params.get("sort");
  return {
    ...filters,
    query: (params.get("q") ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 160),
    sort: FLEET_SORTS.includes(sort as FleetSort) ? sort as FleetSort : DEFAULT_FLEET_SORT,
  };
}

/** Preserve unrelated campaign parameters, omit defaults, and replace duplicate fleet keys. */
export function writeFleetSearch(params: URLSearchParams, state: FleetSearch): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of FILTER_KEYS) {
    next.delete(key);
    if (state[key]) next.set(key, state[key]);
  }
  next.delete("q");
  if (state.query) next.set("q", state.query);
  next.delete("sort");
  if (state.sort !== DEFAULT_FLEET_SORT) next.set("sort", state.sort);
  return next;
}

/** Shown to the visitor and included in the existing inquiry form's vessel context. */
export function fleetRequirements(state: FleetSearch): string {
  const parts = [state.query.trim() ? `Search: ${state.query.trim()}` : null,
    state.price ? `Price: ${state.price}` : null,
    state.length ? `Length: ${state.length}` : null,
    state.year ? `Year: ${state.year}` : null,
    state.location ? `Location: ${state.location}` : null,
    state.type ? `Type: ${state.type}` : null];
  return parts.filter(Boolean).join("; ") || "Help finding the right yacht";
}
