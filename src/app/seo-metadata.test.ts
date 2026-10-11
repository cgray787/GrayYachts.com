import {describe,it,expect} from 'vitest';
import type {Metadata} from 'next';
import {vessels} from '@/lib/fleet';
import {metadata as home} from './(marketing)/page';
import {metadata as fleet} from './(marketing)/fleet/layout';
import {metadata as catalog} from './(marketing)/catalog/layout';
import {metadata as compare} from './(marketing)/compare/layout';
import {metadata as auth} from './(auth)/layout';
import {generateMetadata as listing} from './(marketing)/fleet/[slug]/page';

const pages: [string, Metadata, string][] = [['/', home, '/'], ['/fleet', fleet, '/fleet'], ['/catalog', catalog, '/catalog'], ['/compare', compare, '/compare']];

describe('public page metadata', () => {
  it('gives each public page its own title and description', () => {
    const titles = pages.map(([, m]) => String(m.title));
    const descriptions = pages.map(([, m]) => String(m.description));
    expect(new Set(titles).size).toBe(pages.length);
    expect(new Set(descriptions).size).toBe(pages.length);
    for (const t of titles) expect(t).toContain('Gray Yachts');
  });
  it('sets a self-referencing canonical on each public page', () => {
    for (const [, m, path] of pages) expect(m.alternates?.canonical).toBe(path);
  });
  it('targets broker searches on the homepage', () => {
    expect(String(home.title).toLowerCase()).toContain('yacht broker');
    expect(String(home.title)).toContain('Seattle');
  });
  it('gives every listing its own canonical instead of inheriting /fleet', async () => {
    for (const v of vessels.filter(v => v.slug)) {
      const m = await listing({params: Promise.resolve({slug: v.slug as string})});
      expect(m.alternates?.canonical).toBe(`/fleet/${v.slug}`);
    }
  });
  it('keeps the login page out of search results', () => {
    expect(auth.robots).toMatchObject({index: false});
  });
});
