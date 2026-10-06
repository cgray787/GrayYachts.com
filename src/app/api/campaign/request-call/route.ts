import {db,recipient,validateCall,TRACKING_HEADERS} from '@/lib/campaign-tracking';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Please use the form on this website.'},{status:403});
 const raw=await req.text();if(raw.length>5000)return Response.json({error:'Message too long.'},{status:413});
 let b;try{b=JSON.parse(raw);}catch{return Response.json({error:'Invalid request.'},{status:400});}
 const data=validateCall(b);if(!data||typeof b.token!=='string')return Response.json({error:'Please check your name, email, preferred time and time zone.'},{status:422});
 if(data.company)return Response.json({ok:true});
 try{
 if(!await recipient(b.token))return Response.json({error:'This invitation is unavailable. Please contact Connor directly.'},{status:404});
 const store=await db();
 const count=await store.prepare("SELECT count(*) AS n FROM campaign_call_requests WHERE token=? AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')").bind(b.token).first<{n:number}>();
 if((count?.n??0)>=3)return Response.json({error:'A request is already on file. Please contact Connor for changes.'},{status:429});
 const id=crypto.randomUUID();
 // D1 batch is atomic: a successful request always has a corresponding event.
 const batch=store as typeof store & {batch:(statements:ReturnType<typeof store.prepare>[])=>Promise<unknown>};
 await batch.batch([store.prepare('INSERT INTO campaign_call_requests(id,token,name,email,phone,preferred_time,timezone,message) VALUES(?,?,?,?,?,?,?,?)').bind(id,b.token,data.name.trim(),data.email.trim(),data.phone,data.preferred_time,data.timezone,data.message),store.prepare("INSERT INTO campaign_events(id,token,kind,link) VALUES(?,?,'call_requested','talk')").bind(crypto.randomUUID(),b.token)]);
 return Response.json({ok:true},{headers:TRACKING_HEADERS});
 }catch{console.error('[campaign] call request save failed');return Response.json({error:'Could not save your request. Please email grayyachts@gmail.com or call 425-671-8474.'},{status:503});}
}
