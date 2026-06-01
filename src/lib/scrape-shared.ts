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
 *
 * Residual risk — DNS rebinding (acknowledged, not exploitable here):
 *
 *   This is a hostname-string check, not a resolve-then-pin-IP check.
 *   In a Node.js / VPC-resident service the correct mitigation is
 *   `dns.promises.lookup()` followed by fetching the resolved IP with
 *   the original Host header (or a custom HTTP agent's `lookup`
 *   callback). Neither is available in the Cloudflare Workers
 *   runtime: there is no `dns` module and `fetch` exposes no DNS
 *   hook.
 *
 *   The exposure is bounded by what the Worker can reach. Cloudflare's
 *   edge has no VPC, doesn't peer with EC2/GCE metadata IPs
 *   (169.254.169.254), and can't route RFC1918 — so a rebinding
 *   attack against `evil.example.com → 192.168.1.1` produces a
 *   no-route failure, not an internal hit. Upstream services
 *   (Supabase, Firecrawl, Jina, SerpApi) are public hostnames behind
 *   auth, not private-IP targets.
 *
 *   This string check is therefore defence-in-depth — it catches the
 *   obvious cases (literal `localhost`, fat-fingered RFC1918
 *   hostnames) — and the additional DNS-pinning step is omitted
 *   intentionally because the runtime doesn't permit it AND there
 *   is no reachable internal surface to defend.
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
