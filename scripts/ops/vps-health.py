#!/usr/bin/env python3
"""Daily Gray Yachts automation health email (runs on the VPS, 08:00 PT).

Added 2026-10-20 after three silent breaks in one week: the newsletter's Codex login expired
(2026-10-02..18, failures only in a local file), the SEO agent researched with no web tools
after its move to the VPS, and the newsletter prompt outgrew Linux's argument limit.
Each check reports what it saw; anything it cannot read is a problem, never a pass.
Usage: vps_health.py [--dry-run]   (dry run prints instead of emailing)
"""
import base64
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

LA = ZoneInfo('America/Los_Angeles')
SEO = Path('/opt/grayyachts-automation/private/seo-editorial')
NEWSLETTER = Path('/root/.hermes/scripts/grayyachts-newsletter.py')
CRON_OUT = Path('/root/.hermes/cron/output/4c4b201a5833')
AUTH = Path('/root/.hermes/auth.json')
RESEND_ENV = Path('/opt/grayyachts-automation/private/seo.env')
TO = 'connorgray@jeffbrownyachts.com'
# Same pattern as scripts/seo/editorial_loop.py TOOL_FAILURE.
TOOL_FAILURE = re.compile(r'(?:providers?|backends?) (?:is |are )?not configured|no [a-z ]{0,30}?(?:providers?|backends?) (?:is |are )?configured|(?:retrieval|fetch|extraction)\b[^.]{0,80}?\bfailed|search (?:fallback )?(?:is |was )?(?:also )?unavailable|web (?:tools?|access) (?:is |are |was |were )?unavailable', re.I)
# Failing services that are not Gray Yachts automation; listed, but they do not mark the email ACTION NEEDED.
OTHER_UNITS = ('graycapital-', 'simon-backup')

now = dt.datetime.now(LA)
today = now.date().isoformat()
checks = []  # (name, ok, detail)

def check(name, fn):
    try:
        ok, detail = fn()
    except Exception as error:  # an unreadable check is a failure, not a pass
        ok, detail = False, f'check could not run: {type(error).__name__}: {str(error)[:200]}'
    checks.append((name, ok, detail))

def seo():
    state = json.loads((SEO / 'state.json').read_text())
    run = SEO / 'runs' / f'{today}.json'
    if state.get('blocked'):
        return False, f"PAUSED after failures. Last error: {str(state.get('lastError'))[:200]}"
    if state.get('lastSuccess') != today or not run.exists():
        return False, f"no successful run today (last success {state.get('lastSuccess')}, failures {state.get('failures')}, last error {str(state.get('lastError'))[:160]})"
    result = json.loads(run.read_text())
    updates = result.get('updates', [])
    broken = sum(bool(TOOL_FAILURE.search(u.get('summary', ''))) for u in updates)
    changed = sum(u.get('changeType') == 'changed' for u in updates)
    draft = (result.get('draft') or {}).get('title')
    detail = f"{len(updates)} topics researched, {changed} with new information, {broken} with web-tool failures; draft: {draft or 'none (research day)'}"
    return broken * 2 < max(len(updates), 1) and len(updates) > 0, detail

def newsletter():
    pre = subprocess.run(['python3', str(NEWSLETTER), 'preflight'], capture_output=True, text=True, timeout=180, cwd=NEWSLETTER.parent)
    info = json.loads(pre.stdout)
    ctx = json.loads(subprocess.run(['python3', str(NEWSLETTER), 'context'], capture_output=True, text=True, timeout=180, cwd=NEWSLETTER.parent).stdout)
    slots = sorted(e['slot'] for e in ctx.get('recent_editions', []) if e.get('title'))
    last = slots[-1] if slots else None
    days = (now.date() - dt.date.fromisoformat(last)).days if last else 999
    cutoff = dt.datetime.now() - dt.timedelta(hours=24)
    outputs = [p for p in CRON_OUT.glob('*.md') if dt.datetime.fromtimestamp(p.stat().st_mtime) > cutoff]
    failed = sum('Status:** script failed' in p.read_text(errors='ignore') for p in outputs)
    problems = list(info.get('problems', []))
    if failed:
        problems.append(f'{failed} failed cron runs in the last 24 h')
    if days > 4:
        problems.append(f'no new edition for {days} days')
    detail = f"latest edition {last} ({days} days ago); next slot {info['slot']} (due now: {info['due']}); prompt {info['prompt_bytes']:,} bytes; {info['images_available']} unused images; {len(outputs)} cron runs in 24 h, {failed} failed"
    return not problems, detail + ('. PROBLEMS: ' + '; '.join(problems) if problems else '')

