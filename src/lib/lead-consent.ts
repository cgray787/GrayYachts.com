export const SMS_CONSENT_VERSION = 'valuation-inquiry-sms-2026-10-18';

export function contactConsent(body: Record<string, unknown>, now = new Date()): Record<string, string> {
  const granted = body.sms_opt_in === true && body.sms_consent_version === SMS_CONSENT_VERSION;
  return {
    sms_consent: String(granted),
    sms_consent_at: now.toISOString(),
    sms_consent_source: 'grayyachts.com/sell',
    sms_consent_version: SMS_CONSENT_VERSION,
  };
}
