import datetime as dt
import unittest
from show_calendar import show_context, due_date

class CalendarTests(unittest.TestCase):
 def setUp(self):
  self.show={'id':'monaco','start':'2026-09-23','end':'2026-09-26','verification':'official_source'}
 def test_phases_and_no_annual_guess(self):
  for date,phase in [('2026-09-10','preview'),('2026-09-24','live'),('2026-09-28','recap')]:
   self.assertEqual(show_context([self.show],dt.date.fromisoformat(date))[0]['phase'],phase)
  self.assertEqual(show_context([self.show],dt.date(2027,9,24)),[])
 def test_conflicts_and_missing_dates_do_not_trigger(self):
  self.assertEqual(show_context([{**self.show,'verification':'provisional'},{**self.show,'start':None}],dt.date(2026,9,24)),[])
 def test_extra_day_only_while_live(self):
  day=dt.date(2026,9,25); windows=show_context([self.show],day); start=dt.date(2026,9,8)
  self.assertTrue(due_date(day,start,9,windows))
  self.assertFalse(due_date(day,start,8,windows))
  self.assertFalse(due_date(day,start,9,[]))
if __name__=='__main__': unittest.main()
