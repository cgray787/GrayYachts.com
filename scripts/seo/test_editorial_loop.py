import copy
import datetime as dt
import importlib.util
import json
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('loop',Path(__file__).with_name('editorial_loop.py'))
loop=importlib.util.module_from_spec(spec);spec.loader.exec_module(loop)
class EditorialLoopTests(unittest.TestCase):
 def setUp(self):self.article=copy.deepcopy(json.loads((loop.CONTENT/'articles.json').read_text())[0])
 def test_unknown_metrics_are_not_zero(self):
  r=loop.metric_report([])
  self.assertEqual(r['status'],'awaiting_search_console_data');self.assertEqual(r['aiCitations'],'not_measured')
 def test_insufficient_data_does_not_trigger_experiment(self):
  rows=[dict(page='https://grayyachts.com/sell',query='sell my boat',period_start='2026-08-01',period_end='2026-08-28',clicks=2,impressions=20,position=10),dict(page='https://grayyachts.com/sell',query='sell my boat',period_start='2026-08-29',period_end='2026-09-25',clicks=3,impressions=30,position=8)]
  self.assertEqual(loop.metric_report(rows)['comparisons'][0]['decision'],'insufficient_comparable_data')
  for row in rows:row['impressions']=300
  self.assertEqual(loop.metric_report(rows)['comparisons'][0]['decision'],'review_for_one_controlled_change')
 def test_overlapping_exports_not_compared(self):
  rows=[dict(page='https://grayyachts.com/sell',query='x',period_start='2026-08-01',period_end='2026-08-28',clicks=10,impressions=300,position=10),dict(page='https://grayyachts.com/sell',query='x',period_start='2026-08-10',period_end='2026-09-06',clicks=20,impressions=400,position=8)]
  self.assertIsNone(loop.metric_report(rows)['comparisons'][0]['previous'])
 def test_future_sources_and_invalid_citations_are_blocked(self):
  self.article['sources'][0]['publishedAt']='2999-01-01'
  self.article['sections'][0]['sourceIndexes']=[999]
  issues=loop.validate_article(self.article,dt.date(2026,9,24))
  self.assertIn('future dated source',issues);self.assertIn('bad citation index',issues)
 def test_breaking_requires_fresh_dated_evidence(self):
  self.article['title']='Breaking: a new reason to sell your boat in Seattle'
  self.assertIn('breaking headline without recent dated source',loop.validate_article(self.article))
 def test_rotation_covers_all_shows_in_two_weeks(self):
  ids=set()
  for n in range(14):ids.update(s['id'] for s in loop.choose_topics(dt.date(2026,9,24)+dt.timedelta(days=n)))
  all_ids={s['id'] for s in loop.read(loop.CONTENT/'shows.json')}
  self.assertTrue(all_ids<=ids,all_ids-ids)
class FailureVisibilityTests(unittest.TestCase):
 def setUp(self):
  import tempfile,argparse
  self.tmp=tempfile.TemporaryDirectory();self.state=Path(self.tmp.name)
  self.saved=(loop.STATE,loop.alert,loop.subprocess.run);loop.STATE=self.state
  self.alerts=[];loop.alert=lambda subject,body:self.alerts.append((subject,body))
  self.args=argparse.Namespace(dry_run=False)
 def tearDown(self):
  loop.STATE,loop.alert,loop.subprocess.run=self.saved;self.tmp.cleanup()
 def fake_cli(self,code,stdout,stderr=''):
  import types
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=code,stdout=stdout,stderr=stderr)
 def test_cli_error_reported_on_stdout_is_kept(self):
  self.fake_cli(1,json.dumps({'is_error':True,'subtype':'error_during_execution','result':'OAuth token expired'}))
  with self.assertRaises(SystemExit) as e:loop.run(self.args)
  self.assertEqual(e.exception.code,1)
  err=loop.read(self.state/'state.json')['lastError']
  self.assertIn('error_during_execution',err);self.assertIn('OAuth token expired',err)
 def test_non_json_stdout_is_kept(self):
  self.fake_cli(1,'network unreachable')
  with self.assertRaises(SystemExit):loop.run(self.args)
  self.assertIn('network unreachable',loop.read(self.state/'state.json')['lastError'])
 def test_failure_sends_alert_with_reason(self):
  self.fake_cli(1,'network unreachable')
  with self.assertRaises(SystemExit):loop.run(self.args)
  self.assertEqual(len(self.alerts),1);self.assertIn('network unreachable',self.alerts[0][1])
 def test_paused_run_alerts_and_exits_nonzero(self):
  loop.write(self.state/'state.json',{'blocked':True,'failures':2,'lastError':'CLI exit 1: boom'})
  with self.assertRaises(SystemExit) as e:loop.run(self.args)
  self.assertEqual(e.exception.code,1)
  self.assertEqual(len(self.alerts),1);self.assertIn('boom',self.alerts[0][1]);self.assertIn('resume',self.alerts[0][1])
 def test_alert_failure_never_masks_run_result(self):
  def broken(subject,body):raise OSError('no network')
  loop.alert=broken
  loop.write(self.state/'state.json',{'blocked':True,'failures':2,'lastError':'x'})
  with self.assertRaises(SystemExit) as e:loop.run(self.args)
  self.assertEqual(e.exception.code,1)
if __name__=='__main__':unittest.main()
