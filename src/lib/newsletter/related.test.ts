import { describe, expect, it } from 'vitest';
import { relatedIssues } from './related';

function issue(slug: string, overrides = {}) {
  return { slug, status: 'published' as const, audience: 'buyer' as const, title: 'Yacht guide', excerpt: '', published_at: '2026-10-20T12:00:00Z', ...overrides };
}
const current = issue('current', { title: 'Preparing for a marine survey', excerpt: 'Survey inspections and maintenance records.' });
describe('related newsletter editions', () => {
  it('ranks matching audience and subject ahead of newer unrelated editions', () => {
    const relevant = issue('survey', { title: 'Understanding survey inspections', published_at: '2026-09-01T00:00:00Z' });
    const recent = issue('recent', { title: 'Winter destinations' });
    const seller = issue('seller', { audience: 'seller', title: 'Survey inspections' });
    expect(relatedIssues(current, [recent, seller, relevant]).map(i => i.slug)).toEqual(['survey', 'recent', 'seller']);
  });
  it('fills remaining slots with newest editions and breaks ties deterministically', () => {
    const list = [issue('z'), issue('old', { published_at: '2026-09-01' }), issue('a'), issue('new', { published_at: '2026-10-21' })];
    expect(relatedIssues(current, list).map(i => i.slug)).toEqual(['new', 'a', 'z']);
    expect(list.map(i => i.slug)).toEqual(['z', 'old', 'a', 'new']);
  });
  it('excludes the current edition, duplicates, drafts and unusable publication dates', () => {
    const list = [current, issue('draft', { status: 'pending' }), issue('missing', { published_at: null }), issue('invalid', { published_at: 'bad' }), issue('safe'), issue('safe')];
    expect(relatedIssues(current, list).map(i => i.slug)).toEqual(['safe']);
  });
  it('does not mistake common brokerage words for a related subject', () => {
    expect(relatedIssues(current, [issue('older', { title: 'Your yacht buying guide', published_at: '2026-09-01' }), issue('newer')]).map(i => i.slug)).toEqual(['newer', 'older']);
  });
  it('handles empty input and explicit limits', () => {
    expect(relatedIssues(current, [])).toEqual([]);
    expect(relatedIssues(current, [issue('one')], 0)).toEqual([]);
    expect(relatedIssues(current, [issue('one'), issue('two')], 1)).toHaveLength(1);
  });
});
