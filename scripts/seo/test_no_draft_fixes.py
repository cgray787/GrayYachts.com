import argparse
import contextlib
import copy
import datetime as dt
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import types
import unittest
from unittest.mock import patch

import public_sources
spec=importlib.util.spec_from_file_location('no_draft_fixes_loop',Path(__file__).with_name('editorial_loop.py'))
loop=importlib.util.module_from_spec(spec);spec.loader.exec_module(loop)

def fresh_loop(env):
    """A separate module instance so import-time env defaults can be exercised without disturbing `loop`."""
    with patch.dict(os.environ,env):
        s=importlib.util.spec_from_file_location('no_draft_fixes_loop_fresh',Path(__file__).with_name('editorial_loop.py'))
        module=importlib.util.module_from_spec(s);s.loader.exec_module(module)
    return module

# --- 1. Reputable sources: config, rotation, tagging, and run() wiring --------

class ReputableSourcesConfigTests(unittest.TestCase):
 def test_config_has_required_shape_and_unverified_note(self):
  config=public_sources.reputable_config()
  self.assertGreaterEqual(config['maxSnapshots'],1)
  self.assertIn('unverified',config['note'].lower())
  for s in config['sources']:
   self.assertIn(s['kind'],['trade press','association','regulator','manufacturer','show organizer'])
   self.assertTrue(s['urls'])
   for u in s['urls']:self.assertTrue(u.startswith('https://'),u)
 def test_rotation_is_deterministic_and_bounded(self):
  a=public_sources.reputable_targets(dt.date(2026,11,11))
  b=public_sources.reputable_targets(dt.date(2026,11,11))
  self.assertEqual(a,b)
  self.assertLessEqual(len(a),public_sources.reputable_config()['maxSnapshots'])
 def test_rotation_covers_every_source_within_a_few_windows(self):
  seen=set()
  for n in range(20):seen.update(t['sourceId'] for t in public_sources.reputable_targets(dt.date(2026,11,11)+dt.timedelta(days=n)))
  all_ids={s['id'] for s in public_sources.reputable_config()['sources']}
  self.assertTrue(all_ids<=seen,all_ids-seen)
 def test_zero_max_snapshots_disables_reputable_sources(self):
  self.assertEqual(public_sources.reputable_targets(dt.date(2026,11,11),{'maxSnapshots':0,'sources':[{'id':'x','name':'X','urls':['https://example.com/']}]}),[])

class SnapshotTaggingTests(unittest.TestCase):
 def test_official_snapshot_is_tagged_with_topic_name(self):
  topic={'id':'show1','name':'Fort Lauderdale Show','sourceUrl':'https://example.com/'}
  with patch.object(public_sources,'public_url',side_effect=ValueError('offline')):
   result=public_sources.snapshot(topic)
  self.assertEqual(result['tier'],'official');self.assertEqual(result['sourceName'],'Fort Lauderdale Show')
 def test_reputable_snapshots_are_tagged_with_source_name_not_a_topic(self):
  with patch.object(public_sources,'public_url',side_effect=ValueError('offline')):
   results=public_sources.reputable_snapshots(dt.date(2026,11,11))
  self.assertTrue(results)
  for r in results:
   self.assertEqual(r['tier'],'reputable');self.assertTrue(r['sourceName'])

class ModeGuardTests(unittest.TestCase):
 def test_reputable_sources_mode_requires_hermes_provider(self):
  with patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_RESEARCH_MODE':'reputable_sources','GRAYYACHTS_SEO_PROVIDER':'claude'}):
   with self.assertRaises(ValueError):loop.invoke_agent('x',{'type':'object'})
 def test_reputable_sources_mode_disables_hermes_web_tools(self):
  seen={}
  def fake(cmd,**kw):seen['cmd']=cmd;return types.SimpleNamespace(returncode=0,stdout='{"ok":true}',stderr='')
  with patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_RESEARCH_MODE':'reputable_sources','GRAYYACHTS_SEO_PROVIDER':'hermes'}),patch.object(loop.subprocess,'run',fake):
   loop.invoke_agent('x',{'type':'object','properties':{'ok':{'type':'boolean'}},'required':['ok'],'additionalProperties':False})
  cmd=seen['cmd'];self.assertEqual(cmd[cmd.index('-t')+1],'none')

