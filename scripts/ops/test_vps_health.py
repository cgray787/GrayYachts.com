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
    def test_deleted_file_is_reported(self):  # first review, finding 5
        prev = {'/etc/systemd/system/job.timer': [ts(NOW - dt.timedelta(days=5)), 10]}
        changed, missing = vh.drift({}, prev, [], NOW, NOW - dt.timedelta(days=1))
        self.assertEqual(missing, ['/etc/systemd/system/job.timer (deleted)'])
    def test_deletion_logged_between_scans_counts(self):  # second review, finding 4
        prev = {'/etc/systemd/system/job.timer': [ts(NOW - dt.timedelta(days=5)), 10]}
        entries = [(NOW - dt.timedelta(hours=2), ['/etc/systemd/system/job.timer'])]
        self.assertEqual(vh.drift({}, prev, entries, NOW, NOW - dt.timedelta(days=1))[1], [])
    def test_restored_file_with_old_mtime_needs_a_fresh_entry(self):  # third review, finding 2
        mtime = [ts(NOW - dt.timedelta(days=5)), 12]
        entries = [(NOW - dt.timedelta(days=5), ['/etc/x/a'])]
        self.assertEqual(vh.drift({'/etc/x/a': mtime}, {'/etc/x/a': [mtime[0], 10]}, entries, NOW, NOW - dt.timedelta(days=1))[1], ['/etc/x/a'])
    def test_morning_entry_does_not_cover_afternoon_edit(self):  # fourth review, finding 1
        cur = {'/etc/x/a': [ts(NOW - dt.timedelta(hours=1)), 12]}
        entries = [(NOW - dt.timedelta(hours=8), ['/etc/x/a'])]
        self.assertEqual(vh.drift(cur, {'/etc/x/a': [ts(NOW - dt.timedelta(days=2)), 10]}, entries, NOW, NOW - dt.timedelta(days=1))[1], ['/etc/x/a'])
    def test_finding_windows_are_reported_for_pending_retries(self):  # fifth review, finding 2
        cur = {'/etc/x/a': [ts(NOW - dt.timedelta(hours=1)), 12]}
        w = {}
        vh.drift(cur, {}, [], NOW, None, w)
        lo, hi = w['/etc/x/a']
        self.assertEqual(lo, NOW - dt.timedelta(hours=1) - vh.BEFORE)
    def test_permission_change_is_a_change(self):  # sixth review, finding 2
        import os, tempfile
        d = tempfile.mkdtemp(); f = os.path.join(d, 'run.sh'); open(f, 'w').write('#!/bin/sh'); os.chmod(f, 0o755)
        before = vh.inventory([d]); st = os.stat(f); os.chmod(f, 0o644); os.utime(f, (st.st_atime, st.st_mtime))
        self.assertNotEqual(before[vh.canon(f)], vh.inventory([d])[vh.canon(f)])
    def test_chmod_after_logged_edit_is_dated_by_ctime(self):  # seventh review
        import os, tempfile, time
        d = tempfile.mkdtemp(); f = os.path.join(d, 'run.sh'); open(f, 'w').write('#!/bin/sh'); os.chmod(f, 0o755)
        st = os.stat(f); os.utime(f, (st.st_atime, st.st_mtime - 3600)); time.sleep(0.01); os.chmod(f, 0o644)
        entry = vh.inventory([d])[vh.canon(f)]
        self.assertGreaterEqual(entry[0], os.stat(f).st_ctime)  # change time follows the chmod, not the old mtime
    def test_directory_alias_resolves_to_one_name(self):  # 2026-10-23 first live run
        import os, tempfile
        real = tempfile.mkdtemp(); alias = os.path.join(tempfile.mkdtemp(), 'cfg'); os.symlink(real, alias)
        open(os.path.join(real, 'a.json'), 'w').write('{}')
        inv = vh.inventory([real, alias])
        # One entry for the file under its real name, plus the alias link itself (repointing it is a change).
        self.assertEqual(set(inv), {os.path.join(os.path.realpath(real), 'a.json'), vh.canon(alias)})
        self.assertEqual(vh.canon(os.path.join(alias, 'a.json')), os.path.join(os.path.realpath(real), 'a.json'))
    def test_alias_directory_entry_covers_real_path_children(self):  # PR #68 review, finding 2
        import os, tempfile
        real = tempfile.mkdtemp(); alias = os.path.join(tempfile.mkdtemp(), 'cfg'); os.symlink(real, alias)
        child = os.path.join(real, 'gmail.json'); open(child, 'w').write('{}')
        old_ledger = vh.LEDGER; d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, 'changes'))
        open(os.path.join(d, 'changes', 'e.md'), 'w').write(f'at: {NOW.isoformat().replace("+00:00","Z")}\npaths: {alias}\n')
        vh.LEDGER = __import__('pathlib').Path(d)
        try: entries = vh.ledger_entries(vh.LEDGER)
        finally: vh.LEDGER = old_ledger
        self.assertTrue(any(vh.covers(r, vh.canon(child)) for _, paths in entries for r in paths))
    def test_repointed_root_symlink_is_a_change(self):  # PR #68 review, finding 1
        import os, tempfile
        a, b = tempfile.mkdtemp(), tempfile.mkdtemp(); link = os.path.join(tempfile.mkdtemp(), 'cfg'); os.symlink(a, link)
        before = vh.inventory([link]); os.remove(link); os.symlink(b, link)
        self.assertNotEqual(before.get(vh.canon(link)), vh.inventory([link]).get(vh.canon(link)))
    def test_deleted_alias_path_is_canonicalised(self):  # PR #68 review, finding 3
        import os, tempfile
        real = tempfile.mkdtemp(); alias = os.path.join(tempfile.mkdtemp(), 'cfg'); os.symlink(real, alias)
        gone = os.path.join(alias, 'removed.json')  # never existed, like a file deleted through the alias
        d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, 'changes'))
        open(os.path.join(d, 'changes', 'e.md'), 'w').write(f'at: {NOW.isoformat().replace("+00:00","Z")}\npaths: {gone}\n')
        entries = vh.ledger_entries(__import__('pathlib').Path(d))
        self.assertTrue(any(vh.covers(r, os.path.join(os.path.realpath(real), 'removed.json')) for _, paths in entries for r in paths))
    def test_newly_excluded_files_are_not_reported_as_deleted(self):  # PR #68 review, second pass
        prev = {'/x/boatwizard/collection-status.json': [ts(NOW - dt.timedelta(days=2)), 10, 0, 0, 0, 0]}
        filtered = {k: v for k, v in prev.items() if not vh.SKIP.search(k)}
        self.assertEqual(vh.drift({}, filtered, [], NOW, NOW - dt.timedelta(days=1)), ([], []))
    def test_logged_repoint_covers_old_target_children(self):  # PR #68 review, third pass
        import os, tempfile
        a, b = tempfile.mkdtemp(), tempfile.mkdtemp(); link = os.path.join(tempfile.mkdtemp(), 'cfg'); os.symlink(a, link)
        prev_links = {vh.canon(link): os.path.realpath(a)}
        d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, 'changes'))
        open(os.path.join(d, 'changes', 'e.md'), 'w').write(f'at: {NOW.isoformat().replace("+00:00","Z")}\npaths: {link}\n')
        entries = vh.ledger_entries(__import__('pathlib').Path(d), prev_links)
        self.assertTrue(any(vh.covers(r, os.path.join(os.path.realpath(a), 'old.json')) for _, paths in entries for r in paths))
    def test_old_target_coverage_skips_independently_watched_dirs(self):  # PR #68 review, fourth pass
        import os, tempfile
        a, b = tempfile.mkdtemp(), tempfile.mkdtemp(); link = os.path.join(tempfile.mkdtemp(), 'cfg'); os.symlink(b, link)  # already repointed a -> b
        d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, 'changes'))
        open(os.path.join(d, 'changes', 'e.md'), 'w').write(f'at: {NOW.isoformat().replace("+00:00","Z")}\npaths: {link}\n')
        old = vh.WATCH; vh.WATCH = [a]
        try: entries = vh.ledger_entries(__import__('pathlib').Path(d), {vh.canon(link): os.path.realpath(a)})
        finally: vh.WATCH = old
        self.assertFalse(any(vh.covers(r, os.path.join(os.path.realpath(a), 'x.json')) for _, paths in entries for r in paths))
    def test_repoint_coverage_excludes_watch_root_nested_in_old_target(self):  # PR #68 review, sixth pass
        import os, tempfile
        a, b = tempfile.mkdtemp(), tempfile.mkdtemp(); sub = os.path.join(a, 'sub'); os.makedirs(sub)
        link = os.path.join(tempfile.mkdtemp(), 'cfg'); os.symlink(b, link)  # repointed a -> b
        d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, 'changes'))
        open(os.path.join(d, 'changes', 'e.md'), 'w').write(f'at: {NOW.isoformat().replace("+00:00","Z")}\npaths: {link}\n')
        old = vh.WATCH; vh.WATCH = [sub]
        try:
            entries = vh.ledger_entries(__import__('pathlib').Path(d), {vh.canon(link): os.path.realpath(a)})
            self.assertTrue(any(vh.covers(r, os.path.join(os.path.realpath(a), 'old.json')) for _, paths in entries for r in paths))
            self.assertFalse(any(vh.covers(r, os.path.join(os.path.realpath(sub), 'unit.service')) for _, paths in entries for r in paths))
        finally: vh.WATCH = old
    def test_logged_file_symlink_does_not_cover_its_target(self):  # PR #68 review, fifth pass
        import os, tempfile
        unit = os.path.join(tempfile.mkdtemp(), 'job.service'); open(unit, 'w').write('[Unit]')
        link = os.path.join(tempfile.mkdtemp(), 'job.service'); os.symlink(unit, link)
        d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, 'changes'))
        open(os.path.join(d, 'changes', 'e.md'), 'w').write(f'at: {NOW.isoformat().replace("+00:00","Z")}\npaths: {link}\n')
        entries = vh.ledger_entries(__import__('pathlib').Path(d), {})
        self.assertTrue(any(vh.covers(r, link) for _, paths in entries for r in paths))
        self.assertFalse(any(vh.covers(r, os.path.realpath(unit)) for _, paths in entries for r in paths))
    def test_relative_symlink_target_resolves_against_link_dir(self):
        import os
        d = '/opt/x'; prev = {'/opt/x/cfg': [0, 'link:../real', 0, 0, 0, 0]}
        links = {k: os.path.realpath(os.path.join(os.path.dirname(k), v[1][5:])) for k, v in prev.items()}
        self.assertEqual(links['/opt/x/cfg'], os.path.realpath('/opt/real'))
    def test_job_state_files_are_skipped(self):
        self.assertTrue(vh.SKIP.search('/x/boatwizard/collection-status.json')); self.assertTrue(vh.SKIP.search('/x/query-history.json'))
        self.assertFalse(vh.SKIP.search('/x/n8n/gmail-outreach.json'))
    def test_symlink_mask_is_a_change(self):  # fourth review, finding 2
        import os, tempfile
        d = tempfile.mkdtemp(); unit = os.path.join(d, 'job.timer')
        open(unit, 'w').write('[Timer]')
        before = vh.inventory([d]); os.remove(unit); os.symlink('/dev/null', unit)
        after = vh.inventory([d]); k = vh.canon(unit)
        self.assertEqual(after[k][1], 'link:/dev/null'); self.assertNotEqual(before[k], after[k])
    def test_late_scan_still_sees_older_changes(self):  # second review, finding 3
        old, new = [ts(NOW - dt.timedelta(days=4)), 10], [ts(NOW - dt.timedelta(days=2)), 11]
        changed, missing = vh.drift({'/etc/x/a': new}, {'/etc/x/a': old}, [], NOW, NOW - dt.timedelta(days=3))
        self.assertEqual(missing, ['/etc/x/a'])
    def test_unchanged_old_file_is_ignored(self):
        old = [ts(NOW - dt.timedelta(days=3)), 10]
        self.assertEqual(vh.drift({'/a': old}, {'/a': old}, [], NOW), ([], []))

