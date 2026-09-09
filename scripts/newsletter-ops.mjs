// Machine-local secret provisioning and an authenticated run of the due issue.
// This script never prints credentials or review tokens.
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,createHmac} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const dir=join(homedir(),'.config','grayyachts');
const path=join(dir,'newsletter-automation-secret');
const action=process.argv[2];
if(action==='configure') {
 mkdirSync(dir,{recursive:true,mode:0o700});
 if(!existsSync(path))writeFileSync(path,randomBytes(32).toString('hex'),{mode:0o600});
 const result=spawnSync('node_modules/.bin/wrangler',['secret','put','NEWSLETTER_AUTOMATION_SECRET'],{input:readFileSync(path,'utf8'),encoding:'utf8'});
 if(result.status!==0) {console.error('Secret upload failed. Verify Cloudflare authentication.');process.exit(1);}
 console.log('Newsletter signing secret configured; credential remains machine-local.');
} else if(action==='run' || action==='status') {
 const response=await fetch('https://grayyachts.com/api/newsletter/run',{method:action==='run'?'POST':'GET',headers:{authorization:`Bearer ${readFileSync(path,'utf8').trim()}`},signal:AbortSignal.timeout(420000)});
 console.log('Run HTTP status:',response.status);
 console.log(await response.text());
 if(!response.ok)process.exit(1);
 } else if(action==='images') {
 const payload=readFileSync(process.argv[3],'utf8');
 const response=await fetch('https://grayyachts.com/api/newsletter/images',{method:'POST',headers:{authorization:`Bearer ${readFileSync(path,'utf8').trim()}`,'content-type':'application/json'},body:payload});
 console.log(response.status,await response.text());if(!response.ok)process.exit(1);
 } else if(action==='library') {
 const response=await fetch('https://grayyachts.com/api/newsletter/images',{headers:{authorization:`Bearer ${readFileSync(path,'utf8').trim()}`}});
 if(!response.ok)throw new Error(`Library HTTP ${response.status}`);
 const library=await response.json();const photos=library.available.filter(p=>p.license==='Pexels License');
 const results=await Promise.all(photos.map(async p=>{const r=await fetch(`https://grayyachts.com${p.url}`);return {photo:p.sourceAssetId,status:r.status,type:r.headers.get('content-type')};}));
 console.log(JSON.stringify({unused_total:library.available.length,licensed_photos:photos.length,results}));
 if(results.some(r=>r.status!==200||!r.type?.startsWith('image/')))process.exit(1);
} else if(action==='verify') {
 const {chromium}=await import('playwright');
 const {default:assert}=await import('node:assert/strict');
 const secret=readFileSync(path,'utf8').trim();
 const status=await (await fetch('https://grayyachts.com/api/newsletter/run',{headers:{authorization:`Bearer ${secret}`}})).json();
 const issue=status.issues.find(i=>i.status==='pending' && i.title);
 assert.ok(issue,'A pending draft is required for this read-only verification');
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  assert.equal((await page.goto('https://grayyachts.com/newsletter')).status(),200);
  await page.getByRole('heading',{name:'Your next chapter on the water.'}).waitFor();
  assert.equal(await page.locator(`a[href="/newsletter/${issue.slug}"]`).count(),0);
  const output=join(homedir(),'.config','grayyachts','newsletter-checks');mkdirSync(output,{recursive:true,mode:0o700});
  await page.screenshot({path:join(output,'live-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  await page.screenshot({path:join(output,'live-mobile.png'),fullPage:true});
  assert.equal((await page.request.get(`https://grayyachts.com/newsletter/${issue.slug}`)).status(),404);
  assert.ok(!(await (await page.request.get('https://grayyachts.com/newsletter/sitemap.xml')).text()).includes(issue.slug));
  const token=createHmac('sha256',secret).update(`newsletter-review:${issue.id}${issue.review_revision?`:r${issue.review_revision}`:''}`).digest('hex');
  assert.equal((await page.goto(`https://grayyachts.com/newsletter/review/${issue.id}?token=${token}`)).status(),200);
  await page.getByRole('button',{name:'Approve & publish'}).waitFor();
  await page.getByRole('button',{name:'Reject draft'}).waitFor();
  const images=JSON.parse(issue.images||'[]');
  assert.ok(images.length>=2 && images.length<=3);
  assert.equal(await page.locator('[data-newsletter-image]').count(),images.length);
  for(const photo of images)assert.equal((await page.request.get(`https://grayyachts.com${photo.url}`)).status(),200);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
  await page.screenshot({path:join(output,'live-review.png'),fullPage:true});
  console.log('PASS: live desktop/mobile archive, private draft, sitemap exclusion and approval page. No publication action taken.');
 } finally {await browser.close();}
} else {
 console.error('Usage: node scripts/newsletter-ops.mjs configure|run|status|library|verify|images payload.json');process.exit(2);
}
