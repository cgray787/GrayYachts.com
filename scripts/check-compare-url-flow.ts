import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { listingFromScrapeResult, type ScrapeResult } from '../src/lib/yacht-catalog';
async function main() {
 const base=process.argv[2]??'http://localhost:3112';
 const live=process.argv.includes('--live');
 const browser=await chromium.launch();
 await mkdir('artifacts/catalog/url-flow',{recursive:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const old=[1,2].map(n=>listingFromScrapeResult({name:`Old saved yacht ${n}`,builder:'Old',year:2022,imageUrl:null} as ScrapeResult,`https://example.com/yacht/${n}`));
  await page.addInitScript(items=> { if(!localStorage.getItem('seeded')) {localStorage.setItem('gy-compare-catalog-v6',JSON.stringify(items));localStorage.setItem('gy-compare-slots',JSON.stringify({leftId:items[0].id,rightId:items[1].id}));localStorage.setItem('seeded','1');} },old);
  if(!live) await page.route('**/api/scrape-yacht?**',async route=> {
    const url=new URL(route.request().url()).searchParams.get('url')!;
    await new Promise(r=>setTimeout(r,url.includes('blocked')?50:250));
    await route.fulfill({status:url.includes('blocked')?502:200,contentType:'application/json',body:JSON.stringify(url.includes('blocked')?{error:'This site blocked automatic import.'}:{name:'2018 Lagoon 50',builder:'Lagoon',year:2018,imageUrl:'/api/yacht-image?id='+'a'.repeat(64)})});
  });
  await page.goto(base+'/compare');
  await page.getByPlaceholder('Paste first listing URL...').fill('https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/');
  await page.getByPlaceholder('Paste second listing URL...').fill('https://example.com/blocked');
  if(live) await page.route('**/api/scrape-yacht?**',async route=> {
    if(new URL(route.request().url()).searchParams.get('url')==='https://example.com/blocked') await route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({error:'This site blocked automatic import.'})});
    else await route.continue();
  });
  await page.getByRole('button',{name:'Compare',exact:true}).click();
  await page.waitForFunction(()=> {const slots=JSON.parse(localStorage.getItem('gy-compare-slots')??'{}');const items=JSON.parse(localStorage.getItem('gy-compare-catalog-v6')??'[]');return items.some((y:{id:string;builder:string})=>y.id===slots.leftId&&y.builder==='Lagoon') && slots.rightId==='';}, {}, {timeout:100000});
  await page.getByRole('alert').filter({hasText:'Yacht 2:'}).waitFor();
  assert.equal(await page.getByText('Side-by-side comparison',{exact:true}).count(),0);
  const catalog=await page.evaluate(()=>JSON.parse(localStorage.getItem('gy-compare-catalog-v6')!));
  assert.equal(catalog.length,3,'old saved yachts must not be deleted');
  if(live) {
    const yacht=catalog.find((y:{builder:string})=>y.builder==='Lagoon');
    assert.equal(yacht.source,'Saved capture');
    assert(yacht.flags.some((f:string)=>f.includes('saved capture from')));
    const img=page.locator(`img[src="${yacht.imageUrl}"]`).first();
    await img.scrollIntoViewIfNeeded();await img.evaluate((el:HTMLImageElement)=>el.decode());
    assert(await img.evaluate((el:HTMLImageElement)=>el.naturalWidth>100));
  }
  await page.screenshot({path:'artifacts/catalog/url-flow/'+(live?'production':'local')+'.png',fullPage:true});
  await page.reload();
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gy-compare-slots')!).rightId),'');
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log({status:'PASS',mode:live?'production Lagoon URL + simulated second failure':'simulated success + failure',staleSelectionCleared:true,catalogPreserved:true,reload:true,mobileLayout:true});
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
