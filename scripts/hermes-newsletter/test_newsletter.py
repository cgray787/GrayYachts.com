"""Unit tests for newsletter.py's run path. No network: request, agent and the alert transport are mocked."""
import datetime as dt
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import types
import unittest
from unittest.mock import patch
from zoneinfo import ZoneInfo

HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE))
spec=importlib.util.spec_from_file_location('newsletter',HERE/'newsletter.py')
newsletter=importlib.util.module_from_spec(spec);spec.loader.exec_module(newsletter)

def today_slot():return dt.datetime.now(ZoneInfo('America/Los_Angeles')).date().isoformat()

class RunAlertTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.work=Path(self.tmp.name)
        self.emails=[]
        class Response:
            def read(self):return b'{}'
            def __enter__(self):return self
            def __exit__(self,*a):return None
        def fake_urlopen(req,timeout=None):
            self.emails.append(json.loads(req.data));return Response()
        self.stack=__import__('contextlib').ExitStack()
        self.stack.enter_context(patch.object(newsletter,'WORK',self.work))
        self.stack.enter_context(patch.object(newsletter.urllib.request,'urlopen',fake_urlopen))
        self.stack.enter_context(patch.dict(os.environ,{'RESEND_API_KEY':'test-key'}))
        (self.work/'shows.json').write_text('[]')
    def tearDown(self):self.stack.close();self.tmp.cleanup()
    def ctx(self,slot='2026-10-23',due=True):
        return {'slot':slot,'due':due,'asOf':'x','image_library':{'available':[],'owner':{'available':[],'unused':15,'warning':None}}}

    def test_context_failure_alerts_with_todays_slot(self):
        with patch.object(newsletter,'request',side_effect=RuntimeError('Newsletter HTTP 401: {"error":"bad token"}')):
            with self.assertRaises(RuntimeError):newsletter.run()
        self.assertEqual(len(self.emails),1)
        self.assertIn(today_slot(),self.emails[0]['subject']);self.assertIn('HTTP 401',self.emails[0]['text'])
        self.assertTrue((self.work/(today_slot()+'.alerted')).exists())

    def test_alert_is_sent_once_per_slot(self):
        with patch.object(newsletter,'request',side_effect=RuntimeError('Newsletter HTTP 500: down')):
            for _ in range(2):
                with self.assertRaises(RuntimeError):newsletter.run()
        self.assertEqual(len(self.emails),1)

    def test_post_agent_status_failure_alerts_with_the_edition_slot(self):
        proc=types.SimpleNamespace(returncode=0)
        with patch.object(newsletter,'context',return_value=self.ctx()),patch.object(newsletter,'agent',return_value=proc),patch.object(newsletter,'request',side_effect=RuntimeError('Newsletter HTTP 502: upstream')):
            with self.assertRaises(RuntimeError):newsletter.run()
        self.assertEqual(len(self.emails),1);self.assertIn('2026-10-23',self.emails[0]['subject']);self.assertIn('HTTP 502',self.emails[0]['text'])
        self.assertEqual((self.work/'2026-10-23.attempts').read_text(),'1')

    def test_missing_draft_alerts_and_fails(self):
        proc=types.SimpleNamespace(returncode=0)
        with patch.object(newsletter,'context',return_value=self.ctx()),patch.object(newsletter,'agent',return_value=proc),patch.object(newsletter,'request',return_value={'issues':[],'delivery':None}):
            with self.assertRaises(RuntimeError):newsletter.run()
        self.assertEqual(len(self.emails),1);self.assertIn('did not store a draft',self.emails[0]['text'])

    def test_agent_crash_alerts_with_attempt_number(self):
        with patch.object(newsletter,'context',return_value=self.ctx()),patch.object(newsletter,'agent',side_effect=OSError('hermes binary missing')):
            with self.assertRaises(OSError):newsletter.run()
        self.assertEqual(len(self.emails),1);self.assertIn('attempt 1 of 3',self.emails[0]['text']);self.assertIn('hermes binary missing',self.emails[0]['text'])

    def test_not_due_does_nothing(self):
        with patch.object(newsletter,'context',return_value=self.ctx(due=False)),patch.object(newsletter,'agent',side_effect=AssertionError('must not run')):
            newsletter.run()
        self.assertEqual(self.emails,[])

    def test_three_attempts_alerts_without_running_the_agent(self):
        (self.work/'2026-10-23.attempts').write_text('3')
        with patch.object(newsletter,'context',return_value=self.ctx()),patch.object(newsletter,'agent',side_effect=AssertionError('must not run')):
            newsletter.run()
        self.assertEqual(len(self.emails),1);self.assertIn('three attempts',self.emails[0]['text'])

    def test_success_sends_no_alert(self):
        proc=types.SimpleNamespace(returncode=0)
        status={'issues':[{'slot':'2026-10-23','title':'Edition'}],'delivery':'queued'}
        with patch.object(newsletter,'context',return_value=self.ctx()),patch.object(newsletter,'agent',return_value=proc),patch.object(newsletter,'request',return_value=status):
            newsletter.run()
        self.assertEqual(self.emails,[])

    def test_low_owner_photos_alerts_but_does_not_raise(self):
        proc=types.SimpleNamespace(returncode=0)
        status={'issues':[{'slot':'2026-10-23','title':'Edition'}],'delivery':'queued'}
        ctx=self.ctx();ctx['image_library']['owner']={'available':[],'unused':3,'warning':'low'}
        with patch.object(newsletter,'context',return_value=ctx),patch.object(newsletter,'agent',return_value=proc),patch.object(newsletter,'request',return_value=status):
            newsletter.run()
        self.assertEqual(len(self.emails),1)
        self.assertIn('fewer than 10 unused Connor photos',self.emails[0]['text'])
        self.assertIn('3 left',self.emails[0]['text'])
        self.assertTrue((self.work/'2026-10-23.alerted').exists())

    def test_sufficient_owner_photos_sends_no_alert(self):
        proc=types.SimpleNamespace(returncode=0)
        status={'issues':[{'slot':'2026-10-23','title':'Edition'}],'delivery':'queued'}
        ctx=self.ctx();ctx['image_library']['owner']={'available':[],'unused':15,'warning':None}
        with patch.object(newsletter,'context',return_value=ctx),patch.object(newsletter,'agent',return_value=proc),patch.object(newsletter,'request',return_value=status):
            newsletter.run()
        self.assertEqual(self.emails,[])

    def test_missing_owner_key_treated_as_low_without_crashing(self):
        proc=types.SimpleNamespace(returncode=0)
        status={'issues':[{'slot':'2026-10-23','title':'Edition'}],'delivery':'queued'}
        ctx=self.ctx();del ctx['image_library']['owner']
        with patch.object(newsletter,'context',return_value=ctx),patch.object(newsletter,'agent',return_value=proc),patch.object(newsletter,'request',return_value=status):
            newsletter.run()
        self.assertEqual(len(self.emails),1)
        self.assertIn('fewer than 10 unused Connor photos',self.emails[0]['text'])
        self.assertIn('0 left',self.emails[0]['text'])

class PreflightOwnerPhotoTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.work=Path(self.tmp.name)
        self.stack=__import__('contextlib').ExitStack()
        self.stack.enter_context(patch.object(newsletter,'WORK',self.work))
        self.stack.enter_context(patch.object(newsletter.subprocess,'run',return_value=types.SimpleNamespace(stdout='logged in',stderr='',returncode=0)))
        (self.work/'BRIEF.md').write_text('brief')
    def tearDown(self):self.stack.close();self.tmp.cleanup()
    def base_ctx(self,owner_unused):
        return {'slot':'2026-10-23','due':True,'asOf':'x',
                'image_library':{'available':[{'id':i} for i in range(9)],'owner':{'available':[],'unused':owner_unused,'warning':None}}}

    def test_reports_problem_when_owner_unused_low(self):
        with patch.object(newsletter,'context',return_value=self.base_ctx(3)):
            result=newsletter.preflight()
        self.assertIn('fewer than 10 unused Connor photos',result['problems'])
        self.assertEqual(result['owner_unused'],3)

    def test_no_problem_when_owner_unused_sufficient(self):
        with patch.object(newsletter,'context',return_value=self.base_ctx(15)):
            result=newsletter.preflight()
        self.assertNotIn('fewer than 10 unused Connor photos',result['problems'])
        self.assertEqual(result['owner_unused'],15)

    def test_missing_owner_key_treated_as_low_without_crashing(self):
        ctx={'slot':'2026-10-23','due':True,'asOf':'x','image_library':{'available':[{'id':i} for i in range(9)]}}
        with patch.object(newsletter,'context',return_value=ctx):
            result=newsletter.preflight()
        self.assertIn('fewer than 10 unused Connor photos',result['problems'])
        self.assertIsNone(result['owner_unused'])

if __name__=='__main__':unittest.main()