def codex_login():
    status = subprocess.run(['hermes', 'auth', 'status', 'openai-codex'], capture_output=True, text=True, timeout=60)
    text = (status.stdout or status.stderr).strip()
    cred = json.loads(AUTH.read_text())['credential_pool']['openai-codex'][0]
    token = cred.get('access_token', '')
    payload = token.split('.')[1] + '=' * (-len(token.split('.')[1]) % 4) if token.count('.') == 2 else ''
    exp = dt.datetime.fromtimestamp(json.loads(base64.urlsafe_b64decode(payload))['exp'], dt.timezone.utc) if payload else None
    hours = (exp - dt.datetime.now(dt.timezone.utc)).total_seconds() / 3600 if exp else None
    error = cred.get('last_error_message') or cred.get('last_error_code')
    ok = 'logged in' in text and not error and hours is not None and hours > 24
    detail = f"{text}; access token valid for {hours:.0f} more hours (renews itself when used)" if hours is not None else text
    if error:
        detail += f"; last error: {str(error)[:200]}"
    if not ok:
        detail += '. To fix: log Hermes back in on the VPS (hermes auth add openai-codex, device code).'
    return ok, detail

def services():
    names = subprocess.run(['systemctl', '--failed', '--plain', '--no-legend'], capture_output=True, text=True, timeout=30).stdout.split()
    failed = [n for n in names if n.endswith(('.service', '.timer'))]
    ours = [n for n in failed if not n.startswith(OTHER_UNITS)]
    other = [n for n in failed if n.startswith(OTHER_UNITS)]
    disk = shutil.disk_usage('/')
    pct = disk.used * 100 // disk.total
    detail = f"failing Gray Yachts services: {', '.join(ours) or 'none'}; other failing services: {', '.join(other) or 'none'}; disk {pct}% used"
    return not ours and pct < 85, detail

# Unrecorded live changes (added 2026-10-22): on 2026-10-20 a config file was switched off and
# Cloudflare Access was put in front of the Command Center with no record of who did it.
# Every live change must have a matching `coord log ... --paths <file>` entry in the agent-ops ledger.
LEDGER = Path('/opt/agent-ops')
INVENTORY = Path('/opt/grayyachts-health/inventory.json')
PENDING = Path('/opt/grayyachts-health/pending-findings.json')
WATCH = ['/etc/systemd/system', '/root/.config/graycapital', '/opt/grayyachts-automation/private/config',
         '/opt/grayyachts-automation/source', '/opt/grayyachts-automation/marketplace', '/opt/grayyachts-automation/pnw-sync',
         '/opt/grayyachts-seo/scripts', '/opt/grayyachts-seo/content', '/opt/grayyachts-health/vps_health.py',
         '/root/.hermes/config.yaml', '/root/.hermes/SOUL.md', '/root/.hermes/scripts']
# Job-written state (collector status/history, browser state, *-state.json) is not a change anyone makes.
SKIP = re.compile(r'(__pycache__|\.pyc$|\.bak|\.tmp$|/node_modules/|/\.git/|-state\.json$|/(collection-status|query-history|browser-state)\.json$)')
WINDOW = dt.timedelta(hours=24)
# Agents log after changing: an entry covers a change made up to 24 h before it, or up to 30 min after it
# (clock skew, or logging just ahead of the final write). An older entry never covers a newer edit.
BEFORE, AFTER = dt.timedelta(minutes=30), dt.timedelta(hours=24)

