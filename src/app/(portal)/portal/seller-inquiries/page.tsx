import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/admin';
import { updateInquiryStage } from './actions';
export const dynamic='force-dynamic';
const stages={new:'New',qualified:'Qualified',appointment:'Appointment',listing_signed:'Listing signed',not_qualified:'Not qualified'};
export default async function SellerInquiries() {
  const auth=await createClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!user) redirect('/login?redirect=/portal/seller-inquiries');
  if(!isAdmin(user.email)) redirect('/portal/dashboard');
  const db=createAdminClient();
  const {data,error}=await db.from('valuation_inquiries').select('id,created_at,contact,answers,attribution,notification_status,stage').order('created_at',{ascending:false}).limit(100);
  return <div className="p-6 lg:p-10 space-y-6">
    <h1 className="text-3xl text-text-primary">Seller inquiries</h1>
    <p className="text-text-secondary">Latest 100 inquiries. Update outcomes as you qualify owners and win listings. Traffic and session conversion rates are reported in Google Analytics.</p>
    {error ? <p role="alert">Inquiry storage is unavailable. Check the database migration and server configuration.</p> : !data?.length ? <p>No inquiries recorded yet.</p> : data.map(row=><article key={row.id} className="rounded-xl border border-border bg-bg-card p-5 space-y-3">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl">{String(row.contact?.name||'Owner')}</h2><time>{new Date(row.created_at).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})} Pacific</time></div>
      <p>{String(row.answers?.year_make_model||row.answers?.brand||'Vessel')} · {String(row.answers?.timeframe||'')}</p>
      <p>{String(row.contact?.email||'')} · {String(row.contact?.phone||'')}</p>
      <p className="text-sm text-text-secondary">Source: {String(row.attribution?.utm_source||'Direct / unknown')} · Campaign: {String(row.attribution?.utm_campaign||'Unassigned')} · Creative: {String(row.attribution?.utm_content||'Unassigned')}</p>
      <p className="text-sm">Email notification: {row.notification_status === 'sent' ? 'Accepted by email provider' : row.notification_status === 'failed' ? 'Failed — follow up using the contact details above' : 'Pending — confirm follow-up'}.</p>
      <form action={updateInquiryStage} className="flex flex-wrap gap-3 items-center">
        <input type="hidden" name="id" value={row.id}/>
        <label htmlFor={`stage-${row.id}`}>Outcome</label>
        <select id={`stage-${row.id}`} name="stage" defaultValue={row.stage} className="bg-bg-primary border border-border rounded p-2">{Object.entries(stages).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
        <button type="submit" className="bg-gold text-bg-primary px-4 py-2 rounded">Save outcome</button>
      </form>
    </article>)}
  </div>;
}
