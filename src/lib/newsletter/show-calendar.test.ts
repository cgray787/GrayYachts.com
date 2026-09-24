import {describe,it,expect} from 'vitest';
import {isActiveShowDate,isNewsletterDate} from './show-calendar';
import {scheduleSlot} from './core';
describe('show-driven newsletter dates',()=>{
 it('adds the intervening Monaco show day after 9am Pacific',()=>{
  expect(isActiveShowDate('2026-09-25')).toBe(true);
  expect(isNewsletterDate('2026-09-25','2026-09-08')).toBe(true);
  expect(scheduleSlot(new Date('2026-09-25T15:59:00Z'),'2026-09-08')).toBeNull();
  expect(scheduleSlot(new Date('2026-09-25T16:00:00Z'),'2026-09-08')).toBe('2026-09-25');
 });
 it('does not infer dates for next year or accept impossible dates',()=>{
  expect(isActiveShowDate('2027-09-25')).toBe(false);
  expect(isNewsletterDate('2026-02-30','2026-01-01')).toBe(false);
  expect(isNewsletterDate('2026-07-09','2026-07-08')).toBe(false);
 });
});
