'use server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin';
import { revalidatePath } from 'next/cache';
export async function updateInquiryStage(form: FormData) {
  const auth = await createClient();
  const {data:{user}} = await auth.auth.getUser();
  if(!user || !isAdmin(user.email)) throw new Error('forbidden');
  const id=String(form.get('id')||''),stage=String(form.get('stage')||'');
  if(!/^[a-f0-9-]{36}$/i.test(id) || !['new','qualified','appointment','listing_signed','not_qualified'].includes(stage)) throw new Error('invalid_stage');
  const {error} = await createAdminClient().from('valuation_inquiries').update({stage,stage_updated_at:new Date().toISOString()}).eq('id',id);
  if(error) throw new Error('Unable to update inquiry');
  revalidatePath('/portal/seller-inquiries');
}
