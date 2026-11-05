import { createAdminClient } from '@/lib/supabase/admin';

export const ATTRIBUTION_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id',
  'oppref','gclid','fbclid','ad_id','adset_id','campaign_id','placement','landing_page','referrer'] as const;
const ANSWER_KEYS = ['intent','timeframe','length','brand','year_make_model','engine_hours','condition'] as const;
function fields(value: unknown, keys: readonly string[]) {
  if(!value || typeof value !== 'object') return {};
  const input = value as Record<string, unknown>;
  return Object.fromEntries(keys.filter(k => typeof input[k] === 'string').map(k => [k, String(input[k]).slice(0,1024)]));
}
export function inquiryRecord(body: Record<string, unknown>) {
  return {
    contact: fields(body,['name','email','phone']),
    answers: fields(body,ANSWER_KEYS),
    attribution: {...fields(body,ATTRIBUTION_KEYS),
      first_touch: fields(body.first_touch,ATTRIBUTION_KEYS), last_touch: fields(body.last_touch,ATTRIBUTION_KEYS),
      analytics_consent: body.analytics_consent === true},
    photo_count: Math.min(Array.isArray(body.photos) ? body.photos.length : 0,3),
  };
}
export async function storeInquiry(body: Record<string, unknown>, photos: {filename:string;content:string}[]) {
  const id = typeof body.submission_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submission_id)
    ? body.submission_id : crypto.randomUUID();
  const record = inquiryRecord(body);
  // Attribution/consent can change between retries. Contact, answers and photos cannot.
  const bytes = new TextEncoder().encode(JSON.stringify({contact:record.contact,answers:record.answers,photos}));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
  const db = createAdminClient();
  const {error} = await db.from('valuation_inquiries').upsert({id,request_hash:hash,...record}, {onConflict:'id',ignoreDuplicates:true});
  if(error) throw new Error('lead_storage_failed');
  const {data,error:readError} = await db.from('valuation_inquiries').select('id,request_hash,accepted_at,attribution').eq('id',id).single();
  if(readError || !data) throw new Error('lead_storage_failed');
  if(data.request_hash!==hash) throw new Error('submission_conflict');
  return {id,accepted:!!data.accepted_at,attribution:data.attribution as Record<string,unknown>};
}
export async function markInquiry(id: string, notificationId: string | null) {
  const db = createAdminClient();
  const {error} = await db.from('valuation_inquiries').update(notificationId
    ? {notification_status:'sent',notification_id:notificationId,accepted_at:new Date().toISOString()}
    : {notification_status:'failed'}).eq('id',id);
  if(error) throw new Error('lead_status_failed');
}