class DryRunModeTests(unittest.TestCase):
 def test_dry_run_reports_no_tools_for_reputable_sources(self):
  with tempfile.TemporaryDirectory() as d:
   with patch.object(loop,'STATE',Path(d)),patch.object(loop,'today',lambda:dt.date(2026,10,12)),patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_RESEARCH_MODE':'reputable_sources'}):
    buf=io.StringIO()
    with contextlib.redirect_stdout(buf):loop.run(argparse.Namespace(dry_run=True))
  payload=json.loads(buf.getvalue())
  self.assertEqual(payload['tools'],[]);self.assertEqual(payload['researchMode'],'reputable_sources')

class ReputableSourceModeRunTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.state=Path(self.tmp.name)
  self.stack=contextlib.ExitStack()
  self.stack.enter_context(patch.object(loop,'STATE',self.state))
  self.stack.enter_context(patch.object(loop,'today',lambda:dt.date(2026,10,12)))  # a Monday: a draft is eligible
  self.stack.enter_context(patch.object(loop,'notify',lambda *a:None))
  self.stack.enter_context(patch.object(loop,'check_auth',lambda *a,**k:{'provider':'test'}))
  self.stack.enter_context(patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_RESEARCH_MODE':'reputable_sources','GRAYYACHTS_SEO_PROVIDER':'hermes'}))
 def tearDown(self):self.stack.close();self.tmp.cleanup()
 def official_pack(self,topics):
  return [{'topicId':t['id'],'requestedUrl':t['sourceUrl'],'url':t['sourceUrl'],'status':'retrieved','checkedAt':'2026-10-12T12:00:00Z','contentSha256':'o','text':'Official text.'} for t in topics]
 def reputable_pack(self,day):
  return [{'topicId':'boat-international','requestedUrl':'https://www.boatinternational.com/yachts/news','url':'https://www.boatinternational.com/yachts/news','status':'retrieved','checkedAt':'2026-10-12T12:00:00Z','contentSha256':'r','text':'Reputable text.','tier':'reputable','sourceName':'Boat International'}]
 def result(self,draft=None):
  return {'updates':[{'topicId':t['id'],'changeType':'unchanged','sourceUrl':t['sourceUrl'],'sourcePublishedAt':None,'summary':'No material change found in the current official page.'} for t in loop.choose_topics(loop.today())],'draft':draft,'revisionProposal':None,'earnedMediaIdeas':[],'critique':{'findings':[],'revisionsMade':[],'lesson':'Name verified evidence.'},'experimentProposal':None}
 def draft_citing(self,url):
  article=copy.deepcopy(loop.read(loop.CONTENT/'articles.json')[0])
  article.update(slug='reputable-cited-test',intent={'dominantIntent':'informational','journeyStage':'consideration','evidence':'A verified owner question.'},internalLinks=[],disclosures=[])
  for s in article['sources']:s['url']=url  # every citation must resolve to a retrieved snapshot
  return article
 def test_citation_from_a_reputable_snapshot_is_accepted(self):
  draft=self.draft_citing('https://www.boatinternational.com/yachts/news')
  with patch.object(public_sources,'snapshots',self.official_pack),patch.object(public_sources,'reputable_snapshots',lambda day:self.reputable_pack(day)),patch.object(loop,'invoke_agent',return_value=self.result(draft)):
   loop.run(argparse.Namespace(dry_run=False))
  result=loop.read(self.state/'runs/2026-10-12.json')
  self.assertEqual(result['researchMode'],'reputable_sources')
  self.assertTrue(any(s.get('tier')=='reputable' for s in result['sourceChecks']))
  self.assertEqual(result['draft']['slug'],'reputable-cited-test')
 def test_citation_from_neither_list_is_rejected(self):
  draft=self.draft_citing('https://not-retrieved.example/')
  with patch.object(public_sources,'snapshots',self.official_pack),patch.object(public_sources,'reputable_snapshots',lambda day:self.reputable_pack(day)),patch.object(loop,'invoke_agent',return_value=self.result(draft)):
   with self.assertRaises(SystemExit):loop.run(argparse.Namespace(dry_run=False))
  self.assertIn('citation was not read',loop.read(self.state/'state.json')['lastError'])
 def test_topic_research_still_checked_against_its_own_official_snapshot(self):
  bad=self.result()
  bad['updates'][0]['sourceUrl']='https://www.boatinternational.com/yachts/news'  # a reputable URL, not this topic's official one
  with patch.object(public_sources,'snapshots',self.official_pack),patch.object(public_sources,'reputable_snapshots',lambda day:self.reputable_pack(day)),patch.object(loop,'invoke_agent',return_value=bad):
   with self.assertRaises(SystemExit):loop.run(argparse.Namespace(dry_run=False))
  self.assertIn('Research claim lacks a retrieved official snapshot',loop.read(self.state/'state.json')['lastError'])

# --- 2. No-draft alert and eligibleWithoutDraft tracking -----------------------

class NoDraftAlertTests(unittest.TestCase):
 def setUp(self):self.alerts=[]
 def notify(self,subject,body):self.alerts.append((subject,body))
 def result(self,draft=None,findings=None):
  return {'draft':draft,'qualityGate':{'issues':[],'status':'research_only' if draft is None else 'needs_human_fact_review'},'critique':{'findings':findings or [],'revisionsMade':[],'lesson':'x'},'researchMode':'reputable_sources'}
 def test_alert_sent_on_eligible_no_draft_day(self):
  state={}
  with patch.object(loop,'notify',self.notify):
   loop.track_no_draft(self.result(findings=['No qualifying development today.','Evergreen guide already covers this topic.','Third reason, truncated out.']),state,'2026-10-12',True)
  self.assertEqual(state['eligibleWithoutDraft'],1);self.assertEqual(state['lastNoDraftAlertDate'],'2026-10-12')
  self.assertEqual(len(self.alerts),1)
  subject,body=self.alerts[0]
  self.assertEqual(subject,'Gray Yachts SEO agent: no draft today (2026-10-12)')
  self.assertIn('reputable_sources',body);self.assertIn('No qualifying development today.',body)
  self.assertIn('Evergreen guide already covers this topic.',body);self.assertNotIn('Third reason, truncated out.',body)
 def test_no_alert_on_a_non_draft_day(self):
  state={}
  with patch.object(loop,'notify',self.notify):
   loop.track_no_draft(self.result(),state,'2026-10-11',False)
  self.assertEqual(self.alerts,[]);self.assertNotIn('eligibleWithoutDraft',state)
 def test_counter_resets_when_a_draft_is_produced(self):
  state={'eligibleWithoutDraft':3}
  with patch.object(loop,'notify',self.notify):
   loop.track_no_draft(self.result(draft={'slug':'x'}),state,'2026-10-14',True)
  self.assertEqual(state['eligibleWithoutDraft'],0);self.assertEqual(self.alerts,[])
 def test_counter_increments_across_consecutive_eligible_days(self):
  state={}
  with patch.object(loop,'notify',self.notify):
   loop.track_no_draft(self.result(),state,'2026-10-12',True)
   loop.track_no_draft(self.result(),state,'2026-10-14',True)
  self.assertEqual(state['eligibleWithoutDraft'],2);self.assertEqual(len(self.alerts),2)
 def test_recovered_run_on_the_same_date_does_not_double_count(self):
  state={}
  with patch.object(loop,'notify',self.notify):
   loop.track_no_draft(self.result(),state,'2026-10-12',True)
   loop.track_no_draft(self.result(),state,'2026-10-12',True)  # e.g. a cached run recovered later the same day
  self.assertEqual(state['eligibleWithoutDraft'],1);self.assertEqual(len(self.alerts),1)

class NoDraftAlertIntegrationTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.state=Path(self.tmp.name)
  self.alerts=[]
  self.stack=contextlib.ExitStack()
  self.stack.enter_context(patch.object(loop,'STATE',self.state))
  self.stack.enter_context(patch.object(loop,'today',lambda:dt.date(2026,10,12)))
  self.stack.enter_context(patch.object(loop,'notify',lambda s,b:self.alerts.append((s,b))))
  self.stack.enter_context(patch.object(loop,'check_auth',lambda *a,**k:{'provider':'test'}))
  self.stack.enter_context(patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_RESEARCH_MODE':'web'}))
 def tearDown(self):self.stack.close();self.tmp.cleanup()
 def test_full_run_alerts_when_an_eligible_day_produces_no_draft(self):
  result={'updates':[{'topicId':t['id'],'changeType':'unchanged','sourceUrl':t['sourceUrl'],'sourcePublishedAt':None,'summary':'No material change.'} for t in loop.choose_topics(loop.today())],'draft':None,'revisionProposal':None,'earnedMediaIdeas':[],'critique':{'findings':['No qualifying seller question today.'],'revisionsMade':[],'lesson':'x'},'experimentProposal':None}
  with patch.object(loop,'invoke_agent',return_value=result):loop.run(argparse.Namespace(dry_run=False))
  state=loop.read(self.state/'state.json')
  self.assertEqual(state['eligibleWithoutDraft'],1)
  self.assertEqual(len(self.alerts),1);self.assertIn('no draft today',self.alerts[0][0])

# --- 3. Pre-run auth/login health check -----------------------------------------

class AuthCheckTests(unittest.TestCase):
 def setUp(self):self.saved=loop.subprocess.run
 def tearDown(self):loop.subprocess.run=self.saved
 def test_hermes_success_requires_logged_in_wording(self):
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=0,stdout='You are logged in as someone@example.com\n',stderr='')
  self.assertEqual(loop.check_auth('hermes')['provider'],'hermes')
 def test_hermes_not_logged_in_fails_even_with_zero_exit(self):
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=0,stdout='You are not logged in.',stderr='')
  with self.assertRaisesRegex(RuntimeError,'Pre-run login check failed'):loop.check_auth('hermes')
 def test_hermes_nonzero_exit_fails(self):
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=1,stdout='logged in',stderr='')
  with self.assertRaises(RuntimeError):loop.check_auth('hermes')
 def test_claude_provider_only_checks_exit_code(self):
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=0,stdout='anything at all',stderr='')
  self.assertEqual(loop.check_auth('claude')['provider'],'claude')
 def test_claude_provider_nonzero_exit_fails(self):
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=1,stdout='',stderr='error')
  with self.assertRaises(RuntimeError):loop.check_auth('claude')
 def test_default_commands_per_provider(self):
  self.assertEqual(loop.default_auth_check_command('hermes'),[loop.HERMES_BIN,'auth','status','openai-codex'])
  self.assertEqual(loop.default_auth_check_command('claude'),[loop.claude_bin(),'auth','status'])
  with self.assertRaises(ValueError):loop.default_auth_check_command('unknown')
 def test_auth_check_command_override_is_shlex_split(self):
  with patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_AUTH_CHECK':'/bin/echo "logged in"'}):
   self.assertEqual(loop.auth_check_command('hermes'),['/bin/echo','logged in'])
 def test_override_command_is_actually_invoked(self):
  seen={}
  loop.subprocess.run=lambda cmd,**kw:(seen.update(cmd=cmd,kw=kw),types.SimpleNamespace(returncode=0,stdout='ok',stderr=''))[1]
  with patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_AUTH_CHECK':'true'}):
   loop.check_auth('claude')
  self.assertEqual(seen['cmd'],['true']);self.assertEqual(seen['kw']['timeout'],loop.AUTH_CHECK_TIMEOUT_SECONDS)
 def test_check_auth_subcommand_exits_nonzero_on_failure(self):
  import sys
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=1,stdout='not logged in',stderr='')
  argv=sys.argv;sys.argv=['editorial_loop.py','check-auth']
  try:
   with patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_PROVIDER':'hermes'}),contextlib.redirect_stdout(io.StringIO()):
    with self.assertRaises(SystemExit) as exit_ctx:loop.main()
   self.assertEqual(exit_ctx.exception.code,1)
  finally:sys.argv=argv
 def test_check_auth_subcommand_prints_ok_on_success(self):
  import sys
  loop.subprocess.run=lambda *a,**k:types.SimpleNamespace(returncode=0,stdout='anything',stderr='')
  argv=sys.argv;sys.argv=['editorial_loop.py','check-auth']
  buf=io.StringIO()
  try:
   with patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_PROVIDER':'claude'}),contextlib.redirect_stdout(buf):
    loop.main()
  finally:sys.argv=argv
  self.assertTrue(json.loads(buf.getvalue())['ok'])