def canon(p):
    """One name per file: resolve directory symlinks (/root/.config/graycapital is a link into /opt) but keep a
    symlinked file as its own entry. On 2026-10-23 the same file appeared under two names and was reported
    unrecorded although its change had been logged under the other name."""
    p = Path(p)
    return os.path.join(os.path.realpath(p.parent), p.name)

def inventory(watch=WATCH):
    """{path: [mtime, size]} for files and [mtime, 'link:<target>'] for symlinks (lstat, never followed),
    so masking a unit (a symlink to /dev/null) or re-pointing one is a change."""
    files = {}
    for root in watch:
        base = Path(root)
        # A watch root that is a directory is walked. If the root itself is a symlink it is also inventoried
        # as a link, so repointing it (e.g. /root/.config/graycapital) is a change in its own right.
        roots = [base] if base.is_symlink() else []
        for f in list(roots) + (list(base.rglob('*')) if base.is_dir() else [base] if base.is_file() else []):
            if SKIP.search(str(f)): continue
            st = f.lstat()
            # The change time is the later of mtime and ctime: ctime moves on every content, permission or
            # owner change and can't be preserved by a copy or restore. ctime_ns, mode and owner are part of
            # the fingerprint (a lost executable bit breaks a job without touching mtime or size).
            changed_at = max(st.st_mtime, st.st_ctime)
            if f.is_symlink():
                # The resolved target is saved with the scan: a later check must not re-resolve it through
                # today's symlink chain (a repointed intermediate link would move the old target).
                files[canon(f)] = [changed_at, 'link:' + os.readlink(f), st.st_mode, st.st_uid, st.st_gid, st.st_ctime_ns, os.path.realpath(f)]
            elif f.is_file():
                files[canon(f)] = [changed_at, st.st_size, st.st_mode, st.st_uid, st.st_gid, st.st_ctime_ns]
    return files

def watched(path, watch=None):
    """True if path lies under a watch root in its own right (then only its own entries cover it).
    The watch list is read at call time (a default argument would freeze the list at import)."""
    real = os.path.realpath(path)
    return any(real == os.path.realpath(r) or real.startswith(os.path.realpath(r).rstrip('/') + '/') for r in (WATCH if watch is None else watch))

def names(path, watch=None):
    """The canonical path plus its alias under any symlinked watch root, so an entry naming the alias's parent
    (/root/.config) covers files that are inventoried under the real directory (/opt/...)."""
    out = {path}
    for r in (WATCH if watch is None else watch):
        real = os.path.realpath(r).rstrip('/'); alias = r.rstrip('/')
        # Only a directory alias has names worth adding. A watch root that is a symlink to a file, or a
        # dangling one, stays its own entry: logging the link never covers an edit or deletion of its target.
        if real != alias and os.path.isdir(real) and (path == real or path.startswith(real + '/')): out.add(alias + path[len(real):])
    return out

def previous_targets(previous):
    """{link path: resolved target at the previous scan}. Saved targets are used when present; older
    inventories fall back to resolving the saved link text, which follows today's symlink state."""
    out = {}
    for k, v in previous.items():
        if isinstance(v[1], str) and v[1].startswith('link:'):
            out[k] = v[6] if len(v) > 6 else os.path.realpath(os.path.join(os.path.dirname(k), v[1][5:]))
    return out

def fingerprint(v):
    return list(v[:6])  # the saved resolved target (index 6) is context, not part of the change fingerprint

