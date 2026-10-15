import { describe, expect, it } from 'vitest';
import { removedPublicPaths, sitemapUrls } from './public-route-guard';

describe('public route deployment guard', () => {
  it('blocks the observed regression even when every fleet page survives', () => {
    const live = ['/fleet/poulsbo', '/insights', '/insights/flibs-2026-preview', '/yachts/sirena-48'];
    expect(removedPublicPaths(live.map(p => `https://grayyachts.com${p}`), ['https://grayyachts.com/fleet/poulsbo']))
      .toEqual(['/insights', '/insights/flibs-2026-preview', '/yachts/sirena-48']);
  });
  it('allows additions and treats the two root URL spellings as the same page', () => {
    expect(removedPublicPaths(['https://grayyachts.com/'], ['https://grayyachts.com', 'https://grayyachts.com/insights'])).toEqual([]);
  });
  it('fails closed on failed, empty or unrelated sitemap responses', () => {
    for (const xml of ['<html>Error</html>', '<urlset></urlset>', '<urlset><url><loc>https://other.example/</loc></url></urlset>']) {
      expect(() => sitemapUrls(xml)).toThrow();
    }
    expect(sitemapUrls('<urlset><url><loc>https://grayyachts.com/insights</loc></url></urlset>')).toEqual(['https://grayyachts.com/insights']);
  });
});
