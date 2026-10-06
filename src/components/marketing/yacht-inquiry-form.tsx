"use client";

import {useId, useState} from "react";
import {ArrowRight, Check} from "lucide-react";

export default function YachtInquiryForm({yacht}:{yacht:string}) {
 const id=useId();
 const [status,setStatus]=useState<"idle"|"sending"|"sent"|"error">("idle");
 const [error,setError]=useState("");
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(status==="sending") return;
  const form=event.currentTarget;
  const data=new FormData(form);
  setStatus("sending");setError("");
  try{
   const response=await fetch("/api/inquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:data.get("name"),email:data.get("email"),phone:data.get("phone"),message:data.get("message"),company:data.get("company"),vessel:yacht})});
   const result=await response.json();
   if(!response.ok || !result.ok) throw new Error(response.status===429?"Please wait a moment before trying again.":"Your inquiry couldn’t be sent. Please try again or contact Connor directly below.");
   setStatus("sent");form.reset();
  }catch(e){setStatus("error");setError(e instanceof Error?e.message:"Please try again or contact Connor directly below.");}
 }
 const field="mt-2 w-full border border-border bg-bg-primary px-4 py-3 text-base text-text-primary placeholder:text-text-secondary/70 focus:outline-2 focus:outline-gold focus:outline-offset-2";
 const label="text-xs text-text-secondary";
 if(status==="sent") return <div role="status" className="border border-gold/40 bg-gold/5 p-8"><Check className="text-gold"/><h3 className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl">Thank you for your inquiry.</h3><p className="mt-3 text-sm leading-6 text-text-secondary">Connor will follow up about the {yacht} using the contact details you provided.</p></div>;
 return <form onSubmit={submit} aria-label={`${yacht} inquiry`} aria-busy={status==="sending"} className="space-y-5">
  <p className="text-xs uppercase tracking-[0.18em] text-gold">Inquire about the {yacht}</p>
  <div className="absolute left-[-9999px]" aria-hidden="true"><label>Company<input name="company" tabIndex={-1} autoComplete="off"/></label></div>
  <fieldset disabled={status==="sending"} className="space-y-4 disabled:opacity-60">
   <div className="grid gap-4 sm:grid-cols-2">
    <div><label htmlFor={`${id}-name`} className={label}>Name <span aria-hidden="true">*</span></label><input id={`${id}-name`} name="name" autoComplete="name" maxLength={200} required className={field} placeholder="Your name"/></div>
    <div><label htmlFor={`${id}-email`} className={label}>Email <span aria-hidden="true">*</span></label><input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={200} required className={field} placeholder="you@example.com"/></div>
   </div>
   <div><label htmlFor={`${id}-phone`} className={label}>Phone (optional)</label><input id={`${id}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={60} className={field} placeholder="Your phone number"/></div>
   <div><label htmlFor={`${id}-message`} className={label}>What would you like to know? (optional)</label><textarea id={`${id}-message`} name="message" maxLength={5000} rows={3} className={field+" resize-y"} placeholder="Pricing, a viewing, or a good time for a call…"/></div>
   <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-3 bg-gold px-6 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-bg-primary transition-colors hover:bg-gold-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">{status==="sending"?"Sending…":"Send inquiry"}<ArrowRight size={16}/></button>
  </fieldset>
  {status==="error" && <p role="alert" className="text-sm leading-6 text-text-primary">{error} <a href="mailto:grayyachts@gmail.com" className="text-gold underline">Email Connor</a> or <a href="tel:+14256718474" className="text-gold underline">call 425-671-8474</a>.</p>}
  <p className="text-xs leading-5 text-text-secondary">Connor will use these details to respond to your inquiry. This does not book a call or subscribe you to a newsletter.</p>
 </form>;
}
