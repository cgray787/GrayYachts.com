import { it, expect, vi } from 'vitest';
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: vi.fn() }));
import { capturedYacht } from './captured-yacht';
import { photoKey } from './yacht-photo-store';
import { canonicalListingUrl } from './yacht-photo-candidates';
const url = 'https://www.yachtworld.com/yacht/example-123/';
const imageId = 'a'.repeat(64);
const data = {url,name:'Example yacht',builder:'Builder',capturedAt:'2026-09-22T12:00:00Z',imageUrl:`/api/yacht-image?id=${imageId}`,flags:['Photos of sistership']};
it('recovers an exact captured listing including durable photo and dated warning', async () => {
 const key = `captured-listings/${await photoKey(canonicalListingUrl(url))}.json`;
 const bucket = {get:vi.fn(async (k:string)=> k===key ? {arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(data)).buffer} : k===imageId ? {arrayBuffer:async()=>new ArrayBuffer(1)} : null),put:vi.fn()};
 const result=await capturedYacht(bucket,url+'?utm_source=phone');
 expect(result?.name).toBe(data.name);
 expect(result?.flags?.[0]).toContain('2026-09-22');
 expect(result?.flags).toContain('Photos of sistership');
 expect(result?.confidence).toBe('low');
 expect(await capturedYacht(bucket,'https://www.yachtworld.com/yacht/other-456/')).toBeNull();
});
it('rejects a mismatched listing or missing photo rather than showing the wrong boat',async()=>{
 const get=vi.fn(async (_key:string)=>({arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({...data,url:'https://example.com/other'})).buffer}));
 expect(await capturedYacht({get,put:vi.fn()},url)).toBeNull();
 get.mockImplementation(async key => key===imageId ? null as never : {arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(data)).buffer});
 expect(await capturedYacht({get,put:vi.fn()},url)).toBeNull();
});
