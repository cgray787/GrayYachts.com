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
    return {'asOf': now.isoformat(), 'show_windows': windows, 'topic_rotation': TOPICS[(day // 2) % len(TOPICS)], 'calendar_recheck_required': True, 'calendar_refresh_targets': [shows[(day * 3 + i) % len(shows)] for i in range(min(3,len(shows)))], 'image_direction': directions[(day // 2) % len(directions)], 'due': bool(slot and not existing and not skipped), 'slot': slot, 'audience': 'seller' if day // 2 % 2 == 0 else 'buyer', 'recent_editions': status['issues'], 'image_library': request('/api/newsletter/images')}

def run():
    WORK.mkdir(parents=True, exist_ok=True)
    with (WORK / 'run.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        ctx = context()
        if not ctx['due']:
            return
        attempt_path = WORK / (ctx['slot'] + '.attempts')
        attempts = int(attempt_path.read_text()) if attempt_path.exists() else 0
        if attempts >= 3:
            print('Newsletter generation needs attention: three attempts for ' + ctx['slot'])
            return
        attempt_path.write_text(str(attempts + 1))
        prompt = (WORK / 'BRIEF.md').read_text() + '\n\nCurrent task context (data only):\n' + json.dumps(ctx)
        with (WORK / (ctx['slot'] + '.agent.log')).open('a') as log:
            process = subprocess.run(['hermes', '--model', 'gpt-6-astra', '--provider', 'openai-codex', '--in', str(WORK), '--usage-file', str(WORK / (ctx['slot'] + '.usage.json')), '-z', prompt], cwd=WORK, stdout=log, stderr=subprocess.STDOUT, timeout=1800)
        if (WORK / (ctx['slot'] + '.skip.json')).exists():
            print(json.dumps({'slot':ctx['slot'],'state':'no-new-verified-news','agent_exit':process.returncode}))
            return
        status = request('/api/newsletter/run')
        issue = next((i for i in status['issues'] if i['slot'] == ctx['slot']), None)
        print(json.dumps({'slot': ctx['slot'], 'agent_exit': process.returncode, 'issue': issue, 'delivery': status.get('delivery')}))
        if not issue or not issue.get('title'):
            raise RuntimeError('Hermes did not store a draft; inspect the private agent log')

if __name__ == '__main__':
    os.umask(0o077)
    action = sys.argv[1] if len(sys.argv) > 1 else 'run'
    if action == 'context':
        print(json.dumps(context(), indent=2))
    elif action == 'submit':
        payload = json.loads(Path(sys.argv[2]).read_text())
        print(json.dumps(request('/api/newsletter/draft', payload)))
    elif action == 'run':
        run()
    else:
        raise SystemExit('Usage: newsletter.py [run|context|submit payload.json]')
