import argparse
import contextlib
import copy
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import textwrap
import types
import unittest
from unittest.mock import patch

import public_sources
spec=importlib.util.spec_from_file_location('prompt_size_loop',Path(__file__).with_name('editorial_loop.py'))
loop=importlib.util.module_from_spec(spec);spec.loader.exec_module(loop)

def snapshot_pack(n, chars, tier, prefix):
 text=('Marine news π☸★ update. '*(chars//24+1))[:chars]
 return [{'topicId':f'{prefix}{i}','requestedUrl':f'https://example.com/{prefix}{i}','url':f'https://example.com/{prefix}{i}','status':'retrieved','checkedAt':'2026-11-12T00:00:00Z','contentSha256':'x','text':text,'tier':tier,'sourceName':f'{prefix}{i}'} for i in range(n)]

class BuildPromptOversizedTests(unittest.TestCase):
 def setUp(self):
  self.context={'today':'2026-11-12','topics':[{'id':'t1','sourceUrl':'https://example.com/t1'}],'alreadyWritten':[],'recentResearch':[],'lessons':[],'keywordTargets':[],'officialSourceSnapshots':snapshot_pack(13,20_000,'official','off'),'reputableSourceSnapshots':snapshot_pack(13,20_000,'reputable','rep')}
  self.schema=loop.article_schema()
 def test_oversized_snapshots_are_trimmed_within_budget_without_mutating_caller_context(self):
  total_bytes=sum(len(item['text'].encode('utf-8')) for item in self.context['officialSourceSnapshots']+self.context['reputableSourceSnapshots'])
  self.assertGreater(total_bytes,200_000)
  original=copy.deepcopy(self.context)
  prompt=loop.build_prompt('Template body.',self.context,self.schema)
  reserved=len((loop.SCHEMA_SUFFIX+json.dumps(self.schema,separators=(',',':'))).encode('utf-8'))
  self.assertLessEqual(len(prompt.encode('utf-8'))+reserved,loop.MAX_PROMPT_BYTES)
  self.assertEqual(self.context,original)
  ctx=json.loads(prompt.split('Current context:\n',1)[1])
  for key in ['officialSourceSnapshots','reputableSourceSnapshots']:
   self.assertEqual(len(ctx[key]),13)
   for item in ctx[key]:
    self.assertTrue(item['url']);self.assertEqual(item['status'],'retrieved');self.assertTrue(item['requestedUrl'])
 def test_moderately_oversized_snapshots_are_not_over_trimmed(self):
  # 13 snapshots x 6,000 chars per tier overshoots the byte budget by roughly 40%. A per-step
  # binary search should trim only as much as needed to fit, not collapse straight to the floor
  # the way a fixed-limit trim would (the real-world regression this guards against: a 139.7 KB
  # prompt got cut all the way to 86.6 KB when ~96.6 KB would have fit).
  context={'today':'2026-11-12','topics':[{'id':'t1','sourceUrl':'https://example.com/t1'}],'alreadyWritten':[],'recentResearch':[],'lessons':[],'keywordTargets':[],'officialSourceSnapshots':snapshot_pack(13,6_000,'official','off'),'reputableSourceSnapshots':snapshot_pack(13,6_000,'reputable','rep')}
  schema=loop.article_schema()
  reserved=len((loop.SCHEMA_SUFFIX+json.dumps(schema,separators=(',',':'))).encode('utf-8'))
  budget=loop.MAX_PROMPT_BYTES-reserved
  before=len(('Template body.'+'\n\nCurrent context:\n'+json.dumps(context,ensure_ascii=False)).encode('utf-8'))
  self.assertGreater(before,budget*1.3)
  prompt=loop.build_prompt('Template body.',context,schema)
  size=len(prompt.encode('utf-8'))
  self.assertLessEqual(size,budget)
  self.assertGreaterEqual(size,budget*0.9)

class InvokeAgentStdinTests(unittest.TestCase):
 def setUp(self):
  self.saved=(loop.subprocess.run,loop.HERMES_PYTHON,os.environ.get('GRAYYACHTS_SEO_PROVIDER'),os.environ.get('PYTHONPATH'),os.environ.get('PYTHONHOME'))
  loop.HERMES_PYTHON=sys.executable
  os.environ['GRAYYACHTS_SEO_PROVIDER']='hermes'
  os.environ['PYTHONPATH']='/some/unrelated/path'
  os.environ['PYTHONHOME']='/some/unrelated/home'
 def tearDown(self):
  loop.subprocess.run,loop.HERMES_PYTHON,provider,pypath,pyhome=self.saved
  for var,value in [('GRAYYACHTS_SEO_PROVIDER',provider),('PYTHONPATH',pypath),('PYTHONHOME',pyhome)]:
   if value is None:os.environ.pop(var,None)
   else:os.environ[var]=value
 def test_large_prompt_travels_over_stdin_not_argv(self):
  seen={}
  def fake(command,**kwargs):
   seen['command']=command;seen['kwargs']=kwargs
   return types.SimpleNamespace(returncode=0,stdout='{"ok":true}',stderr='')
  loop.subprocess.run=fake
  big_prompt='x'*250_000
  schema={'type':'object','properties':{'ok':{'type':'boolean'}},'required':['ok'],'additionalProperties':False}
  loop.invoke_agent(big_prompt,schema)
  expected_input=big_prompt+loop.SCHEMA_SUFFIX+json.dumps(schema,separators=(',',':'))
  self.assertEqual(seen['kwargs'].get('input'),expected_input)
  cmd=seen['command']
  for part in cmd:self.assertLessEqual(len(part.encode('utf-8')),4096,part[:80])
  self.assertNotIn(big_prompt,cmd)
  if '-q' in cmd:self.assertNotEqual(cmd[cmd.index('-q')+1],big_prompt)
  env=seen['kwargs'].get('env') or {}
  self.assertNotIn('PYTHONPATH',env);self.assertNotIn('PYTHONHOME',env)

class RealExecveTests(unittest.TestCase):
 """No subprocess mocking here: proves execve does not raise E2BIG once the prompt moves to stdin."""
 def setUp(self):
  self.saved=(loop.subprocess.run,loop.HERMES_PYTHON,os.environ.get('GRAYYACHTS_SEO_PROVIDER'))
  os.environ['GRAYYACHTS_SEO_PROVIDER']='hermes'
  self.tmp=tempfile.TemporaryDirectory()
  script=Path(self.tmp.name)/'fake-hermes-python'
  script.write_text(textwrap.dedent('''\
   #!/usr/bin/env python3
   import sys, json
   data = sys.stdin.read()
   print(json.dumps({"ok": True, "n": len(data.encode("utf-8"))}))
   '''))
  script.chmod(script.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
  loop.HERMES_PYTHON=str(script)
 def tearDown(self):
  loop.subprocess.run,loop.HERMES_PYTHON,provider=self.saved
  if provider is None:os.environ.pop('GRAYYACHTS_SEO_PROVIDER',None)
  else:os.environ['GRAYYACHTS_SEO_PROVIDER']=provider
  self.tmp.cleanup()
 def test_oversized_prompt_does_not_hit_argument_list_too_long(self):
  big_prompt='owner research notes. '*12_000  # well past MAX_ARG_STRLEN as a single argv string
  self.assertGreater(len(big_prompt.encode('utf-8')),200_000)
  schema={'type':'object','properties':{'ok':{'type':'boolean'},'n':{'type':'integer'}},'required':['ok'],'additionalProperties':True}
  result=loop.invoke_agent(big_prompt,schema)
  expected_bytes=len((big_prompt+loop.SCHEMA_SUFFIX+json.dumps(schema,separators=(',',':'))).encode('utf-8'))
  self.assertTrue(result['ok']);self.assertEqual(result['n'],expected_bytes)
 def test_shim_installs_the_full_stdin_prompt_as_sys_argv_last(self):
  pkg=Path(self.tmp.name)/'fakepkg';(pkg/'hermes_cli').mkdir(parents=True)
  (pkg/'hermes_cli'/'__init__.py').write_text('')
  (pkg/'hermes_cli'/'main.py').write_text(textwrap.dedent('''\
   import sys, hashlib, json
   def main():
       q = sys.argv[-1]
       sys.stdout.write(json.dumps({"len": len(q), "sha256": hashlib.sha256(q.encode("utf-8")).hexdigest(), "flag_before_query": sys.argv[-2]}))
       return 0
   '''))
  query='owner research notes with non-ascii π☸★. '*300
  wrapper='import sys\nsys.path.insert(0,'+json.dumps(str(pkg))+')\nexec(compile('+json.dumps(loop.HERMES_STDIN_SHIM)+", '<shim>', 'exec'))\n"
  proc=subprocess.run([sys.executable,'-c',wrapper,'chat','-Q','--ignore-rules'],input=query,text=True,capture_output=True,timeout=30)
  self.assertEqual(proc.returncode,0,proc.stderr)
  out=json.loads(proc.stdout)
  self.assertEqual(out['len'],len(query))
  self.assertEqual(out['sha256'],hashlib.sha256(query.encode('utf-8')).hexdigest())
  self.assertEqual(out['flag_before_query'],'-q')

class FallbackGuardTests(unittest.TestCase):
 def setUp(self):
  self.saved=(loop.subprocess.run,loop.HERMES_PYTHON,os.environ.get('GRAYYACHTS_SEO_PROVIDER'))
  os.environ['GRAYYACHTS_SEO_PROVIDER']='hermes'
  loop.HERMES_PYTHON='/nonexistent/hermes-python-does-not-exist'
 def tearDown(self):
  loop.subprocess.run,loop.HERMES_PYTHON,provider=self.saved
  if provider is None:os.environ.pop('GRAYYACHTS_SEO_PROVIDER',None)
  else:os.environ['GRAYYACHTS_SEO_PROVIDER']=provider
 def test_missing_hermes_python_and_oversized_prompt_raises_without_calling_subprocess(self):
  def boom(*a,**k):raise AssertionError('subprocess.run must not be called')
  loop.subprocess.run=boom
  big_prompt='x'*150_000
  schema={'type':'object','properties':{'ok':{'type':'boolean'}},'required':['ok'],'additionalProperties':False}
  with self.assertRaisesRegex(RuntimeError,'GRAYYACHTS_SEO_HERMES_PYTHON'):loop.invoke_agent(big_prompt,schema)

class RunIntegrationTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.state=Path(self.tmp.name)
  self.stack=contextlib.ExitStack()
  self.stack.enter_context(patch.object(loop,'STATE',self.state))
  self.stack.enter_context(patch.object(loop,'today',lambda:dt.date(2026,10,12)))
  self.stack.enter_context(patch.object(loop,'notify',lambda *a:None))
  self.stack.enter_context(patch.object(loop,'check_auth',lambda *a,**k:{'provider':'test'}))
  self.stack.enter_context(patch.dict(loop.os.environ,{'GRAYYACHTS_SEO_RESEARCH_MODE':'reputable_sources','GRAYYACHTS_SEO_PROVIDER':'hermes'}))
 def tearDown(self):self.stack.close();self.tmp.cleanup()
 def test_huge_snapshot_packs_still_produce_a_bounded_prompt(self):
  topics=loop.choose_topics(loop.today())
  official=snapshot_pack(len(topics),20_000,'official','off')
  for topic,item in zip(topics,official):item['topicId']=topic['id'];item['url']=topic['sourceUrl'];item['requestedUrl']=topic['sourceUrl']
  reputable=snapshot_pack(13,20_000,'reputable','rep')
  seen={}
  def fake_invoke(prompt,schema):
   seen['prompt']=prompt;seen['schema']=schema
   updates=[{'topicId':t['id'],'changeType':'unchanged','sourceUrl':t['sourceUrl'],'sourcePublishedAt':None,'summary':'No material change.'} for t in topics]
   return {'updates':updates,'draft':None,'revisionProposal':None,'earnedMediaIdeas':[],'critique':{'findings':[],'revisionsMade':[],'lesson':'x'},'experimentProposal':None}
  with patch.object(public_sources,'snapshots',lambda topics:official),patch.object(public_sources,'reputable_snapshots',lambda day:reputable),patch.object(loop,'invoke_agent',fake_invoke):
   loop.run(argparse.Namespace(dry_run=False))
  reserved=len((loop.SCHEMA_SUFFIX+json.dumps(seen['schema'],separators=(',',':'))).encode('utf-8'))
  self.assertLessEqual(len(seen['prompt'].encode('utf-8'))+reserved,loop.MAX_PROMPT_BYTES)
  self.assertEqual(loop.read(self.state/'state.json')['lastSuccess'],'2026-10-12')

if __name__=='__main__':unittest.main()
