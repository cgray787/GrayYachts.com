// Catalog and stored article sources can be attribution text, not URLs.
// Do not turn those labels into relative links (or permit non-web schemes).
export function photoSourceHref(source: string | undefined): string | undefined {
 const value = source?.trim();
 if (!value || !/^https?:\/\//i.test(value)) return undefined;
 try {
  const url = new URL(value);
  if (!url.hostname || url.username || url.password) return undefined;
  return url.href;
 } catch {
  return undefined;
 }
}
