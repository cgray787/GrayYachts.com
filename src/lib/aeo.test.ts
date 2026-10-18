import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { faqSchema } from './search-metadata';
import { GET } from '@/app/llms.txt/route';

describe('answer engine support', () => {
  it('builds FAQPage data from visible Q&A, and nothing for an empty list', () => {
    expect(faqSchema([])).toBeNull();
    const s = faqSchema([{ question: 'Q?', answer: 'A.' }])!;
    expect(s['@type']).toBe('FAQPage');
    expect(s.mainEntity[0]).toMatchObject({ '@type': 'Question', name: 'Q?', acceptedAnswer: { text: 'A.' } });
  });
  it('serves llms.txt with services, areas, guides and listings', async () => {
    const text = await GET().text();
    for (const h of ['# Gray Yachts', '## Services', '## Areas served', '## Guides', '## Boats currently listed']) expect(text).toContain(h);
    expect(text).toContain('https://grayyachts.com/locations/washington');
  });
  it('publishes the IndexNow key file the submit script names', () => {
    const key = readFileSync('scripts/indexnow.mjs', 'utf8').match(/const KEY = '([0-9a-f]{32})'/)![1];
    expect(existsSync(`public/${key}.txt`)).toBe(true);
    expect(readFileSync(`public/${key}.txt`, 'utf8')).toBe(key);
  });
});
