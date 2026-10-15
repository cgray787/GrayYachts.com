import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {GOOGLE_ADS_ID} from './google-ads';

describe('Google Ads tag', () => {
  it('uses the account tag Connor supplied', () => {
    expect(GOOGLE_ADS_ID).toBe('AW-18507545875');
  });
  it('is loaded by the root layout for every Next.js page', () => {
    const layout = readFileSync('src/app/layout.tsx', 'utf8');
    expect(layout).toContain('GoogleAdsTag');
  });
  it('is in the static /sell page head, where ads land', () => {
    const html = readFileSync('public/sell.html', 'utf8');
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain('https://www.googletagmanager.com/gtag/js?id=AW-18507545875');
    expect(head).toContain("gtag('config', 'AW-18507545875')");
  });
});
