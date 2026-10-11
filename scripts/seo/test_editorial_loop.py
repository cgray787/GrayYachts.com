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
class PromptUpgradeTests(unittest.TestCase):
 def setUp(self):
  import tempfile,argparse
  self.article=copy.deepcopy(json.loads((loop.CONTENT/'articles.json').read_text())[0])
  self.article.update(intent={'dominantIntent':'informational','journeyStage':'consideration','evidence':'Owners ask how a sale works before they list.'},internalLinks=[{'path':'/sell','anchor':'talk with Connor Gray about selling'}],disclosures=[])
  self.tmp=tempfile.TemporaryDirectory();self.state=Path(self.tmp.name)
  self.saved=(loop.STATE,loop.alert,loop.subprocess.run,loop.today);loop.STATE=self.state;loop.alert=lambda s,b:None
  self.args=argparse.Namespace(dry_run=False)
 def tearDown(self):
  loop.STATE,loop.alert,loop.subprocess.run,loop.today=self.saved;self.tmp.cleanup()
 def test_schema_carries_intent_links_disclosures_and_refresh(self):
  schema=loop.article_schema()
  draft=schema['properties']['draft']['anyOf'][0]['properties']
  for k in ['intent','internalLinks','disclosures']:self.assertIn(k,draft)
  for k in ['revisionProposal','earnedMediaIdeas']:self.assertIn(k,schema['properties'])
 def test_unknown_internal_link_is_flagged(self):
  self.article['internalLinks']=[{'path':'/made-up-page','anchor':'a page that does not exist'}]
  self.assertIn('unknown internal link',loop.validate_article(self.article,allowed_paths=loop.site_paths()))
 def test_known_internal_link_passes(self):
  self.assertNotIn('unknown internal link',loop.validate_article(self.article,allowed_paths=loop.site_paths()))
 def test_jby_brand_mention_requires_disclosure(self):
  self.article['sections'][0]['paragraphs'].append('The Axopar 37 is a popular Pacific Northwest day boat.')
  self.assertIn('missing material connection disclosure',loop.validate_article(self.article,jby_brands=['Axopar']))
  self.article['disclosures']=['Jeff Brown Yachts, where Connor Gray works, has a commercial relationship with Axopar.']
  self.assertNotIn('missing material connection disclosure',loop.validate_article(self.article,jby_brands=['Axopar']))
 def test_brand_short_names_are_matched(self):
  names=loop.jby_brands()
  self.assertIn('Sirena',names);self.assertIn('BRABUS',names);self.assertIn('Sirena Yachts',names)
 def test_published_articles_disclose_dealer_brands_and_ai(self):
  for a in json.loads((loop.CONTENT/'articles.json').read_text()):
   self.assertNotIn('missing material connection disclosure',loop.validate_article(a,jby_brands=loop.jby_brands()),a['slug'])
   self.assertTrue(a.get('aiAssisted'),a['slug'])
 def test_stock_ai_phrasing_is_flagged(self):
  self.article['sections'][0]['paragraphs'].append("It's important to note that every boat is different.")
  self.assertIn('unsupported promise or stock prose',loop.validate_article(self.article))
 def test_refresh_candidate_is_a_published_article_and_rotates(self):
  arts=json.loads((loop.CONTENT/'articles.json').read_text())
  picks={loop.choose_refresh_candidate(dt.date(2026,10,1)+dt.timedelta(days=n),arts)['slug'] for n in range(len(arts))}
  self.assertGreater(len(picks),1)
  for a in arts:
   if a['slug'] in picks:self.assertEqual(a['status'],'published')
 def fake_cli(self,result):
  import types
  out=json.dumps({'is_error':False,'structured_output':result})
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=0,stdout=out,stderr='')
 def result(self,**extra):
  r={'updates':[],'draft':None,'critique':{'findings':[],'revisionsMade':[],'lesson':'Keep answers first.'},'experimentProposal':None,'revisionProposal':None,'earnedMediaIdeas':[]}
  r.update(extra);return r
 def test_new_draft_is_marked_ai_assisted_with_related_paths(self):
  loop.today=lambda:dt.date(2026,10,12)  # a Monday, so drafting is allowed
  draft=copy.deepcopy(self.article)
  for k in ['status','author','createdAt','updatedAt','publishedAt','reviewedBy','revision','relatedPaths']:draft.pop(k,None)
  draft['slug']='a-brand-new-test-slug'
  self.fake_cli(self.result(draft=draft))
  loop.run(self.args)
  saved=loop.read(self.state/'runs'/'2026-10-12.json')['draft']
  self.assertTrue(saved['aiAssisted']);self.assertEqual(saved['relatedPaths'],['/sell'])
 def test_revision_proposal_for_unknown_article_is_flagged_not_fatal(self):
  loop.today=lambda:dt.date(2026,10,10)
  proposal={'slug':'not-a-real-article','reasons':['x'],'changes':['y'],'sources':[],'republishTreatment':'lastUpdatedDate'}
  self.fake_cli(self.result(revisionProposal=proposal))
  loop.run(self.args)
  saved=loop.read(self.state/'runs'/'2026-10-10.json')
  self.assertIn('unknown article',saved['revisionGate']['issues'])
class AnswerEngineTests(unittest.TestCase):
 def setUp(self):self.article=copy.deepcopy(json.loads((loop.CONTENT/'articles.json').read_text())[0])
 def test_vague_unanchored_claims_are_flagged(self):
  self.article['sections'][1]['paragraphs'].append('This is a state of the art, world class cruiser.')
  self.assertIn('vague unanchored claim',loop.validate_article(self.article))
 def test_decorative_symbols_are_flagged(self):
  self.article['sections'][1]['bullets'].append('Survey first → then list ★')
  self.assertIn('decorative symbols',loop.validate_article(self.article))
 def test_long_opening_does_not_lead_with_answer(self):
  self.article['sections'][0]['paragraphs'][0]=' '.join(['word']*130)+'.'
  self.assertIn('opening does not lead with a concise answer',loop.validate_article(self.article))
  self.article['sections'][0]['paragraphs'][0]='One. Two. Three. Four.'
  self.assertIn('opening does not lead with a concise answer',loop.validate_article(self.article))
 def test_three_sentence_answer_first_opening_passes(self):
  # Real v1.2.0 draft opening (81 words, 3 sentences) that an 80 word limit wrongly flagged.
  self.article['sections'][0]['paragraphs'][0]=("A survey before listing is often worth it for a larger or older boat, for a powerboat whose engines carry much of its value, or for any boat with gaps in its maintenance records. It is usually not worth it for a boat with a recent full survey and documented repairs. Either way, a seller's survey does not replace the buyer's survey; its value is that you learn about problems first, while you still control the price and the repair plan.")
  self.assertNotIn('opening does not lead with a concise answer',loop.validate_article(self.article))
 def test_cli_timeout_leaves_headroom(self):
  self.assertGreaterEqual(loop.CLI_TIMEOUT_SECONDS,900)
 def test_existing_articles_pass_answer_engine_checks(self):
  for a in json.loads((loop.CONTENT/'articles.json').read_text()):
   issues=loop.validate_article(a)
   for i in ['vague unanchored claim','decorative symbols','opening does not lead with a concise answer']:self.assertNotIn(i,issues,a['slug'])
 def test_prompt_carries_answer_engine_rules(self):
  p=(loop.ROOT/'scripts/seo/research-prompt.md').read_text()
  for phrase in ['main conclusion','how and why','define','counterpoint','easily confused','one idea','tabs']:self.assertIn(phrase,p.lower(),phrase)
if __name__=='__main__':unittest.main()
