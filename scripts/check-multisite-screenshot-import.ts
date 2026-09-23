/** Acceptance against live extraction/storage; requires captured source screenshots in artifacts/catalog. */
import { chromium, devices } from 'playwright';
import { strict as assert } from 'node:assert';
import { writeFile } from 'node:fs/promises';
const cases = [
 {site:'YachtWorld',folder:'lagoon-9727102',url:'https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/',specs:['info','description','engines','specifications'],year:2018,price:566246,builder:'Lagoon',warning:/Read from listing screenshots/i},
 {site:'BoatTrader',folder:'multisite/boattrader',url:'https://www.boattrader.com/boat/2023-axopar-37-xc-cross-cabin-9589437/',specs:['title','spec0','spec1','spec2'],year:2023,price:339000,builder:'Axopar',warning:/sistership/i},
 {site:'boats.com',folder:'multisite/boats',url:'https://www.boats.com/power-boats/2023-axopar-37-xc-cross-cabin-9589437/',specs:['spec0','spec1','spec2','spec3'],year:2023,price:339000,builder:'Axopar',warning:/sistership/i},
 {site:'Denison',folder:'multisite/denison',url:'https://www.denisonyachtsales.com/yachts-for-sale/37-axopar-XXVIII',specs:['title','spec0','spec1','spec2'],year:2021,price:290000,builder:'Axopar',warning:/off.market/i},
];
async function main(){
 const base=process.argv[2]??'https://grayyachts.com';const browser=await chromium.launch();
 const results=[];
 try{
  for(const c of cases){
   const context=await browser.newContext({...devices['iPhone 13']});const p=await context.newPage();
   const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));
   const folder='artifacts/catalog/'+c.folder+'/';
   try{
    await p.goto(base+'/compare');await p.getByRole('button',{name:'Import from listing screenshots',exact:true}).click();
    await p.getByLabel('Original listing URL').fill(c.url);
    await p.getByLabel('Boat photo screenshot').setInputFiles(folder+'photo.png');
    await p.getByLabel('Specification screenshots').setInputFiles(c.specs.map(n=>folder+n+'.png'));
    const response=p.waitForResponse(r=>r.url().includes('/api/import-yacht-screenshots')&&r.request().method()==='POST',{timeout:100000});
    await p.getByRole('button',{name:'Read screenshots and add yacht'}).click();
    const res=await response;const data=await res.json();
    await writeFile(folder+'extracted.json',JSON.stringify(data,null,2));
    assert.equal(res.status(),200,JSON.stringify(data));assert.equal(data.year,c.year);assert.equal(data.priceNum,c.price);assert.equal(data.builder,c.builder);
    assert(c.warning.test(data.flags.join(' ')),'Missing visible qualifier: '+JSON.stringify(data.flags));
    if(c.site==='BoatTrader') assert.equal(data.maxSpeed,56);
    if(c.site==='Denison') assert.equal(data.maxSpeed,null,'Cruising speed must not become maximum speed');
    if(c.site==='boats.com') assert(!/hours differ/.test(data.flags.join(' ')),'Equal engine hours are not a conflict');
    if(c.site==='YachtWorld') assert(!/sistership|stock photos/i.test(data.flags.join(' ')), 'Do not copy example caveats into a listing');
    if(c.site==='YachtWorld') assert(data.engineHours === null || data.engineHours === 3362, 'Only the first engine hours are fully visible in the captured viewport');
    const link=await p.getByLabel('Saved yacht link').inputValue();
    // New browser storage: proves the link doesn't depend on the capture device.
    const phone=await browser.newContext({...devices['iPhone 13']});const fresh=await phone.newPage();
    await fresh.goto(link);await fresh.waitForFunction(()=>Array.from(document.querySelectorAll('img')).some(i=>i.src.includes('/api/yacht-image?id=')&&i.naturalWidth>100));
    await fresh.reload();await fresh.waitForFunction(()=>Array.from(document.querySelectorAll('img')).some(i=>i.src.includes('/api/yacht-image?id=')&&i.naturalWidth>100));
    assert(await fresh.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
    const photo=await fresh.request.get(base+data.imageUrl);assert.equal(photo.headers()['x-image-provider'],'r2-saved-photo');assert((await photo.body()).length>1000);
    await fresh.screenshot({path:folder+'verified-mobile.png',fullPage:true});await phone.close();
    const result={site:c.site,status:'PASS',link,year:data.year,price:data.price,flags:data.flags,imageUrl:data.imageUrl};results.push(result);console.log(JSON.stringify(result));
   }catch(e){const result={site:c.site,status:'FAIL',error:String(e)};results.push(result);console.log(JSON.stringify(result));}
   finally{await context.close();}
  }
 }finally{await browser.close();}
 await writeFile('artifacts/catalog/multisite/results.json',JSON.stringify(results,null,2));
 assert(results.every(r=>r.status==='PASS'),'Some source imports failed; see results.json');
}
main().catch(e=>{console.error(e);process.exit(1);});