class Routes(unittest.TestCase):
    H = lambda self, **h: {k.replace('_', '-'): v for k, v in h.items()}
    def test_app_401_is_healthy(self):
        self.assertIsNone(vh.classify(401, self.H(Server_Timing='cfEdge;dur=3, cfOrigin;dur=40'), '{"error":"unauthorized"}'))
    def test_access_login_redirect(self):
        self.assertIn('Access', vh.classify(302, self.H(Location='https://x.cloudflareaccess.com/cdn-cgi/access/login')))
    def test_middleware_sign_in_401_is_not_healthy(self):  # third review, finding 1
        self.assertIn('sign-in', vh.classify(401, {}, '{"error":"Sign in required."}'))
        self.assertIn('sign-in', vh.classify(401, {}, '{"error":"Cloudflare Access sign-in required."}'))
        self.assertIsNone(vh.classify(401, {}, '{"error":"unauthorized"}'))
    def test_access_401_and_unknown_401_are_not_healthy(self):  # fifth review, finding 1
        self.assertIsNotNone(vh.classify(401, self.H(WWW_Authenticate='Cloudflare-Access resource_metadata="x"'), ''))
        self.assertIsNotNone(vh.classify(401, {}, 'Unauthorized'))
    def test_cloudflare_bot_block(self):
        self.assertIn('blocked by Cloudflare', vh.classify(403, self.H(Server_Timing='cfEdge;dur=2,cfOrigin;dur=0')))
    def test_other_failures_are_not_healthy(self):  # review finding 1
        for code, headers in [(503, {}), (403, self.H(Server_Timing='cfOrigin;dur=12')), (302, self.H(Location='/login')), (404, {}), (200, {})]:
            self.assertIsNotNone(vh.classify(code, headers), code)

class Methods(unittest.TestCase):  # second review, finding 1
    def test_post_only_routes_are_probed_with_post(self):
        methods = dict(vh.ROUTES)
        self.assertEqual(methods['/api/jobs'], 'POST'); self.assertEqual(methods['/api/fb-crm/sweep'], 'POST')
        self.assertEqual(methods['/api/valuation-leads/reminders'], 'GET')

class LedgerSync(unittest.TestCase):  # review finding 4
    def test_missing_ledger_fails(self):
        vh.LEDGER = Path('/nonexistent-ledger')
        ok, detail, commit = vh.unrecorded()
        self.assertIsNone(commit)  # nothing to save when verification failed
        self.assertFalse(ok); self.assertIn('ledger not found', detail)

if __name__ == '__main__':
    unittest.main()
