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
# Every live change must have a matching `coord log` entry in the shared agent-ops ledger.
LEDGER = Path('/opt/agent-ops')
WATCH = ['/etc/systemd/system', '/root/.config/graycapital', '/opt/grayyachts-automation/private/config',
         '/opt/grayyachts-automation/source', '/opt/grayyachts-automation/marketplace', '/opt/grayyachts-automation/pnw-sync',
         '/opt/grayyachts-seo/scripts', '/opt/grayyachts-seo/content', '/opt/grayyachts-health',
         '/root/.hermes/config.yaml', '/root/.hermes/SOUL.md', '/root/.hermes/scripts']
SKIP = re.compile(r'(__pycache__|\.pyc$|\.bak|\.tmp$|/node_modules/|/\.git/)')

def unrecorded():
    subprocess.run(['git', '-C', str(LEDGER), 'pull', '-q', '--rebase'], capture_output=True, timeout=60)
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=24)
    changed = []
    for root in WATCH:
        base = Path(root)
        files = [base] if base.is_file() else (p for p in base.rglob('*') if p.is_file()) if base.exists() else []
        for f in files:
            if SKIP.search(str(f)): continue
            if dt.datetime.fromtimestamp(f.stat().st_mtime, dt.timezone.utc) >= cutoff: changed.append(str(f))
    recorded = []
    for entry in (LEDGER / 'changes').rglob('*.md'):
        text = entry.read_text(errors='ignore')
        at = re.search(r'^at: (\S+)', text, re.M)
        if not at or dt.datetime.fromisoformat(at.group(1).replace('Z', '+00:00')) < cutoff - dt.timedelta(hours=24): continue
        for field in ('paths', 'system'):
            m = re.search(rf'^{field}: (.*)$', text, re.M)
            if m: recorded += [x.strip() for x in re.split(r'[,\s]+', m.group(1)) if len(x.strip()) > 3]
    missing = [f for f in changed if not any(r in f or f.endswith(r) for r in recorded)]
    detail = f"{len(changed)} live files changed in 24 h, {len(missing)} with no ledger entry"
    if missing: detail += ': ' + ', '.join(missing[:8]) + (' …' if len(missing) > 8 else '') + '. Find who changed them; record with coord log.'
    return not missing, detail

# Machine routes the VPS jobs call. A redirect to the Cloudflare Access login means the jobs are locked out.
ROUTES = ['/api/fb-crm/sweep', '/api/fb-crm/reminders', '/api/valuation-leads/reminders', '/api/jobs']
class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None

def command_center():
    blocked, missing = [], []
    for route in ROUTES:
        try:
            r = urllib.request.build_opener(_NoRedirect).open(urllib.request.Request('https://command.graycapital.org' + route, headers={'User-Agent': 'GrayYachts-Health/1.0'}), timeout=20)
            headers, code = r.headers, r.status
        except urllib.error.HTTPError as e:
            headers, code = e.headers, e.code
        # Cloudflare answers at the edge without reaching the app: an Access login redirect, or a
        # bot block (error 1010) for some clients. Both show `cfOrigin;dur=0` in Server-Timing.
        edge_only = 'cfOrigin;dur=0' in (headers.get('Server-Timing') or '')
        if 'cloudflareaccess.com' in (headers.get('Location') or '') or (edge_only and code in (302, 403)): blocked.append(f'{route} ({code})')
        elif code == 404: missing.append(route)
    problems = ([f"blocked at Cloudflare before reaching the app: {', '.join(blocked)}"] if blocked else []) + ([f"route not found: {', '.join(missing)}"] if missing else [])
    return not problems, '; '.join(problems) or f"all {len(ROUTES)} machine routes reachable by the VPS jobs"

check('SEO agent (today 07:15 PT)', seo)
check('Newsletter', newsletter)
check('Hermes Codex login', codex_login)
check('VPS services and disk', services)
check('Unrecorded live changes', unrecorded)
check('Command Center machine routes', command_center)

bad = [name for name, ok, _ in checks if not ok]
subject = f"Gray Yachts automation: {'ACTION NEEDED — ' + ', '.join(bad) if bad else 'all OK'} ({today})"
body = '\n\n'.join(f"{'OK  ' if ok else 'FIX '} {name}\n     {detail}" for name, ok, detail in checks)
body += '\n\nSent daily at 08:00 PT by grayyachts-health.timer on the VPS (scripts/ops/vps-health.py).'

if '--dry-run' in sys.argv:
    print(subject + '\n\n' + body)
    sys.exit(0)
key = next((l.split('=', 1)[1].strip().strip('"\'') for l in RESEND_ENV.read_text().splitlines() if l.startswith('RESEND_API_KEY=')), '')
request = urllib.request.Request('https://api.resend.com/emails', data=json.dumps({'from': 'Gray Yachts Health <onboarding@resend.dev>', 'to': [TO], 'subject': subject, 'text': body}).encode(),
                                 headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'GrayYachts-Health/1.0'})
with urllib.request.urlopen(request, timeout=25) as response:
    response.read()
print(subject)
