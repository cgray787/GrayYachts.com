"""Bounded public HTTPS snapshots for editorial work when a web vendor is unavailable."""
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import hashlib
import http.client
from html.parser import HTMLParser
import ipaddress
import re
import socket
import urllib.error
import urllib.request
from urllib.parse import urlsplit

MAX_BYTES = 1_000_000
MAX_TEXT = 24_000

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

def snapshot(topic):
    url = topic['sourceUrl']
    result = {'topicId': topic['id'], 'requestedUrl': url, 'url': url,
              'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'status': 'unverified'}
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
    except (OSError, ValueError, LookupError, urllib.error.URLError) as exc:
        result['error'] = f'{type(exc).__name__}: {exc}'[:300]
    return result

def snapshots(topics):
    with ThreadPoolExecutor(max_workers=3) as pool:
        return list(pool.map(snapshot, topics))
