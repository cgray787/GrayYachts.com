"""Bounded public HTTPS snapshots for editorial work when a web vendor is unavailable."""
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import hashlib
import http.client
from html.parser import HTMLParser
import ipaddress
import json
from pathlib import Path
import re
import socket
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

MAX_BYTES = 1_000_000
MAX_TEXT = 24_000
MAX_ATTEMPTS = 3
SLEEP = time.sleep  # tests patch this so retries do not actually sleep
REPUTABLE_SOURCES_PATH = Path(__file__).resolve().parents[2] / 'content/seo/reputable-sources.json'

def public_addresses(host):
    addresses = list(dict.fromkeys(item[4][0] for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)))
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError('Source resolves to a nonpublic address')
    return addresses

def public_url(url):
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError('Expected a public HTTPS source URL')
    public_addresses(parsed.hostname)
    return url

class PublicHTTPSConnection(http.client.HTTPSConnection):
    def connect(self):
        if self.port != 443 or self._tunnel_host:
            raise ValueError('Only direct public HTTPS connections are supported')
        last_error = None
        for address in public_addresses(self.host):
            connected = None
            try:
                # The numeric address cannot be rebound by a second hostname lookup.
                connected = socket.create_connection((address, 443), self.timeout, self.source_address)
                peer = ipaddress.ip_address(connected.getpeername()[0])
                if not peer.is_global or peer != ipaddress.ip_address(address):
                    raise ValueError('HTTPS peer does not match the validated public address')
                self.sock = self._context.wrap_socket(connected, server_hostname=self.host)
                return
            except OSError as exc:
                if connected is not None: connected.close()
                last_error = exc
            except Exception:
                if connected is not None: connected.close()
                raise
        raise last_error or OSError('No public source address connected')

class PublicHTTPSHandler(urllib.request.HTTPSHandler):
    def https_open(self, request):
        return self.do_open(PublicHTTPSConnection, request, context=self._context)

class PublicRedirects(urllib.request.HTTPRedirectHandler):
    max_redirections = 3
    max_repeats = 2
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        public_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

class PageText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignored = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript', 'svg'): self.ignored += 1
        if not self.ignored and tag in ('p', 'h1', 'h2', 'h3', 'li', 'br', 'tr'): self.parts.append('\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript', 'svg') and self.ignored: self.ignored -= 1
    def handle_data(self, data):
        if not self.ignored: self.parts.append(data)
    def text(self):
        return re.sub(r'\n\s*\n+', '\n', re.sub(r'[^\S\n]+', ' ', ' '.join(self.parts))).strip()

def _retryable(exc):
    # Transient server-side failures only; a bad scheme, a private address or thin content never improves on retry.
    if isinstance(exc, urllib.error.HTTPError): return exc.code == 429 or exc.code >= 500
    return isinstance(exc, (urllib.error.URLError, TimeoutError))

def _retry_delay(exc, attempt):
    retry_after = None
    if isinstance(exc, urllib.error.HTTPError) and exc.headers and exc.headers.get('Retry-After'):
        try: retry_after = float(exc.headers.get('Retry-After'))
        except ValueError: retry_after = None
    if retry_after is not None: return max(0.0, min(retry_after, 30))
    return min(2 ** (attempt - 1), 30)  # 1s, 2s, 4s, ... capped at 30s

def snapshot(topic, tier='official', source_name=None):
    url = topic['sourceUrl']
    result = {'topicId': topic['id'], 'requestedUrl': url, 'url': url,
              'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'status': 'unverified',
              'tier': tier, 'sourceName': source_name or topic.get('name', topic['id'])}
    attempt = 0
    while True:
        attempt += 1
        try:
            public_url(url)
            request = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (compatible; GrayYachtsEditorial/1.0)',
                'Accept': 'text/html,text/plain;q=0.9', 'Accept-Encoding': 'identity'})
            # Do not inherit proxy settings that could route public-source reads into private networks.
            opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), PublicRedirects(), PublicHTTPSHandler())
            with opener.open(request, timeout=15) as response:
                result['url'] = response.geturl()
                public_url(result['url'])
                content_type = response.headers.get_content_type()
                if content_type not in ('text/html', 'text/plain', 'application/xhtml+xml'):
                    raise ValueError('Unsupported source content type')
                raw = response.read(MAX_BYTES + 1)
                result['truncatedBytes'] = len(raw) > MAX_BYTES
                raw = raw[:MAX_BYTES]
                text = raw.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')
                if content_type != 'text/plain':
                    parser = PageText(); parser.feed(text); text = parser.text()
                if len(text.strip()) < 200: raise ValueError('Source returned too little readable text')
                result.update(status='retrieved', contentSha256=hashlib.sha256(raw).hexdigest(), text=text[:MAX_TEXT])
                if len(text) > MAX_TEXT:
                    # Calendar details often live near the footer. Make truncation explicit.
                    result['text'] = text[:MAX_TEXT // 2] + '\n[Middle of page omitted]\n' + text[-MAX_TEXT // 2:]
                    result['truncatedText'] = True
            return result
        except (OSError, ValueError, LookupError, urllib.error.URLError) as exc:
            if _retryable(exc) and attempt < MAX_ATTEMPTS:
                SLEEP(_retry_delay(exc, attempt))
                continue
            result['error'] = f'{type(exc).__name__}: {exc}'[:300]
            return result

def snapshots(topics):
    with ThreadPoolExecutor(max_workers=3) as pool:
        return list(pool.map(snapshot, topics))

def reputable_config():
    return json.loads(REPUTABLE_SOURCES_PATH.read_text()) if REPUTABLE_SOURCES_PATH.exists() else {'version': 1, 'maxSnapshots': 0, 'sources': []}

def reputable_targets(day, config=None):
    """Deterministic, day-rotated pick of reputable source pages, bounded by maxSnapshots."""
    config = config if config is not None else reputable_config()
    max_snapshots = config.get('maxSnapshots', 0)
    flat = [{'sourceId': s['id'], 'sourceName': s['name'], 'url': u}
            for s in config.get('sources', []) for u in s.get('urls', [])]
    if not flat or max_snapshots <= 0: return []
    offset = (day.toordinal() * max_snapshots) % len(flat)
    return (flat + flat)[offset:offset + max_snapshots]

def reputable_snapshots(day, config=None):
    targets = reputable_targets(day, config)
    def fetch(target):
        return snapshot({'id': target['sourceId'], 'sourceUrl': target['url']}, tier='reputable', source_name=target['sourceName'])
    with ThreadPoolExecutor(max_workers=3) as pool:
        return list(pool.map(fetch, targets))