def ledger_entries(ledger=LEDGER, previous_links=None):
    """(time, [exact paths]) for every change entry; `paths:` is comma-separated."""
    entries = []
    for entry in (ledger / 'changes').rglob('*.md'):
        text = entry.read_text(errors='ignore')
        at = re.search(r'^at: (\S+)', text, re.M)
        paths = re.search(r'^paths: (.*)$', text, re.M)
        if not at or not paths: continue
        when = dt.datetime.fromisoformat(at.group(1).replace('Z', '+00:00'))
        # Every recorded path is kept under both its canonical name and its fully resolved name, so an entry
        # naming an alias directory (/root/.config/graycapital) covers children under the real path (/opt/...),
        # and a path deleted through an alias still matches (realpath resolves the parents that exist).
        recorded = []
        for x in (x.strip().rstrip('/') for x in paths.group(1).split(',') if x.strip()):
            recorded += [x, canon(x)]
            # Fully resolve plain paths (including deleted ones, whose existing parents resolve) and directory
            # aliases only. A symlink to a file, or a dangling one left by a deleted unit, covers itself and
            # never its target: an unlogged edit or deletion of the unit file must still show.
            real = os.path.realpath(x)
            if not os.path.islink(x) or os.path.isdir(real): recorded.append(real)
            # A logged repoint of a directory symlink also covers what lived under its previous target.
            old_target = (previous_links or {}).get(canon(x))
            if old_target and not watched(old_target): recorded.append(PreviousTarget(old_target))
        # An explicitly logged path keeps full coverage even when the same directory is also an inferred
        # previous target (PreviousTarget compares equal to the plain string, so a plain set could drop either).
        explicit = {x for x in recorded if not isinstance(x, PreviousTarget)}
        inferred = {x for x in recorded if isinstance(x, PreviousTarget) and str(x) not in explicit}
        entries.append((when, sorted(explicit | inferred)))
    return entries

class PreviousTarget(str):
    """A directory covered only because a logged symlink used to point at it. A watch root nested inside it
    is tracked in its own right, so the repoint entry never covers that root's files (Codex review, PR #68)."""

def covers(recorded, path):
    previous = isinstance(recorded, PreviousTarget)  # rstrip() below returns a plain str
    recorded = recorded.rstrip('/')
    hit = path == recorded or path.startswith(recorded + '/')
    if hit and previous:
        real = os.path.realpath(path)
        for r in WATCH:
            # A watch root nested under the old target is checked by both its alias name (it may itself be a
            # symlink that resolves elsewhere) and its resolved location; a hit on either is excluded.
            for root, p in ((r.rstrip('/'), path.rstrip('/')), (os.path.realpath(r).rstrip('/'), real)):
                if root.startswith(recorded + '/') and (p == root or p.startswith(root + '/')): return False
    return hit

def drift(current, previous, entries, now_utc, previous_scan=None, windows=None):
    """Return (changed, unrecorded) paths.

    With a saved inventory, every difference since the last scan counts, however old its mtime (a late or
    missed run must not hide changes). Without one (first run), files modified in the last 24 h count.
    Each change needs a ledger entry naming that exact path (or a parent directory): logged between the
    previous scan and now, or on the first run between 30 min before and 24 h after the file's mtime."""
    changes = {}
    for path, (mtime, *_rest) in current.items():
        when = dt.datetime.fromtimestamp(mtime, dt.timezone.utc)
        if previous_scan is not None:
            # The change happened after the previous scan, whatever mtime says (restores keep old mtimes).
            # Logged after the later of the previous scan and the file's mtime (restored files keep old mtimes,
            # and a morning entry must not cover an unlogged afternoon edit).
            if path not in previous or fingerprint(previous[path]) != fingerprint(current[path]): changes[path] = (max(previous_scan, when) - BEFORE, now_utc + BEFORE)
        elif when >= now_utc - WINDOW: changes[path] = (when - BEFORE, when + AFTER)
    if previous_scan is not None:
        for path in previous:
            if path not in current: changes[path + ' (deleted)'] = (previous_scan - BEFORE, now_utc + BEFORE)
    if windows is not None: windows.update(changes)  # each finding's own matching bounds, for pending retries
    missing = []
    for label, (lo, hi) in changes.items():
        path = label.removesuffix(' (deleted)')
        if not any(lo <= at <= hi and any(covers(r, n) for r in paths for n in names(path)) for at, paths in entries):
            missing.append(label)
    return sorted(changes), sorted(missing)

