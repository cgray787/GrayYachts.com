// Register existing brokerage photography by content, not filename.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const images=[];const seen=new Set();
for(const dir of readdirSync('public/listings',{withFileTypes:true}).filter(d=>d.isDirectory())) {
 for(const file of readdirSync(`public/listings/${dir.name}`).filter(f=>/\.(jpg|jpeg|png|webp)$/i.test(f)).sort()) {
  const url=`/listings/${dir.name}/${file}`;
  const id=createHash('sha256').update(readFileSync(`public${url}`)).digest('hex');
  if(seen.has(id))continue;seen.add(id);
  images.push({id,url,source:`https://grayyachts.com/fleet/${dir.name}`,label:`${dir.name.replaceAll('-',' ')} — ${file}`,credit:'Gray Yachts listing photo'});
 }
}
for(const photo of JSON.parse(readFileSync('docs/newsletter-licensed-images.json','utf8'))) {
 if(!photo.commercialUse || !photo.licenseUrl || !photo.source || !photo.photographer)throw new Error('Incomplete photo license record');
 const contentSha256=createHash('sha256').update(readFileSync(`public${photo.url}`)).digest('hex');
 // A source asset keeps its identity even if downloaded in a different size.
 const id=createHash('sha256').update(photo.sourceAssetId).digest('hex');
 if(seen.has(contentSha256)||seen.has(id))continue;
 seen.add(contentSha256);seen.add(id);
 images.push({...photo,id,contentSha256});
}
writeFileSync('src/lib/newsletter/image-catalog.json' ,JSON.stringify(images,null,2)+'\n');
console.log(`Registered ${images.length} unique images. Inspect photos before selection; never create variants to bypass reuse checks.`);
