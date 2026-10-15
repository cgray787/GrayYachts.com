const ORIGIN = 'https://grayyachts.com';

function canonicalPath(url: string) {
  const parsed = new URL(url);
  if (parsed.origin !== ORIGIN) throw new Error(`Unexpected sitemap origin: ${parsed.origin}`);
  return parsed.pathname.replace(/\/$/, '') || '/';
}

export function sitemapUrls(xml: string): string[] {
  if (!xml.includes('<urlset')) throw new Error('Public sitemap is not a URL set');
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(match => match[1].replace(/&amp;/g, '&'));
  if (!urls.length) throw new Error('Public sitemap contains no URLs');
  urls.forEach(canonicalPath);
  return urls;
}

export function removedPublicPaths(liveUrls: string[], buildUrls: string[]) {
  const build = new Set(buildUrls.map(canonicalPath));
  return [...new Set(liveUrls.map(canonicalPath))].filter(path => !build.has(path));
}