def unrecorded():
    """Returns (ok, detail, commit) — call commit() only after the email is delivered, so findings
    are re-reported if delivery fails."""
    if not (LEDGER / 'changes').is_dir(): return False, f'ledger not found at {LEDGER}; cannot verify live changes', None
    pull = subprocess.run(['git', '-C', str(LEDGER), 'pull', '-q', '--rebase'], capture_output=True, text=True, timeout=60)
    if pull.returncode: return False, 'ledger sync failed, so live changes could not be verified: ' + (pull.stderr or pull.stdout).strip()[:160], None
    saved = json.loads(INVENTORY.read_text()) if INVENTORY.exists() else None
    # Apply the current exclusions to the saved inventory and pending findings too, so files that became
    # excluded after an upgrade are not reported as deleted.
    previous = {canon(k): v for k, v in (saved['files'] if saved else {}).items() if not SKIP.search(k)}  # older saves used alias names
    previous_scan = dt.datetime.fromisoformat(saved['scanned_at']) if saved else None
    now_utc = dt.datetime.now(dt.timezone.utc)
    current = inventory()
    # Symlink entries of the last scan give each alias's previous target ('link:<target>' fingerprints).
    entries = ledger_entries(previous_links=previous_targets(previous))
    windows = {}
    changed, missing = drift(current, previous, entries, now_utc, previous_scan, windows)
    # Findings from runs whose email failed stay pending until a ledger entry covers them or they are delivered.
    # Each undelivered finding is its own event with the bounds it was found with; several events can
    # exist for one path. An event clears only when a ledger entry falls inside its own bounds, or on delivery.
    events = [[m, windows[m][0].isoformat(), windows[m][1].isoformat()] for m in missing]
    for label, lo, hi in (json.loads(PENDING.read_text()) if PENDING.exists() else []):
        path = label.removesuffix(' (deleted)')
        if SKIP.search(path): continue
        path = canon(path); label = path + (' (deleted)' if label.endswith(' (deleted)') else '')
        if [label, lo, hi] in events: continue
        if not any(dt.datetime.fromisoformat(lo) <= at <= dt.datetime.fromisoformat(hi) and any(covers(r, n) for r in paths for n in names(path)) for at, paths in entries):
            events.append([label, lo, hi])
    missing, changed = sorted({e[0] for e in events}), sorted(set(changed) | {e[0] for e in events})
    if '--dry-run' not in sys.argv:
        PENDING.write_text(json.dumps(events))
    since = f"since the last check ({previous_scan:%Y-%m-%d %H:%M} UTC)" if previous_scan else 'in the last 24 h (first check: deletions tracked from the next run)'
    detail = f"{len(changed)} live files changed {since}, {len(missing)} with no ledger entry"
    # List every finding: the baseline advances once the email is sent, so anything not listed would be lost.
    if missing: detail += ':\n       ' + '\n       '.join(missing) + '\n     Find who changed them and record it with `coord log … --paths`.'
    def commit():  # after delivery: advance the baseline and clear delivered findings
        INVENTORY.write_text(json.dumps({'scanned_at': now_utc.isoformat(), 'files': current}))
        PENDING.unlink(missing_ok=True)
    return not missing, detail, commit