# --- 4. Retry with backoff on HTTP 429/5xx and transient network errors --------

class RetryBackoffTests(unittest.TestCase):
 def setUp(self):
  self.sleeps=[]
  self.saved=(public_sources.SLEEP,public_sources.public_url)
  public_sources.SLEEP=lambda s:self.sleeps.append(s)
  public_sources.public_url=lambda u:u
 def tearDown(self):
  public_sources.SLEEP,public_sources.public_url=self.saved
 def body(self):return '<p>'+('Marine industry news update. '*20)+'</p>'
 def test_retries_429_then_succeeds_honoring_retry_after(self):
  import urllib.error
  attempts=[]
  def fake_open(request,timeout=None):
   attempts.append(1)
   if len(attempts)==1:raise urllib.error.HTTPError(request.full_url,429,'Too Many Requests',{'Retry-After':'5'},None)
   return FakeResponse(self.body())
  with patch.object(public_sources.urllib.request,'build_opener',return_value=types.SimpleNamespace(open=fake_open)):
   result=public_sources.snapshot({'id':'t','sourceUrl':'https://example.com/'})
  self.assertEqual(result['status'],'retrieved');self.assertEqual(len(attempts),2);self.assertEqual(self.sleeps,[5.0])
 def test_retries_500_with_exponential_backoff_when_no_retry_after_then_gives_up(self):
  import urllib.error
  attempts=[]
  def fake_open(request,timeout=None):
   attempts.append(1);raise urllib.error.HTTPError(request.full_url,503,'Service Unavailable',{},None)
  with patch.object(public_sources.urllib.request,'build_opener',return_value=types.SimpleNamespace(open=fake_open)):
   result=public_sources.snapshot({'id':'t','sourceUrl':'https://example.com/'})
  self.assertEqual(result['status'],'unverified');self.assertEqual(len(attempts),public_sources.MAX_ATTEMPTS);self.assertEqual(self.sleeps,[1,2])
 def test_404_is_not_retried(self):
  import urllib.error
  attempts=[]
  def fake_open(request,timeout=None):
   attempts.append(1);raise urllib.error.HTTPError(request.full_url,404,'Not Found',{},None)
  with patch.object(public_sources.urllib.request,'build_opener',return_value=types.SimpleNamespace(open=fake_open)):
   result=public_sources.snapshot({'id':'t','sourceUrl':'https://example.com/'})
  self.assertEqual(len(attempts),1);self.assertEqual(self.sleeps,[]);self.assertEqual(result['status'],'unverified')
 def test_url_error_is_retried(self):
  import urllib.error
  attempts=[]
  def fake_open(request,timeout=None):
   attempts.append(1)
   if len(attempts)<public_sources.MAX_ATTEMPTS:raise urllib.error.URLError('timed out')
   return FakeResponse(self.body())
  with patch.object(public_sources.urllib.request,'build_opener',return_value=types.SimpleNamespace(open=fake_open)):
   result=public_sources.snapshot({'id':'t','sourceUrl':'https://example.com/'})
  self.assertEqual(result['status'],'retrieved');self.assertEqual(len(attempts),public_sources.MAX_ATTEMPTS)
 def test_retry_after_is_capped_at_30_seconds(self):
  import urllib.error
  attempts=[]
  def fake_open(request,timeout=None):
   attempts.append(1)
   if len(attempts)==1:raise urllib.error.HTTPError(request.full_url,429,'x',{'Retry-After':'9999'},None)
   return FakeResponse(self.body())
  with patch.object(public_sources.urllib.request,'build_opener',return_value=types.SimpleNamespace(open=fake_open)):
   public_sources.snapshot({'id':'t','sourceUrl':'https://example.com/'})
  self.assertEqual(self.sleeps,[30])

