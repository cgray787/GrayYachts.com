import {describe,it,expect} from 'vitest';
import sitemap from './sitemap';
import {vessels} from '@/lib/fleet';

describe('main sitemap',()=>{
 const urls=sitemap().map(s=>s.url);
 it('lists every vessel page, which all render from generateStaticParams',()=>{
  for(const v of vessels.filter(v=>v.slug))expect(urls).toContain(`https://grayyachts.com/fleet/${v.slug}`);
 });
 it('lists the core public pages',()=>{
  for(const p of ['','/fleet','/catalog','/compare','/marine-tech','/newsletter'])expect(urls).toContain(`https://grayyachts.com${p}`);
 });
 it('leaves out noindex and private pages',()=>{
  // /sell is deliberately noindex in public/sell.html; a sitemap must list only indexable pages.
  for(const bad of ['/sell','/portal','/api','/listings','/newsletter/review'])expect(urls.some(u=>u.replace('https://grayyachts.com','').startsWith(bad))).toBe(false);
 });
 it('has no duplicates and only canonical https URLs',()=>{
  expect(new Set(urls).size).toBe(urls.length);
  for(const u of urls)expect(u.startsWith('https://grayyachts.com')).toBe(true);
 });
});
