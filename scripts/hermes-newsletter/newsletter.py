#!/usr/bin/env python3
"""Hermes job wrapper and authenticated draft transport. Credentials stay local."""
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo
from show_calendar import show_context, due_date, TOPICS

HOME = Path.home()
WORK = HOME / '.hermes/workspaces/grayyachts-newsletter'
SECRET = HOME / '.config/grayyachts/newsletter-automation-secret'
START = dt.date(2026, 9, 8)
SITE = 'https://grayyachts.com'

def request(path, payload=None):
    req = urllib.request.Request(SITE + path, data=None if payload is None else json.dumps(payload).encode(), headers={'Authorization': 'Bearer ' + SECRET.read_text().strip(), 'Content-Type': 'application/json', 'User-Agent': 'GrayYachts-Hermes-Newsletter/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'Newsletter HTTP {error.code}: {error.read(2000).decode()}') from None

# Failure alert (added 2026-10-19): Codex OAuth expired and every run failed from 2026-10-02 to 10-18
# while the cron delivered output only to a local file. One email per edition slot.
ALERT_TO = 'connorgray@jeffbrownyachts.com'
RESEND_ENV = Path('/opt/grayyachts-automation/private/seo.env')

def alert(slot, reason):
    marker = WORK / (slot + '.alerted')
    if marker.exists():
        return
    key = os.environ.get('RESEND_API_KEY', '').strip()
    if not key and RESEND_ENV.exists():
        key = next((l.split('=', 1)[1].strip().strip('"\'') for l in RESEND_ENV.read_text().splitlines() if l.startswith('RESEND_API_KEY=')), '')
    log = WORK / (slot + '.agent.log')
    hint = ''
    if log.exists():
        hits = [l for l in log.read_text(errors='ignore').splitlines() if any(w in l.lower() for w in ('error', 'failed', 'expired', 'invalid', '401'))]
        hint = hits[-1][:400] if hits else ''
    body = f'The Gray Yachts newsletter edition for {slot} failed.\n\nReason: {reason}\nLast agent log error: {hint or "none found"}\n\nIf this is a Codex login problem, re-run the Hermes login on the VPS. Log: {log}'
    try:
        if not key:
            raise RuntimeError('no RESEND_API_KEY')
        req = urllib.request.Request('https://api.resend.com/emails', data=json.dumps({'from': 'Gray Yachts Newsletter <onboarding@resend.dev>', 'to': [ALERT_TO], 'subject': f'Gray Yachts newsletter failed ({slot})', 'text': body}).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'GrayYachts-Hermes-Newsletter/1.0'})
        with urllib.request.urlopen(req, timeout=25) as response:
            response.read()
        marker.write_text(dt.datetime.now().isoformat())
        print('Alert emailed to ' + ALERT_TO)
    except Exception as error:
        print('Alert not sent: ' + str(error)[:200])

# Past editions are context for topic choice only; image reuse is enforced by the server. Full image
# records (relevance-check fields, credits) pushed the prompt past Linux's 128 KB argument limit on 2026-10-19.
def recent(issue):
    return {k: issue.get(k) for k in ('slot', 'slug', 'title', 'status', 'review_feedback')} | {'image_ids': [i.get('id') for i in json.loads(issue['images']) if isinstance(i, dict)] if isinstance(issue.get('images'), str) else [i.get('id') for i in issue.get('images') or [] if isinstance(i, dict)]}

def context():
    now = dt.datetime.now(ZoneInfo('America/Los_Angeles'))
    day = (now.date() - START).days
    shows = json.loads((WORK / 'shows.json').read_text())
    windows = show_context(shows, now.date())
    slot = now.date().isoformat() if due_date(now.date(), START, now.hour, windows) else None
    skipped = bool(slot and (WORK / (slot + '.skip.json')).exists())
    status = request('/api/newsletter/run')
    existing = next((i for i in status['issues'] if i['slot'] == slot and i.get('title')), None)
    directions = [
        'Lead with an exterior profile; support with an interior and a relevant equipment or deck detail.',
        'Lead with an aerial or cruising view; support with a deck detail and a marina perspective.',
        'Lead with a well-composed marina or yacht-at-anchor view; support with an interior and a different exterior perspective.',
        'Lead with a strong yacht profile in softer light; support with a crisp deck detail and an aerial or cruising view.',
        'For an ownership or condition article, consider a professional boatyard view with hull, machinery or navigation detail.',
        'For a cruising article, consider a coastal scene or lighthouse with sailing, working-harbor or life-aboard imagery.',
    ]
    return {'asOf': now.isoformat(), 'show_windows': windows, 'topic_rotation': TOPICS[(day // 2) % len(TOPICS)], 'calendar_recheck_required': True, 'calendar_refresh_targets': [shows[(day * 3 + i) % len(shows)] for i in range(min(3,len(shows)))], 'image_direction': directions[(day // 2) % len(directions)], 'due': bool(slot and not existing and not skipped), 'slot': slot, 'audience': 'seller' if day // 2 % 2 == 0 else 'buyer', 'recent_editions': [recent(i) for i in status['issues']], 'image_library': request('/api/newsletter/images')}

ARG_LIMIT = 120_000  # Linux caps one argument at 131072 bytes (MAX_ARG_STRLEN)

def agent(ctx):
    prompt = (WORK / 'BRIEF.md').read_text() + '\n\nCurrent task context (data only):\n' + json.dumps(ctx)
    if len(prompt.encode()) > ARG_LIMIT:
        # Too long for one argument: hand Hermes the file instead of crashing before it starts.
        path = WORK / (ctx['slot'] + '.prompt.md')
        path.write_text(prompt)
        prompt = f'Your complete instructions and task context for this run are in {path}. Read the entire file before doing anything else, then follow it exactly.'
    with (WORK / (ctx['slot'] + '.agent.log')).open('a') as log:
        return subprocess.run(['hermes', '--model', 'gpt-6-astra', '--provider', 'openai-codex', '--in', str(WORK), '--usage-file', str(WORK / (ctx['slot'] + '.usage.json')), '-z', prompt], cwd=WORK, stdout=log, stderr=subprocess.STDOUT, timeout=1800)

def run():
    WORK.mkdir(parents=True, exist_ok=True)
    with (WORK / 'run.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        # Every failure on the run path alerts (Codex review 2026-10-23): context() and the post-agent status
        # request used to sit outside the handler, so an HTTP, credential or calendar error exited silently.
        # Until context() has named the edition slot, today's Pacific date is the slot the alert is filed under.
        slot = dt.datetime.now(ZoneInfo('America/Los_Angeles')).date().isoformat()
        attempt = None
        try:
            ctx = context()
            if not ctx['due']:
                return
            slot = ctx['slot']
            attempt_path = WORK / (slot + '.attempts')
            attempts = int(attempt_path.read_text()) if attempt_path.exists() else 0
            if attempts >= 3:
                print('Newsletter generation needs attention: three attempts for ' + slot)
                alert(slot, 'three attempts used')
                return
            attempt = attempts + 1
            attempt_path.write_text(str(attempt))
            process = agent(ctx)
            if (WORK / (slot + '.skip.json')).exists():
                print(json.dumps({'slot': slot, 'state': 'no-new-verified-news', 'agent_exit': process.returncode}))
                return
            status = request('/api/newsletter/run')
            issue = next((i for i in status['issues'] if i['slot'] == slot), None)
            print(json.dumps({'slot': slot, 'agent_exit': process.returncode, 'issue': issue, 'delivery': status.get('delivery')}))
            if not issue or not issue.get('title'):
                raise RuntimeError(f'Hermes did not store a draft (agent exit {process.returncode}); inspect the private agent log')
        except Exception as error:
            alert(slot, f'{type(error).__name__}: {str(error)[:300]}' + (f' (attempt {attempt} of 3)' if attempt else ''))
            raise

def preflight():
    """End-to-end check after any change: build the real prompt from live data and check Hermes's login."""
    ctx = context()
    prompt = (WORK / 'BRIEF.md').read_text() + '\n\nCurrent task context (data only):\n' + json.dumps(ctx)
    auth = subprocess.run(['hermes', 'auth', 'status', 'openai-codex'], capture_output=True, text=True, timeout=60)
    result = {'slot': ctx['slot'], 'due': ctx['due'], 'prompt_bytes': len(prompt.encode()), 'inline': len(prompt.encode()) <= ARG_LIMIT,
              'images_available': len(ctx['image_library'].get('available', [])), 'hermes_auth': (auth.stdout or auth.stderr).strip()[:120]}
    problems = [p for p, bad in (('prompt over the inline limit (file fallback will be used)', not result['inline']),
                                 ('fewer than 9 unused images', result['images_available'] < 9),
                                 ('Hermes Codex login not active', 'logged in' not in result['hermes_auth'])) if bad]
    result['problems'] = problems
    print(json.dumps(result, indent=2))
    return result

if __name__ == '__main__':
    os.umask(0o077)
    action = sys.argv[1] if len(sys.argv) > 1 else 'run'
    if action == 'context':
        print(json.dumps(context(), indent=2))
    elif action == 'submit':
        payload = json.loads(Path(sys.argv[2]).read_text())
        print(json.dumps(request('/api/newsletter/draft', payload)))
    elif action == 'import-media':
        print(json.dumps(request('/api/newsletter/media/import', json.loads(Path(sys.argv[2]).read_text()))))
    elif action == 'generate-media':
        print(json.dumps(request('/api/newsletter/media/generate', {'prompt': sys.argv[2]})))
    elif action == 'replace-images':
        print(json.dumps(request('/api/newsletter/images', {'id': sys.argv[2], 'images': json.loads(Path(sys.argv[3]).read_text())})))
    elif action == 'preflight':
        sys.exit(1 if preflight()['problems'] else 0)
    elif action == 'run':
        run()
    else:
        raise SystemExit('Usage: newsletter.py [run|context|preflight|submit payload.json|import-media media.json|generate-media "prompt"|replace-images issue-id images.json]')