class FakeHeaders:
 def __init__(self):pass
 def get_content_type(self):return 'text/html'
 def get_content_charset(self):return 'utf-8'

class FakeResponse:
 def __init__(self,html,url='https://example.com/'):
  self._html=html.encode();self._url=url;self.headers=FakeHeaders()
 def __enter__(self):return self
 def __exit__(self,*a):return False
 def geturl(self):return self._url
 def read(self,n=None):return self._html

class AlertRetryTests(unittest.TestCase):
 def setUp(self):
  self.sleeps=[]
  self.saved=(loop.SLEEP,os.environ.get('RESEND_API_KEY'))
  loop.SLEEP=lambda s:self.sleeps.append(s)
  os.environ['RESEND_API_KEY']='test-key'
 def tearDown(self):
  loop.SLEEP,previous=self.saved[0],self.saved[1]
  if previous is None:os.environ.pop('RESEND_API_KEY',None)
  else:os.environ['RESEND_API_KEY']=previous
 def test_alert_retries_429_then_succeeds(self):
  import urllib.error
  attempts=[]
  class Resp:
   def __enter__(self):return self
   def __exit__(self,*a):return False
   def read(self):return b'{}'
  def urlopen(request,timeout):
   attempts.append(1)
   if len(attempts)==1:raise urllib.error.HTTPError(request.full_url,429,'Too Many Requests',{'Retry-After':'2'},None)
   return Resp()
  with patch.object(loop.urllib.request,'urlopen',urlopen):
   loop.alert('subject','body')
  self.assertEqual(len(attempts),2);self.assertEqual(self.sleeps,[2.0])
 def test_alert_gives_up_after_max_attempts_on_persistent_500(self):
  import urllib.error
  attempts=[]
  def urlopen(request,timeout):
   attempts.append(1);raise urllib.error.HTTPError(request.full_url,500,'Internal Server Error',{},None)
  with patch.object(loop.urllib.request,'urlopen',urlopen):
   with self.assertRaises(urllib.error.HTTPError):loop.alert('subject','body')
  self.assertEqual(len(attempts),loop.MAX_ALERT_ATTEMPTS)
 def test_alert_does_not_retry_a_4xx_client_error(self):
  import urllib.error
  attempts=[]
  def urlopen(request,timeout):
   attempts.append(1);raise urllib.error.HTTPError(request.full_url,401,'Unauthorized',{},None)
  with patch.object(loop.urllib.request,'urlopen',urlopen):
   with self.assertRaises(urllib.error.HTTPError):loop.alert('subject','body')
  self.assertEqual(len(attempts),1)

