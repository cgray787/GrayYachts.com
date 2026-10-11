import {describe,it,expect} from 'vitest';
import {articles,isPublished,articleSchema,jsonLd,publishedArticles,howThisWasMade,relatedLinks} from './editorial';
import sitemap from '@/app/sitemap';
describe('editorial publication boundary',()=>{
 it('excludes drafts, unreviewed posts and future posts from the sitemap',()=>{
  expect(publishedArticles()).toEqual(articles.filter(isPublished));
  const urls=sitemap().map(s=>s.url);
  for(const a of articles){
   const url=`https://grayyachts.com/insights/${a.slug}`;
   if(isPublished(a))expect(urls).toContain(url);
   else expect(urls).not.toContain(url);
  }
  const a={...articles[0],status:'published' as const,publishedAt:'2026-01-01',reviewedBy:'Connor Gray'};
  expect(isPublished(a)).toBe(true);
  expect(isPublished({...a,reviewedBy:null})).toBe(false);
  expect(isPublished({...a,publishedAt:'2999-01-01'})).toBe(false);
  expect(isPublished({...a,publishedAt:'not-a-date'})).toBe(false);
  expect(isPublished({...a,status:'draft'})).toBe(false);
 });
 it('does not let article text break out of JSON-LD script tags',()=>{
  const value={...articles[0],title:'A </script><script>alert(1)</script>'};
  const serialized=jsonLd(articleSchema(value));
  expect(serialized).not.toContain('</script>');
  expect(JSON.parse(serialized).headline).toBe(value.title);
 });
 it('includes core selling, research and real listing URLs',()=>{
  const urls=sitemap().map(s=>s.url);
  expect(urls).toContain('https://grayyachts.com/sell');
  expect(urls).toContain('https://grayyachts.com/brands');
  expect(urls.some(u=>u.includes('/fleet/'))).toBe(true);
  expect(new Set(urls).size).toBe(urls.length);
 });
 it('discloses AI assistance only on AI-assisted articles, with the real reviewer',()=>{
  const base={...articles[0],reviewedBy:'Connor Gray'};
  expect(howThisWasMade({...base,aiAssisted:undefined})).toBeNull();
  const note=howThisWasMade({...base,aiAssisted:true});
  expect(note).toContain('AI assistance');expect(note).toContain('Reviewed by Connor Gray');
  expect(howThisWasMade({...base,aiAssisted:true,reviewedBy:null})).toContain('not yet been reviewed');
 });
 it('renders only same-site internal links',()=>{
  const a={...articles[0],internalLinks:[{path:'/sell',anchor:'talk with Connor'},{path:'https://evil.example',anchor:'x'},{path:'//evil.example',anchor:'y'}]};
  expect(relatedLinks(a)).toEqual([{path:'/sell',anchor:'talk with Connor'}]);
  expect(relatedLinks({...articles[0],internalLinks:undefined})).toEqual([]);
 });
});

