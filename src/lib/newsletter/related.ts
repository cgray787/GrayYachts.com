import type { Issue } from './core';

type Summary = Pick<Issue, 'slug' | 'status' | 'title' | 'excerpt' | 'audience' | 'published_at'>;
const commonWords = new Set('about after before could first from gray guide have into more next should that their these they this what when where which with would your yacht yachts boat boats buying selling buyer buyers seller sellers'.split(' '));
function topics(issue: Summary) {
  return new Set(`${issue.title} ${issue.excerpt}`.toLowerCase().match(/[a-z]{4,}/g)?.filter(word => !commonWords.has(word)) ?? []);
}

/** Uses only existing public summaries; never exposes draft content or mutates query results. */
export function relatedIssues<T extends Summary>(current: Summary, candidates: readonly T[], limit = 3): T[] {
  const subject = topics(current);
  const seen = new Set<string>([current.slug]);
  return candidates.filter(issue => {
    if (issue.status !== 'published' || !issue.published_at || !Number.isFinite(Date.parse(issue.published_at)) || seen.has(issue.slug)) return false;
    seen.add(issue.slug);
    return true;
  }).map(issue => ({
    issue,
    audience: Number(issue.audience === current.audience),
    overlap: [...topics(issue)].filter(word => subject.has(word)).length,
  })).sort((a, b) => b.audience - a.audience || b.overlap - a.overlap || Date.parse(b.issue.published_at!) - Date.parse(a.issue.published_at!) || a.issue.slug.localeCompare(b.issue.slug))
    .slice(0, Math.max(0, Math.floor(limit)))
    .map(({ issue }) => issue);
}