# --- 5. Config moved to environment variables, with documented defaults --------

class EnvConfigDefaultsTests(unittest.TestCase):
 def test_documented_defaults(self):
  self.assertEqual(loop.ALERT_TO,'connorgray@jeffbrownyachts.com')
  self.assertIn('onboarding@resend.dev',loop.ALERT_FROM)
  self.assertEqual(loop.HERMES_PROVIDER,'codex')
  self.assertIsNone(loop.MODEL)
  self.assertEqual(loop.CLI_TIMEOUT_SECONDS,900)
  self.assertEqual(loop.AUTH_CHECK_TIMEOUT_SECONDS,60)

class EnvConfigOverrideTests(unittest.TestCase):
 def test_env_vars_override_defaults_at_import(self):
  env={'GRAYYACHTS_SEO_ALERT_TO':'someone@example.com','GRAYYACHTS_SEO_ALERT_FROM':'Custom <custom@example.com>',
       'GRAYYACHTS_SEO_HERMES_BIN':'/opt/bin/hermes','GRAYYACHTS_SEO_HERMES_PROVIDER':'custom-provider',
       'GRAYYACHTS_SEO_MODEL':'claude-haiku-4-5','GRAYYACHTS_SEO_CLI_TIMEOUT':'120'}
  fresh=fresh_loop(env)
  self.assertEqual(fresh.ALERT_TO,'someone@example.com')
  self.assertEqual(fresh.ALERT_FROM,'Custom <custom@example.com>')
  self.assertEqual(fresh.HERMES_BIN,'/opt/bin/hermes')
  self.assertEqual(fresh.HERMES_PROVIDER,'custom-provider')
  self.assertEqual(fresh.MODEL,'claude-haiku-4-5')
  self.assertEqual(fresh.CLI_TIMEOUT_SECONDS,120)
 def test_model_flag_is_passed_to_hermes_when_configured(self):
  seen={}
  fresh=fresh_loop({'GRAYYACHTS_SEO_MODEL':'claude-haiku-4-5','GRAYYACHTS_SEO_PROVIDER':'hermes'})
  def fake(cmd,**kw):seen['cmd']=cmd;return types.SimpleNamespace(returncode=0,stdout='{"ok":true}',stderr='')
  with patch.dict(os.environ,{'GRAYYACHTS_SEO_PROVIDER':'hermes'}),patch.object(fresh.subprocess,'run',fake):
   fresh.invoke_agent('x',{'type':'object','properties':{'ok':{'type':'boolean'}},'required':['ok'],'additionalProperties':False})
  self.assertIn('--model',seen['cmd']);self.assertEqual(seen['cmd'][seen['cmd'].index('--model')+1],'claude-haiku-4-5')
 def test_no_model_flag_when_unset(self):
  seen={}
  def fake(cmd,**kw):seen['cmd']=cmd;return types.SimpleNamespace(returncode=0,stdout='{"ok":true}',stderr='')
  with patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_PROVIDER':'hermes'}),patch.object(loop.subprocess,'run',fake):
   loop.invoke_agent('x',{'type':'object','properties':{'ok':{'type':'boolean'}},'required':['ok'],'additionalProperties':False})
  self.assertNotIn('--model',seen['cmd'])

if __name__=='__main__':unittest.main()
