import {createClient} from '@/lib/supabase/server';import {isAdmin} from '@/lib/admin';import {db} from '@/lib/campaign-tracking';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return new Response('Forbidden',{status:403});
 const client=await createClient();const{data:{user}}=await client.auth.getUser();if(!user||!isAdmin(user.email))return new Response('Forbidden',{status:403});
 const form=await req.formData();const id=form.get('id');if(typeof id!=='string'||id.length>80)return new Response('Bad request',{status:400});
 const store=await db();const call=await store.prepare('SELECT c.token,r.is_test FROM campaign_call_requests c JOIN campaign_recipients r ON r.token=c.token WHERE c.id=?').bind(id).first<{token:string;is_test:number}>();if(!call)return new Response('Not found',{status:404});
 const batch=store as typeof store & {batch:(statements:ReturnType<typeof store.prepare>[])=>Promise<unknown>};
 await batch.batch([store.prepare("INSERT INTO campaign_events(id,token,kind,link) SELECT ?,token,'booking_confirmed','talk' FROM campaign_call_requests WHERE id=? AND status='requested'").bind(crypto.randomUUID(),id),store.prepare("UPDATE campaign_call_requests SET status='confirmed' WHERE id=? AND status='requested'").bind(id)]);
 return new Response(null,{status:303,headers:{Location:'/portal/campaign-activity'+(call.is_test?'?test=1':'')}});
}
