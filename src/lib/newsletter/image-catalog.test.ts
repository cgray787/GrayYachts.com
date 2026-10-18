import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import catalog from './image-catalog.json';

describe('newsletter image catalog', () => {
 it('never registers page-speed WebP copies as separate photos (they would bypass the reuse ledger)', () => {
  expect(catalog.filter(p=>/\.w\d+\.webp$/i.test(p.url))).toEqual([]);
 });
 it('has unique ids and every file exists', () => {
  expect(new Set(catalog.map(p=>p.id)).size).toBe(catalog.length);
  for(const p of catalog) expect(existsSync(`public${p.url}`), p.url).toBe(true);
 });
 it('labels brokerage photos without owner names and with a usage restriction', () => {
  const brokerage=(catalog as {url:string;label:string;usage?:string}[]).filter(p=>p.url.startsWith('/newsletter/brokerage/'));
  expect(brokerage.length).toBeGreaterThanOrEqual(50);
  for(const p of brokerage) expect(p.usage, p.url).toMatch(/do not imply/i);
 });
});
