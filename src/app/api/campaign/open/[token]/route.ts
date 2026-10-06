import {recipient,record,TRACKING_HEADERS} from '@/lib/campaign-tracking';
export const dynamic='force-dynamic';
const pixel=Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),c=>c.charCodeAt(0));
export async function GET(req:Request,c:{params:Promise<{token:string}>}){const {token}=await c.params;try{if(await recipient(token))await record(token,'open','pixel',req);}catch{console.error('[campaign] open recording unavailable');}return new Response(pixel,{headers:{...TRACKING_HEADERS,'Content-Type':'image/gif'}});}
export async function HEAD(){return new Response(null,{headers:{...TRACKING_HEADERS,'Content-Type':'image/gif'}});}
