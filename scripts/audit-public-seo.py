#!/usr/bin/env python3
"""Read-only audit of the two public Gray Yachts sitemaps. No credentials needed."""
import concurrent.futures
import datetime
from html.parser import HTMLParser
import json
import collections
from pathlib import Path
import re
import sys
import subprocess
import tempfile
import urllib.parse
import xml.etree.ElementTree as ET

SITE = 'https://grayyachts.com'


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.title = []
        self.h1 = []
        self.ids = set()
        self.links = set()
        self.scripts = []
        self.schema = []
        self.canonical = []
        self.capture = None
        self.text = []
        self.svg_depth = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'svg':
            self.svg_depth += 1
        if a.get('id'):
            self.ids.add(a['id'])
        if tag == 'a' and a.get('href'):
            self.links.add(a['href'])
        if tag == 'meta':
            self.meta[a.get('name', a.get('property', ''))] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical.append(a.get('href', ''))
        if tag == 'script' and a.get('src'):
            self.scripts.append(a['src'])
        # Next can stream metadata after </head>; SVG <title> is not page metadata.
        if (tag == 'title' and not self.svg_depth) or tag == 'h1' or (tag == 'script' and a.get('type') == 'application/ld+json'):
            self.capture = tag
            self.text = []

    def handle_data(self, data):
        if self.capture:
            self.text.append(data)

    def handle_endtag(self, tag):
        if tag == 'svg':
            self.svg_depth = max(0, self.svg_depth - 1)
        if tag != self.capture:
            return
        value = ' '.join(''.join(self.text).split())
        if tag == 'title':
            self.title.append(value)
        elif tag == 'h1':
            self.h1.append(value)
        else:
            try:
                self.schema.append(json.loads(''.join(self.text)))
            except json.JSONDecodeError as error:
                self.schema.append({'parse_error': str(error)})
        self.capture = None


def fetch(url):
    # Use the system HTTP client with bounded retries; report errors honestly.
    with tempfile.TemporaryDirectory() as directory:
        body = Path(directory) / 'body.html'
        headers = Path(directory) / 'headers.txt'
        result = subprocess.run(['curl', '-4', '-fsSL', '--proto', '=https', '--proto-redir', '=https',
                                 '--max-redirs', '3', '--max-time', '20', '--retry', '1',
                                 '--retry-max-time', '25',
                                 '-D', str(headers), '-o', str(body), '-w', '%{http_code} %{url_effective}', url],
                                capture_output=True, text=True, timeout=50)
        if result.returncode == 16:
            # A local HTTP/2 framing failure has no origin HTTP status. Retry
            # once over HTTP/1.1 rather than reporting it as a website outage.
            result = subprocess.run([result.args[0], '--http1.1', *result.args[1:]],
                                    capture_output=True, text=True, timeout=50)
        if result.returncode:
            status_lines = [line for line in headers.read_text(errors='replace').splitlines() if line.startswith('HTTP/')] if headers.exists() else []
            raise RuntimeError(f'curl exit {result.returncode}; {result.stdout}; {status_lines}; {result.stderr.strip()}')
        status, final = result.stdout.split(' ', 1)
        return int(status), final, body.read_text(errors='replace')


def inspect(url):
    try:
        status, final, html = fetch(url)
        page = Page()
        page.feed(html)
        return {'url': url, 'status': status, 'final_url': final, 'title': page.title,
                'h1': page.h1, 'meta': page.meta, 'canonical': page.canonical,
                'schema': page.schema, 'ids': sorted(page.ids), 'links': sorted(page.links),
                'google_tag_scripts': [s for s in page.scripts if 'googletagmanager.com' in s],
                'google_ads_ids_in_html': sorted(set(re.findall(r'AW-\d+', html)))}
    except Exception as error:
        return {'url': url, 'error': str(error)}


def main():
    urls = set()
    paths = sys.argv[2:]
    for path in paths:
        if not path.startswith('/') or path.startswith('//') or '?' in path or '#' in path:
            raise ValueError('Focused audit paths must be public paths without queries or fragments')
        urls.add(SITE + path.rstrip('/'))
    for path in ([] if paths else ['/sitemap.xml', '/newsletter/sitemap.xml']):
        _, _, xml = fetch(SITE + path)
        for element in ET.fromstring(xml).iter():
            if element.tag.endswith('}loc') and element.text:
                url = element.text.rstrip('/')
                if urllib.parse.urlsplit(url).netloc != 'grayyachts.com':
                    raise ValueError('Sitemap contains an unexpected host')
                urls.add(url)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        pages = list(pool.map(inspect, sorted(urls)))
    by_url = {p['url']: p for p in pages}
    issues = []
    for page in pages:
        url = page['url']
        def issue(kind, detail):
            issues.append({'url': url, 'kind': kind, 'detail': detail})
        if 'error' in page:
            issue('fetch_error', page['error'])
            continue
        if page['final_url'].rstrip('/') != url:
            issue('redirect_in_sitemap', page['final_url'])
        if len(page['title']) != 1 or not page['title'][0]:
            issue('title', page['title'])
        if not page['meta'].get('description'):
            issue('missing_description', '')
        if len(page['h1']) != 1:
            issue('h1_count', len(page['h1']))
        if [c.rstrip('/') for c in page['canonical']] != [url]:
            issue('canonical', page['canonical'])
        for name in ['robots', 'googlebot']:
            if 'noindex' in page['meta'].get(name, '').lower():
                issue('noindex_in_sitemap', name)
        if page['meta'].get('og:url', '').rstrip('/') != url:
            issue('social_url', page['meta'].get('og:url'))
        if any('parse_error' in s for s in page['schema'] if isinstance(s, dict)):
            issue('invalid_schema_json', '')
        for link in page['links']:
            full = urllib.parse.urljoin(url, link)
            parts = urllib.parse.urlsplit(full)
            target = urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, '', '')).rstrip('/')
            if parts.fragment and target in by_url and 'ids' in by_url[target]:
                if urllib.parse.unquote(parts.fragment) not in by_url[target]['ids']:
                    issue('missing_anchor', full)
    report = {'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
              'pages': pages, 'issues': issues}
    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'pages_checked': len(pages), 'issue_counts': dict(collections.Counter(i['kind'] for i in issues)),
                      'errors': [i for i in issues if i['kind'] == 'fetch_error'], 'report': str(output)}, indent=2))
    if any(i['kind'] in ('fetch_error', 'noindex_in_sitemap', 'canonical', 'invalid_schema_json') for i in issues):
        sys.exit(1)


if __name__ == '__main__':
    main()
