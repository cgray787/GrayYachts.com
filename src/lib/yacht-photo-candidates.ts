import { assertPublicHttpUrl, GENERIC_IMAGE_RE } from './scrape-shared';

export function blockedListingPage(html: string): boolean {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]
    ?? /^Title:\s*(.*)$/im.exec(html)?.[1] ?? html.slice(0, 180);
  return /access denied|just a moment|page not found|captcha|security check|403 forbidden|404 not found|attention required/i.test(title)
    || /cf-challenge|Target URL returned error/i.test(html);
}

export function normalizePhotoUrl(raw: string | null | undefined, listing: string): string | null {
  if (!raw) return null;
  try {
    const decoded = raw.replace(/&amp;|&#0*38;|&#x0*26;/gi, '&').trim();
    const url = new URL(decoded, listing);
    // Repair only our own known historical metadata error. Never fetch localhost.
    if (url.hostname === 'localhost' && ['grayyachts.com', 'www.grayyachts.com'].includes(new URL(listing).hostname)
      && url.pathname.startsWith('/listings/')) {
      url.hostname = 'grayyachts.com'; url.port = ''; url.protocol = 'https:';
    }
    assertPublicHttpUrl(url.href);
    if (GENERIC_IMAGE_RE.test(url.href) || /screenshot|firecrawl|unsplash/i.test(url.href)) return null;
    return url.href;
  } catch { return null; }
}

/** Ordered candidates from the listing itself; never model-search or stock photos. */
export function photosFromHtml(html: string, listing: string): string[] {
  if (blockedListingPage(html)) return [];
  const found: string[] = [];
  const add = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const url = normalizePhotoUrl(raw, listing);
    if (url && !found.includes(url)) found.push(url);
  };
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/i.test(tag))
      add(/content=["']([^"']+)["']/i.exec(tag)?.[1]);
  }
  const walk = (node: unknown, image = false) => {
    if (typeof node === 'string') { if (image) add(node); return; }
    if (Array.isArray(node)) { node.forEach(value => walk(value, image)); return; }
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'image' || key === 'photo' || key === 'contentUrl'
        || (key === 'url' && (image || obj['@type'] === 'ImageObject'))) walk(value, true);
      else if (typeof value === 'object') walk(value);
    }
  };
  for (const script of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(script[1])); } catch { /* malformed metadata */ }
  }
  // Gallery images only; avoid unrelated navigation and recommendation thumbnails.
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/hero|gallery|listing|vessel|yacht|boat|carousel/i.test(tag)) continue;
    const source = /(?:data-src|data-original)=["']([^"']+)["']/i.exec(tag)?.[1]
      ?? /\bsrc=["']([^"']+)["']/i.exec(tag)?.[1];
    add(source);
  }
  return found.slice(0, 12);
}

export function canonicalListingUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/$/, '') || '/';
  url.searchParams.sort();
  return url.href;
}
