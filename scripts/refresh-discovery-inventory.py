"""Capture JBY's public inventory cards, retaining source URLs and capture date."""
import concurrent.futures,datetime,html,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE='https://jeffbrownyachts.com'
def fetch(url):
 return subprocess.check_output(['curl','--fail','--retry','2','-Ls',url],text=True)
def clean(x):return html.unescape(re.sub('<[^>]+>',' ',x)).strip()
def parse(body):
 rows=[]
 for url,block in re.findall(r'<a class="listing text-decoration-none" href="([^"]+)"[^>]*>(.*?)</a>',body,re.S):
  title=re.search(r'<p class="listing-title">(.*?)</p>',block,re.S)
  photo=re.search(r'data-ji-src="([^"]+)"',block)
  price=re.search(r'<p class="price[^\"]*">(.*?)</p>',block,re.S)
  location=re.search(r'<p class="location">(.*?)</p>',block,re.S)
  if not title or not photo:raise ValueError('Inventory card missing title or photo: '+url)
  name=clean(title[1]); status='pending' if re.search(r'\bPending\b',clean(block),re.I) else 'for sale'
  rows.append(dict(name=name,url=BASE+url,image=html.unescape(photo[1]),price=' '.join(clean(price[1]).split()) if price else 'Ask for pricing',location=clean(location[1]) if location else '',status=status,brand=next((b for b in ['Axopar','Brabus','Everglades','Four Winns','Pershing','Riva','Sirena','Wally','Jeanneau'] if b.lower() in name.lower()),'Brokerage')))
 return rows
first=fetch(BASE+'/inventory/filter')
total=int(re.search(r'Total Results: <strong>(\d+)',first)[1])
pages=[BASE+'/inventory/filter/P'+str(n) for n in range(12,total,12)]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:bodies=[first,*pool.map(fetch,pages)]
rows=[r for b in bodies for r in parse(b)]
unique={r['url']:r for r in rows}
if len(unique)!=len(rows):raise ValueError('Duplicate pages detected; do not overwrite snapshot')
if len(rows)<total*.8:raise ValueError('Incomplete inventory capture')
output=dict(checkedAt=datetime.date.today().isoformat(),source=BASE+'/inventory/filter',sourceTotal=total,pageCount=len(bodies),count=len(rows),coverage='All paginated linked inventory cards; sold cards without listing links are omitted. Availability requires confirmation.',yachts=rows)
(ROOT/'content/yachts/jby-inventory.json').write_text(json.dumps(output,indent=2)+'\n')
print('Captured',len(rows),'linked yachts across',len(bodies),'pages; publisher results',total)
