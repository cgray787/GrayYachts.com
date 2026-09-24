#!/usr/bin/env python3
"""Bounded local research/draft loop. Never publishes or sends messages."""
import argparse
import csv
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / 'content/seo'
STATE = Path(os.environ.get('GRAYYACHTS_SEO_STATE', str(Path.home() / 'Library/Application Support/GrayYachts/seo-editorial')))
ZONE = ZoneInfo('America/Los_Angeles')
LABEL = 'com.grayyachts.seo-editorial'

def read(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    tmp.replace(path)

def today(): return dt.datetime.now(ZONE).date()
def timestamp(): return dt.datetime.now(ZONE).isoformat()
def valid_url(value):
    u = urlparse(value)
    return u.scheme == 'https' and bool(u.hostname) and not u.username and not u.password

def validate_article(a, asof=None):
    """Mechanical gates only. This does not establish factual truth or ranking quality."""
    asof = asof or today()
    issues = []
    required = ['slug','title','description','category','primaryKeyword','sections','sources','faq']
    if any(k not in a for k in required): return ['missing required article fields']
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', a['slug']): issues.append('invalid slug')
    if not 30 <= len(a['title']) <= 110: issues.append('title length outside editorial bounds')
    if not 90 <= len(a['description']) <= 200: issues.append('description length outside editorial bounds')
    if not a['sources']: issues.append('no sources')
    for s in a['sources']:
        if not valid_url(s['url']): issues.append('invalid source URL')
        for key in ['publishedAt','checkedAt']:
            if s.get(key):
                try:
                    if dt.date.fromisoformat(s[key][:10]) > asof: issues.append('future dated source')
                except (ValueError,TypeError): issues.append('invalid source date')
    if len(a['sections']) < 3: issues.append('insufficient article structure')
    prose = [a['title'], a['description']]
    for s in a['sections']:
        prose += [s['heading'], *s['paragraphs'], *s['bullets']]
        if any(not isinstance(i,int) or i < 0 or i >= len(a['sources']) for i in s['sourceIndexes']): issues.append('bad citation index')
    for q in a['faq']: prose += [q['question'],q['answer']]
    text = '\n'.join(prose)
    if re.search(r'[—–-]', text): issues.append('dash in customer copy')
    if re.search(r'<[^>]+>', text): issues.append('raw HTML in article')
    if re.search(r'guarantee(?:d)? (?:rank|first|top)|as an ai|delve|unparalleled',text,re.I): issues.append('unsupported promise or stock prose')
    if 'breaking' in a['title'].lower():
        dates=[dt.date.fromisoformat(s['publishedAt'][:10]) for s in a['sources'] if s.get('publishedAt')]
        if not dates or (asof-max(dates)).days > 3: issues.append('breaking headline without recent dated source')
    if len(text.split()) < 250: issues.append('draft needs more useful substance')
    return sorted(set(issues))

def article_schema():
    string = {'type':'string'}
    strings = {'type':'array','items':string}
    def obj(properties, required=None): return {'type':'object','properties':properties,'required':required or list(properties),'additionalProperties':False}
    source = obj({'title':string,'url':string,'publishedAt':{'type':['string','null']},'checkedAt':string})
    section = obj({'heading':string,'paragraphs':strings,'bullets':strings,'sourceIndexes':{'type':'array','items':{'type':'integer'}}})
    article = obj({'slug':string,'title':string,'description':string,'category':string,'primaryKeyword':string,'sections':{'type':'array','items':section},'sources':{'type':'array','items':source},'faq':{'type':'array','items':obj({'question':string,'answer':string})}})
    return obj({'updates':{'type':'array','items':obj({'topicId':string,'summary':string,'sourceUrl':string,'sourcePublishedAt':{'type':['string','null']},'changeType':{'enum':['new','changed','unchanged','unverified']}})},'draft':{'anyOf':[article,{'type':'null'}]},'critique':obj({'findings':strings,'revisionsMade':strings,'lesson':string}),'experimentProposal':{'type':['string','null']}})

def choose_topics(day):
    shows=read(CONTENT/'shows.json',[])
    # Active shows get a daily look; the rest rotate, including sources needing verification.
    active=[s for s in shows if s['start'] and dt.date.fromisoformat(s['start'])-dt.timedelta(days=7)<=day<=dt.date.fromisoformat(s['end'])+dt.timedelta(days=2)]
    others=[s for s in shows if s not in active]
    offset=(day.toordinal()*4)%max(1,len(others))
    rotating=(others+others)[offset:offset+4]
    brands=read(CONTENT/'brands.json',[])
    return active+rotating+([brands[day.toordinal()%len(brands)]] if brands else [])

def metric_report(rows):
    # Exports are separate non-overlapping windows. Do not sum overlapping exports.
    report={'status':'awaiting_search_console_data','comparisons':[], 'aiCitations':'not_measured','qualifiedSellerLeads':'not_measured'}
    if not rows:return report
    report['status']='observed_data_available'
    groups={}
    for r in rows: groups.setdefault((r['page'],r['query']),[]).append(r)
    for (page,query),records in groups.items():
        records=sorted(records,key=lambda x:x['period_end'])
        cur=records[-1]; prev=next((r for r in reversed(records[:-1]) if r['period_end']<cur['period_start']),None)
        item={'page':page,'query':query,'current':cur,'previous':prev,'decision':'insufficient_comparable_data'}
        if prev:
            days=lambda r:(dt.date.fromisoformat(r['period_end'])-dt.date.fromisoformat(r['period_start'])).days+1
            enough=min(cur['impressions'],prev['impressions'])>=200 and days(cur)==days(prev) and days(cur)>=28
            if enough:
                item['decision']='review_for_one_controlled_change'
                item['ctrChange']=cur['clicks']/cur['impressions']-prev['clicks']/prev['impressions']
                item['note']='Observational signal only. Check query mix, position, seasonality and seller conversions before keeping or reverting a change.'
        report['comparisons'].append(item)
    return report

def report():
    result=metric_report(read(STATE/'metrics.json',[]))
    result['generatedAt']=timestamp()
    ai=read(STATE/'ai-observations.json',[])
    valid=[r for r in ai if all(k in r for k in ['engine','prompt','observedAt','evidence','citedUrl','country']) and r['evidence']]
    if valid:
        result['aiCitations']={'observations':len(valid),'citedObservations':sum(bool(r['citedUrl']) and urlparse(r['citedUrl']).hostname in ['grayyachts.com','www.grayyachts.com'] for r in valid),'note':'A sample of actual answers, not overall AI visibility.'}
    result['qualityChecks']=[{'slug':a['slug'],'issues':validate_article(a)} for a in read(CONTENT/'articles.json',[])]
    write(STATE/'report.json',result)
    return result

def import_gsc(args):
    start=dt.date.fromisoformat(args.start);end=dt.date.fromisoformat(args.end)
    if start>end or end>today():raise ValueError('Invalid export period')
    rows=read(STATE/'metrics.json',[])
    with open(args.file, newline='',encoding='utf-8-sig') as f:
        data=list(csv.DictReader(f))
    added=[]
    for original in data:
        r={k.strip().lower():v for k,v in original.items()}
        page=r.get('page') or r.get('top pages') or args.page
        query=r.get('query') or r.get('top queries') or '*all queries*'
        if not page:raise ValueError('Use a Pages export, or supply --page for a page-filtered Queries export')
        u=urlparse(page)
        if u.scheme!='https' or u.hostname not in ['grayyachts.com','www.grayyachts.com']:raise ValueError('Expected GrayYachts.com page URLs')
        item={'page':page,'query':query,'period_start':args.start,'period_end':args.end,'clicks':float(r['clicks'].replace(',','')),'impressions':float(r['impressions'].replace(',','')),'position':float(r['position']),'source':'Google Search Console CSV','importedAt':timestamp()}
        if not all(__import__('math').isfinite(item[k]) for k in ['clicks','impressions','position']):raise ValueError('Nonfinite metrics')
        if item['clicks']<0 or item['impressions']<item['clicks'] or item['position']<0:raise ValueError('Invalid metrics')
        key=lambda x:(x['page'],x['query'],x['period_start'],x['period_end'])
        rows=[x for x in rows if key(x)!=key(item)]
        added.append(item)
    write(STATE/'metrics.json',rows+added)
    print(json.dumps({'imported':len(added),'report':report()['status']}))

def render_review(result):
    lines=['# Gray Yachts editorial review',f'Generated {timestamp()}','', '## Research updates']
    for u in result['updates']:lines += [f"* {u['topicId']}: {u['summary']} [{u['changeType']}]",f"  Source: {u['sourceUrl']} | Published: {u['sourcePublishedAt'] or 'not established'}"]
    a=result.get('draft')
    if a:
        lines += ['', '# '+a['title'],a['description'],'']
        for s in a['sections']:
            lines += ['## '+s['heading'],'',*s['paragraphs'],*['* '+b for b in s['bullets']]]
            lines += [f"Source: {a['sources'][i]['url']}" for i in s['sourceIndexes']]
        for q in a['faq']:lines += ['### '+q['question'],q['answer']]
    lines += ['', '## Critique', *result['critique']['findings'],'## Revisions',*result['critique']['revisionsMade'],'## Lesson',result['critique']['lesson']]
    return '\n\n'.join(lines)

def run(args):
    STATE.mkdir(parents=True,exist_ok=True)
    with open(STATE/'run.lock','w') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:print('Another editorial run is active');return
        state=read(STATE/'state.json',{})
        if state.get('blocked'):
            print('Paused after two failed runs. Inspect state.json and run resume after fixing the cause.');return
        day=today(); key=day.isoformat()
        if state.get('lastSuccess')==key and not args.dry_run:print('Already completed today');return
        program=read(CONTENT/'program.json')
        existing=read(CONTENT/'articles.json',[])
        lessons=read(STATE/'lessons.json',[])
        prior=[]
        for p in sorted((STATE/'runs').glob('*.json'))[-10:]:
            prior.append(read(p,{}))
        week_start=day-dt.timedelta(days=day.weekday())
        count=sum(bool(r.get('draft')) and r.get('date','')>=week_start.isoformat() for r in prior)
        may_draft=day.weekday() in [0,2,4] and count<program['cadence']['draftsPerWeek']
        context={'today':key,'topics':choose_topics(day),'alreadyWritten':[{'slug':a['slug'],'title':a['title']} for a in existing]+[{'slug':r['draft']['slug'],'title':r['draft']['title']} for r in prior if r.get('draft')], 'recentResearch':[r.get('updates',[]) for r in prior[-3:]],'lessons':lessons[-8:],'performance':report(),'mayWriteOneDraft':may_draft,'primaryGoal':program['primaryGoal']}
        prompt=(ROOT/'scripts/seo/research-prompt.md').read_text()+'\n\nCurrent context:\n'+json.dumps(context,ensure_ascii=False)
        command=[shutil.which('claude') or str(Path.home()/'.local/bin/claude'),'-p','--output-format','json','--json-schema',json.dumps(article_schema()),'--max-budget-usd',str(program['dailyBudgetUsd']),'--tools','WebSearch,WebFetch','--allowedTools','WebSearch,WebFetch','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--setting-sources','','--settings','{"disableAllHooks":true}','--disable-slash-commands','--no-session-persistence']
        if args.dry_run:
            print(json.dumps({'mode':'dry_run','topics':[s['id'] for s in context['topics']],'mayWriteOneDraft':may_draft,'maxBudgetUsd':program['dailyBudgetUsd'],'tools':['WebSearch','WebFetch'],'publishing':False,'stateDirectory':str(STATE)},indent=2));return
        try:
            # A clean cwd avoids project hooks/instructions and gives the model no file tools.
            with tempfile.TemporaryDirectory(prefix='grayyachts-seo-') as cwd:
                proc=subprocess.run(command,input=prompt,text=True,capture_output=True,cwd=cwd,timeout=600)
            if proc.returncode:raise RuntimeError(f'CLI exit {proc.returncode}: {proc.stderr[-500:]}')
            payload=json.loads(proc.stdout)
            if payload.get('is_error'):raise RuntimeError(payload.get('result','CLI reported failure'))
            result=payload.get('structured_output')
            if not isinstance(result,dict):raise RuntimeError('CLI did not return validated structured output')
            known_ids={s['id'] for s in context['topics']}
            for update in result['updates']:
                if update['topicId'] not in known_ids or not valid_url(update['sourceUrl']):raise ValueError('Unknown topic or invalid research source')
                if update.get('sourcePublishedAt') and dt.date.fromisoformat(update['sourcePublishedAt'][:10])>day:raise ValueError('Future source date')
            a=result.get('draft')
            if a and not may_draft:raise ValueError('Unscheduled draft returned')
            if a:
                issues=validate_article(a)
                if a['slug'] in {x['slug'] for x in context['alreadyWritten']}:issues.append('duplicate slug')
                a.update(status='draft',author='Gray Yachts editorial team',createdAt=key,updatedAt=key,publishedAt=None,reviewedBy=None,revision=1,relatedPaths=['/sell','/fleet','/boat-shows','/brands'])
                result['qualityGate']={'issues':issues,'status':'needs_revision' if issues else 'needs_human_fact_review'}
            else:result['qualityGate']={'issues':[],'status':'research_only'}
            result.update(date=key,generatedAt=timestamp(),promptVersion=program['version'],performanceStatus=context['performance']['status'])
            write(STATE/'runs'/f'{key}.json',result)
            (STATE/'runs'/f'{key}.md').write_text(render_review(result))
            # Lessons improve subsequent draft critique; they are not accepted SEO experiment outcomes.
            if not result['qualityGate']['issues']:
                lessons.append({'date':key,'kind':'editorial_observation','lesson':result['critique']['lesson'],'notRankingEvidence':True})
                write(STATE/'lessons.json',lessons[-30:])
            state.update(lastSuccess=key,failures=0,blocked=False,lastError=None)
            write(STATE/'state.json',state)
            print(json.dumps({'status':'completed','researchUpdates':len(result['updates']),'draft':a['title'] if a else None,'review':str(STATE/'runs'/f'{key}.md'),'qualityGate':result['qualityGate']}))
        except (OSError,ValueError,RuntimeError,subprocess.TimeoutExpired,KeyError,TypeError) as exc:
            failures=state.get('failures',0)+1
            state.update(failures=failures,blocked=failures>=2,lastError=str(exc)[:700],lastAttempt=timestamp())
            write(STATE/'state.json',state)
            print(json.dumps({'status':'blocked' if failures>=2 else 'failed','error':str(exc)[:700]}));sys.exit(1)

def install():
    if sys.platform!='darwin':raise RuntimeError('This installer uses macOS launchd')
    STATE.mkdir(parents=True,exist_ok=True)
    plist=Path.home()/'Library/LaunchAgents'/f'{LABEL}.plist'
    definition={'Label':LABEL,'ProgramArguments':[sys.executable,str(Path(__file__).resolve()),'run'],'WorkingDirectory':str(ROOT),'StartCalendarInterval':{'Hour':7,'Minute':15},'RunAtLoad':False,'ProcessType':'Background','StandardOutPath':str(STATE/'launchd.log'),'StandardErrorPath':str(STATE/'launchd-error.log'),'EnvironmentVariables':{'PATH':f'{Path.home()}/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin','GRAYYACHTS_SEO_STATE':str(STATE)}}
    if plist.exists():raise RuntimeError('An installed job already exists; inspect it rather than overwriting it')
    plist.parent.mkdir(parents=True,exist_ok=True)
    plist.write_bytes(plistlib.dumps(definition))
    subprocess.run(['launchctl','bootstrap',f'gui/{os.getuid()}',str(plist)],check=True)
    print(f'Installed {LABEL}; daily at 07:15 in the Mac’s local timezone. Drafts only. Mac must be awake and logged in.')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('run');p.add_argument('--dry-run',action='store_true')
    sub.add_parser('report');sub.add_parser('check');sub.add_parser('install');sub.add_parser('resume')
    p=sub.add_parser('import-gsc');p.add_argument('file');p.add_argument('--start',required=True);p.add_argument('--end',required=True);p.add_argument('--page')
    args=parser.parse_args()
    if args.command=='run':run(args)
    elif args.command=='report':print(json.dumps(report(),indent=2))
    elif args.command=='install':install()
    elif args.command=='import-gsc':import_gsc(args)
    elif args.command=='resume':
        state=read(STATE/'state.json',{});state.update(failures=0,blocked=False);write(STATE/'state.json',state);print('Resumed')
    elif args.command=='check':
        checks=[{'slug':a['slug'],'issues':validate_article(a)} for a in read(CONTENT/'articles.json',[])]
        print(json.dumps(checks,indent=2));sys.exit(int(any(r['issues'] for r in checks)))
if __name__=='__main__':main()
