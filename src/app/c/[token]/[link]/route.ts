import {destination,recipient,record,TRACKING_HEADERS} from '@/lib/campaign-tracking';
export const dynamic='force-dynamic';
type Context={params:Promise<{token:string;link:string}>};
async function handle(req:Request,c:Context,track:boolean){const {token,link}=await c.params;const target=destination(token,link);if(!target)return new Response('Link unavailable',{status:404,headers:TRACKING_HEADERS});try{if(!await recipient(token))return new Response('Link unavailable',{status:404,headers:TRACKING_HEADERS});if(track)await record(token,'click',link,req);}catch{ return new Response('Please try again shortly.',{status:503,headers:TRACKING_HEADERS});}return new Response(null,{status:302,headers:{...TRACKING_HEADERS,Location:target}});}
export const GET=(r:Request,c:Context)=>handle(r,c,true);
export const HEAD=(r:Request,c:Context)=>handle(r,c,false);
