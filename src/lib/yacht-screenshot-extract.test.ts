import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: vi.fn() }));
import { extractScreenshots } from './yacht-screenshot-extract';
import { listingFromScrapeResult, type ScrapeResult } from './yacht-catalog';
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe('screenshot specification import', () => {
  it('sends multiple images and leaves missing specifications unknown', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    const fetcher = vi.fn(async () => Response.json({ content: [{ type: 'text', text: JSON.stringify({ name: '2007 Sabre 34', builder: 'Sabre', year: 2007, lengthFt: 34, cabins: 1, price: 'US$200,000', priceNum: 200000, engineHours: 'made up', maxSpeed: -5, warnings: ['Photos of sistership', 'sistership/stock photos', 42, '', 'x'.repeat(501)] }) }] }));
    vi.stubGlobal('fetch', fetcher);
    const source = { type: 'base64' as const, media_type: 'image/png' as const, data: 'test' };
    const result = await extractScreenshots([source, source]);
    expect(result?.name).toBe('2007 Sabre 34'); expect(result?.year).toBe(2007);
    expect(result?.engineHours).toBeNull(); expect(result?.maxSpeed).toBeNull(); expect(result?.range).toBeNull(); expect(result?.warnings).toEqual(['Photos of sistership']);
    const body = JSON.parse((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.messages[0].content.filter((item: { type: string }) => item.type === 'image')).toHaveLength(2);
    const yacht = listingFromScrapeResult({ ...result, imageUrl: '/api/yacht-image?id=test', source: 'Screenshots', url: 'https://broker.example/boat' } as ScrapeResult, 'https://broker.example/boat');
    expect(yacht.cabins).toBe('1 cabin'); expect(yacht.range).toBe('N/A');
  });
  it('uses the account-bound fallback when the primary provider rejects billing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('billing', { status: 400 })));
    const run = vi.fn(async () => ({ response: { name: '2007 Sabre 34', builder: 'Sabre', year: 2007 } }));
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: { AI: { run } } } as never);
    expect((await extractScreenshots([{ type: 'base64', media_type: 'image/png', data: 'test' }]))?.year).toBe(2007);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('reads source notices separately and excludes advertising text', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    const reply = (data: unknown) => Response.json({content:[{type:'text',text:JSON.stringify(data)}]});
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(reply({name:'Test boat',warnings:['sistership/stock photos']}))
      .mockResolvedValueOnce(reply({notices:['Photos of Sistership','All in a sandwich']})));
    const image = {type:'base64' as const,media_type:'image/png' as const,data:'test'};
    expect((await extractScreenshots([image,image]))?.warnings).toEqual(['Photos of Sistership']);
  });
  it.each([[5, 5], [3362, 3414]])('keeps per-engine hours separate: %s and %s', async (first, second) => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({content:[{type:'text',text:JSON.stringify({name:'Test boat',engineHours: first + second, engineHoursByEngine:[first,second],warnings:['Engine hours differ incorrectly']})}]})));
    const result = await extractScreenshots([{type:'base64',media_type:'image/png',data:'test'}]);
    expect(result?.engineHours).toBe(first === second ? first : null);
    expect(result?.warnings?.length).toBe(first === second ? 0 : 1);
  });
  it('does not fabricate data when vision is unavailable or unreadable', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Unavailable', { status: 503 })));
    expect(await extractScreenshots([{ type: 'url', url: 'https://broker.example/photo.png' }])).toBeNull();
    expect(await extractScreenshots([])).toBeNull();
  });
});
