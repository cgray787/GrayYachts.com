import {describe, it, expect} from 'vitest';
import {contactConsent, SMS_CONSENT_VERSION} from './lead-consent';

describe('recorded text consent', () => {
  it('requires an explicit boolean and the displayed version', () => {
    for (const body of [{}, {sms_opt_in:'true'}, {sms_opt_in:true}, {sms_opt_in:true,sms_consent_version:'old'}]) {
      expect(contactConsent(body).sms_consent).toBe('false');
    }
  });
  it('uses server time rather than a client supplied timestamp', () => {
    const now=new Date('2026-10-18T22:00:00Z');
    expect(contactConsent({sms_opt_in:true,sms_consent_version:SMS_CONSENT_VERSION,sms_consent_at:'2030-01-01'},now))
      .toEqual({sms_consent:'true',sms_consent_version:SMS_CONSENT_VERSION,
        sms_consent_at:now.toISOString(),sms_consent_source:'grayyachts.com/sell'});
  });
});
