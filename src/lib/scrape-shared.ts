/**
 * Shared regex helpers used by the scrape provider chain and the image
 * proxy. Filters out the obvious non-yacht photos (logos, sprites,
 * favicons, generic share images, social-platform default cards).
 */
export const GENERIC_IMAGE_RE =
  /logo|icon|sprite|placeholder|default|share[-_]?image|favicon|avatar|spacer|pixel|map|watermark/i;

/**
 * Reject hostnames that resolve to internal/loopback/link-local space.
 * Used by both `/api/yacht-image` (input URL) AND each provider before
 * fetching a downstream URL — an attacker who controls the listing
 * page's `<meta og:image>` could otherwise point us at AWS metadata
 * (169.254.169.254), localhost, or RFC1918 ranges.
 */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^169\.254\./.test(h) || // link-local incl. AWS / GCE metadata
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(h) || // CGNAT
    /^0\./.test(h) ||
    h === "[::1]" ||
    h === "::1" ||
    h.startsWith("[fc") || // ULA fc00::/7
    h.startsWith("[fd") ||
    h.startsWith("[fe80:") // link-local IPv6
  );
}

/**
 * Validate a URL is safe to fetch from the worker — public HTTP(S)
 * only, no private/loopback/link-local hosts. Returns the parsed URL
 * on success, throws on rejection.
 */
export function assertPublicHttpUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Disallowed protocol: ${url.protocol}`);
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error(`Disallowed host: ${url.hostname}`);
  }
  return url;
}
