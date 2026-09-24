import fs from 'node:fs/promises';
import sharp from 'sharp';
const read = async name => JSON.parse(await fs.readFile(`content/seo/${name}.json`, 'utf8'));
const brands = await read('brands');
const shows = await read('shows');
const articles = (await read('articles')).filter(a => a.status === 'published');
const brandPhotos = await read('brand-images');
const showPhotos = Object.fromEntries((await read('show-images')).map(p => [p.showId,p]));
const articlePhotos = await read('article-images');
const entries = [
  ...brands.map(b => [b.id,brandPhotos[b.id]]),
  ...shows.map(s => [s.id,showPhotos[s.id]]),
  ...articles.map(a => [a.slug,articlePhotos[a.slug]]),
];
for (const [id,photo] of entries) {
  if (!photo?.url || !photo.alt?.trim()) throw Error(`${id}: missing photo or alt text`);
  if (!photo.url.startsWith('/') || photo.url.includes('..')) throw Error(`${id}: expected local image`);
  const bytes = await fs.readFile(`public${photo.url}`);
  const metadata = await sharp(bytes).metadata();
  if (!['jpeg','png','webp','avif'].includes(metadata.format)) throw Error(`${id}: must use a photograph, got ${metadata.format}`);
  if (Math.max(metadata.width,metadata.height) < 600 || Math.min(metadata.width,metadata.height) < 300) throw Error(`${id}: image is too small`);
  await sharp(bytes).raw().toBuffer(); // Decode pixels, not just HTTP/header validation.
}
console.log(`PASS: ${brands.length} brands, ${shows.length} shows and ${articles.length} articles have decodable photographs and alt text.`);

if (process.argv.includes('--live')) {
  const base = 'https://grayyachts.com';
  const get = async url => {
    const r = await fetch(url, {signal:AbortSignal.timeout(30000)});
    if (!r.ok) throw Error(`${url}: HTTP ${r.status}`);
    return r;
  };
  const archive = await (await get(`${base}/newsletter`)).text();
  const issues = [...new Set(Array.from(archive.matchAll(/href="(\/newsletter\/[^"#?]+)"/g), m => m[1]))];
  const paths = ['/newsletter','/brands','/boat-shows','/insights',...articles.map(a => `/insights/${a.slug}`),...issues];
  const assets = new Set();
  for (const path of paths) {
    const html = path === '/newsletter' ? archive : await (await get(base+path)).text();
    const images = Array.from(html.matchAll(/<img\b[^>]*>/g), m => m[0]);
    const photos = images.filter(i => !i.includes('/brand/logo'));
    if (!photos.length) throw Error(`${path}: no photograph rendered`);
    for (const image of photos) {
      const src = image.match(/src="([^"]+)"/)?.[1];
      const alt = image.match(/alt="([^"]*)"/)?.[1];
      if (!src || !alt?.trim()) throw Error(`${path}: missing image src or alt`);
      assets.add(new URL(src.replaceAll('&amp;','&'),base).href);
    }
  }
  for (const url of assets) {
    const r = await get(url);
    if (!r.headers.get('content-type')?.startsWith('image/')) throw Error(`${url}: not an image response`);
    const bytes = Buffer.from(await r.arrayBuffer());
    const metadata = await sharp(bytes).metadata();
    if (metadata.format === 'svg') throw Error(`${url}: graphic instead of photograph`);
    await sharp(bytes).raw().toBuffer();
  }
  console.log(`PASS: ${paths.length} live pages, ${issues.length} newsletter posts, ${assets.size} image URLs downloaded and decoded.`);
}
