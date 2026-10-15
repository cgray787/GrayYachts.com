import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import sitemap from './sitemap';
import {vessels} from '@/lib/fleet';

describe('main sitemap',()=>{
 const urls=sitemap().map(s=>s.url);
 it('lists every vessel page, which all render from generateStaticParams',()=>{
  for(const v of vessels.filter(v=>v.slug))expect(urls).toContain(`https://grayyachts.com/fleet/${v.slug}`);
 });
 it('lists the core public pages, including the seller valuation page',()=>{
  for(const p of ['','/sell','/fleet','/catalog','/compare','/marine-tech','/newsletter'])expect(urls).toContain(`https://grayyachts.com${p}`);
 });
 it('leaves out private pages',()=>{
  for(const bad of ['/portal','/api','/listings','/newsletter/review','/login'])expect(urls.some(u=>u.replace('https://grayyachts.com','').startsWith(bad))).toBe(false);
 });
 it('keeps /sell indexable with a canonical so ad aliases like /valuation count as one page',()=>{
  const html=readFileSync('public/sell.html','utf8');
  expect(html).not.toMatch(/name="robots" content="[^"]*noindex/);
  expect(html).toContain('<link rel="canonical" href="https://grayyachts.com/sell">');
  expect(html).toMatch(/<title>What Is My Boat Worth\?/);
 });
 it('has no duplicates and only canonical https URLs',()=>{
  expect(new Set(urls).size).toBe(urls.length);
  for(const u of urls)expect(u.startsWith('https://grayyachts.com')).toBe(true);
 });
 it('restores the 15 non-fleet pages reported by Search Console on October 15',()=>{
  const paths = ['/about-connor-gray','/boat-shows','/brands','/insights',
   '/insights/boat-brands-to-watch-pacific-northwest','/insights/boot-dusseldorf-2027-guide',
   '/insights/cannes-2026-catamaran-announcements','/insights/flibs-2026-preview',
   '/insights/international-boat-shows-owner-guide','/insights/monaco-yacht-show-2026-owner-questions',
   '/insights/palm-beach-2027-planning','/insights/sell-my-boat-seattle',
   '/yachts','/yachts/pershing-6x','/yachts/sirena-48'];
  for(const path of paths)expect(urls).toContain(`https://grayyachts.com${path}`);
 });
});
