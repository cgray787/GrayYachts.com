import {newsletterEnv} from '@/lib/newsletter/db';
import {decide,escapeHtml} from '@/lib/newsletter/core';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 // Authorization is the issue-specific secret token, not a cookie. The review
 // page's no-referrer policy can make browsers send Origin: null on this form.
 const {id}=await params;const data=await request.formData();
 const result=await decide(await newsletterEnv(),id,String(data.get('token')||''),String(data.get('decision')||''),String(data.get('feedback')||''));
 return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Gray Yachts newsletter review</title><body style="background:#060a12;color:#f7f4ee;font:18px/1.6 system-ui;padding:10vw"><main style="max-width:640px;margin:auto"><p style="color:#c9a96e">GRAY YACHTS</p><h1>${escapeHtml(result.message)}</h1><a href="/newsletter" style="color:#c9a96e">Visit the newsletter</a></main></body></html>`,{status:result.status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-robots-tag':'noindex, nofollow'}});
}
