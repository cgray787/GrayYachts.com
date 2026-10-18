// Tell IndexNow engines (Bing, which feeds ChatGPT search and Copilot, plus Yandex and others)
// about every URL in both sitemaps. Run after a deploy: node scripts/indexnow.mjs
// The key file public/6beee40210853b84841b603b53a4a7f7.txt proves ownership; it is meant to be public.
const SITE = 'https://grayyachts.com';
const KEY = '6beee40210853b84841b603b53a4a7f7';
const urls = new Set();
for (const map of ['/sitemap.xml', '/newsletter/sitemap.xml']) {
  const xml = await (await fetch(SITE + map)).text();
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
}
const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: 'grayyachts.com', key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: [...urls] }),
});
console.log(`IndexNow: submitted ${urls.size} URLs, HTTP ${res.status} ${res.statusText}`);
if (res.status >= 400) { console.log(await res.text()); process.exit(1); }