# Machine routes the VPS jobs call. Without a token each must reach the app and get its 401; anything else
# (Access login redirect, Cloudflare bot block, 404, 5xx, a redirect) means the jobs cannot use it.
# (route, method the job uses) — probing with the wrong method returns 405 even when healthy.
ROUTES = [('/api/fb-crm/sweep', 'POST'), ('/api/fb-crm/reminders', 'GET'), ('/api/valuation-leads/reminders', 'GET'), ('/api/jobs', 'POST')]
class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None

def probe(route, method):
    try:
        r = urllib.request.build_opener(_NoRedirect).open(urllib.request.Request('https://command.graycapital.org' + route, method=method, data=b'{}' if method == 'POST' else None, headers={'User-Agent': 'GrayYachts-Health/1.0', 'Content-Type': 'application/json'}), timeout=20)
        return r.status, r.headers, r.read(400).decode(errors='ignore')
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read(400).decode(errors='ignore')

def classify(code, headers, body=''):
    if 'cloudflareaccess.com' in (headers.get('Location') or ''): return 'behind the Cloudflare Access login'
    if 'cfOrigin;dur=0' in (headers.get('Server-Timing') or '') and code != 401: return f'blocked by Cloudflare ({code})'
    # The app's middleware also answers 401 ("Sign in required") when a machine route is missing from its
    # exemption list; only the route's own token check ("unauthorized") means the job can get through.
    if code == 401 and re.search(r'sign.?in required', body, re.I): return "rejected by the app's sign-in check (route not exempted for machine tokens)"
    if 'cloudflare-access' in (headers.get('WWW-Authenticate') or '').lower(): return f'Cloudflare Access challenge ({code})'
    # Healthy only when the route's own token check answers: {"error":"unauthorized"}.
    if code == 401 and re.search(r'"error"\s*:\s*"unauthorized"', body, re.I): return None
    return f'unexpected {code}' + (f" → {headers.get('Location')}" if headers.get('Location') else '')

def command_center():
    problems = []
    for route, method in ROUTES:
        try: issue = classify(*probe(route, method))
        except Exception as error: issue = f'unreachable ({type(error).__name__})'
        if issue: problems.append(f'{route}: {issue}')
    return not problems, '; '.join(problems) or f'all {len(ROUTES)} machine routes reach the app and require their token'

def main():
    check('SEO agent (today 07:15 PT)', seo)
    check('Newsletter', newsletter)
    check('Hermes Codex login', codex_login)
    check('VPS services and disk', services)
    try:
        ok, detail, commit_inventory = unrecorded()
    except Exception as error:
        ok, detail, commit_inventory = False, f'check could not run: {type(error).__name__}: {str(error)[:200]}', None
    checks.append(('Unrecorded live changes', ok, detail))
    check('Command Center machine routes', command_center)

    bad = [name for name, ok, _ in checks if not ok]
    subject = f"Gray Yachts automation: {'ACTION NEEDED — ' + ', '.join(bad) if bad else 'all OK'} ({today})"
    body = '\n\n'.join(f"{'OK  ' if ok else 'FIX '} {name}\n     {detail}" for name, ok, detail in checks)
    body += '\n\nSent daily at 08:00 PT by grayyachts-health.timer on the VPS (scripts/ops/vps-health.py).'

    if '--dry-run' in sys.argv:  # a dry run never moves the baseline
        print(subject + '\n\n' + body)
        return
    key = next((l.split('=', 1)[1].strip().strip('"\'') for l in RESEND_ENV.read_text().splitlines() if l.startswith('RESEND_API_KEY=')), '')
    request = urllib.request.Request('https://api.resend.com/emails', data=json.dumps({'from': 'Gray Yachts Health <onboarding@resend.dev>', 'to': [TO], 'subject': subject, 'text': body}).encode(),
                                     headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'GrayYachts-Health/1.0'})
    with urllib.request.urlopen(request, timeout=25) as response:
        response.read()
    if commit_inventory: commit_inventory()  # only after delivery, so undelivered findings are re-reported
    print(subject)


if __name__ == '__main__':
    main()
