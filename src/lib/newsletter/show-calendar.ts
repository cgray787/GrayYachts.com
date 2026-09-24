import shows from '../../../content/seo/shows.json';

// Registry dates are leads for research, never proof that an event happened.
export function isActiveShowDate(date: string): boolean {
 return shows.some(show => show.verification === 'official_source' && show.start && show.end && show.start <= date && date <= show.end);
}
export function isNewsletterDate(date: string, start: string): boolean {
 const time=Date.parse(date); const days=(time-Date.parse(start))/86400000;
 return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(time) && new Date(time).toISOString().slice(0,10)===date && Number.isInteger(days) && days>=0 && (days%2===0 || isActiveShowDate(date));
}
