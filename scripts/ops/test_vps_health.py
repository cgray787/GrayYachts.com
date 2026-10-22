"""Tests for the unrecorded-change and Command Center route checks in vps-health.py (run: python3 -m unittest)."""
import datetime as dt
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('vps_health', Path(__file__).with_name('vps-health.py'))
vh = importlib.util.module_from_spec(spec); spec.loader.exec_module(vh)
NOW = dt.datetime(2026, 10, 22, 17, 0, tzinfo=dt.timezone.utc)
ts = lambda d: d.timestamp()

class Drift(unittest.TestCase):
    def test_exact_path_entry_covers_the_change(self):
        cur = {'/etc/x/config.json': [ts(NOW - dt.timedelta(hours=1)), 10]}
        entries = [(NOW - dt.timedelta(minutes=50), ['/etc/x/config.json'])]
        self.assertEqual(vh.drift(cur, {}, entries, NOW)[1], [])
    def test_sibling_with_shared_prefix_is_not_covered(self):  # review finding 3
        cur = {'/etc/x/config.json.disabled': [ts(NOW - dt.timedelta(hours=1)), 10]}
        entries = [(NOW - dt.timedelta(minutes=50), ['/etc/x/config.json'])]
        self.assertEqual(vh.drift(cur, {}, entries, NOW)[1], ['/etc/x/config.json.disabled'])
    def test_directory_entry_covers_children(self):
        cur = {'/opt/app/lib/a.mjs': [ts(NOW - dt.timedelta(hours=1)), 10]}
        entries = [(NOW - dt.timedelta(minutes=40), ['/opt/app/lib/'])]
        self.assertEqual(vh.drift(cur, {}, entries, NOW)[1], [])
    def test_old_entry_does_not_hide_a_later_edit(self):  # review finding 2
        cur = {'/etc/x/a': [ts(NOW - dt.timedelta(hours=1)), 10]}
        entries = [(NOW - dt.timedelta(hours=12), ['/etc/x/a'])]
        self.assertEqual(vh.drift(cur, {}, entries, NOW)[1], ['/etc/x/a'])
    def test_entry_logged_just_after_the_change_counts(self):
        cur = {'/etc/x/a': [ts(NOW - dt.timedelta(hours=2)), 10]}
        entries = [(NOW - dt.timedelta(hours=1, minutes=45), ['/etc/x/a'])]
        self.assertEqual(vh.drift(cur, {}, entries, NOW)[1], [])
    def test_deleted_file_is_reported(self):  # review finding 5
        prev = {'/etc/systemd/system/job.timer': [ts(NOW - dt.timedelta(days=5)), 10]}
        changed, missing = vh.drift({}, prev, [], NOW)
        self.assertEqual(missing, ['/etc/systemd/system/job.timer (deleted)'])
    def test_unchanged_old_file_is_ignored(self):
        old = [ts(NOW - dt.timedelta(days=3)), 10]
        self.assertEqual(vh.drift({'/a': old}, {'/a': old}, [], NOW), ([], []))

class Routes(unittest.TestCase):
    H = lambda self, **h: {k.replace('_', '-'): v for k, v in h.items()}
    def test_app_401_is_healthy(self):
        self.assertIsNone(vh.classify(401, self.H(Server_Timing='cfEdge;dur=3, cfOrigin;dur=40')))
    def test_access_login_redirect(self):
        self.assertIn('Access', vh.classify(302, self.H(Location='https://x.cloudflareaccess.com/cdn-cgi/access/login')))
    def test_cloudflare_bot_block(self):
        self.assertIn('blocked by Cloudflare', vh.classify(403, self.H(Server_Timing='cfEdge;dur=2,cfOrigin;dur=0')))
    def test_other_failures_are_not_healthy(self):  # review finding 1
        for code, headers in [(503, {}), (403, self.H(Server_Timing='cfOrigin;dur=12')), (302, self.H(Location='/login')), (404, {}), (200, {})]:
            self.assertIsNotNone(vh.classify(code, headers), code)

class LedgerSync(unittest.TestCase):  # review finding 4
    def test_missing_ledger_fails(self):
        vh.LEDGER = Path('/nonexistent-ledger')
        ok, detail = vh.unrecorded()
        self.assertFalse(ok); self.assertIn('ledger not found', detail)

if __name__ == '__main__':
    unittest.main()
