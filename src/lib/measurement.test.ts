import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync('public/measurement.js','utf8');
async function setup(granted=true,url='https://www.grayyachts.com/sell?utm_source=chatgpt&utm_campaign=seller&oppref=click123&email=secret@example.test'){
  const data=new Map<string,string>();
  if(granted) data.set('gy_measurement_consent_v1',JSON.stringify({value:'granted',at:Date.now()}));
  const nodes:Record<string,unknown>[]=[], appended:Record<string,unknown>[]=[];
  const document={referrer:'https://chatgpt.com/?private=value',
    createElement:()=>{const n={style:{},setAttribute:()=>{},appendChild:(v:Record<string,unknown>)=>nodes.push(v)};nodes.push(n);return n;},
    head:{appendChild:(v:Record<string,unknown>)=>appended.push(v)},body:{appendChild:()=>{}},getElementById:()=>null,addEventListener:()=>{}};
  const window:Record<string,unknown>={};
  const context=vm.createContext({window,document,location:new URL(url),URL,URLSearchParams,Set,Date,navigator:{},
    localStorage:{getItem:(k:string)=>data.get(k),setItem:(k:string,v:string)=>data.set(k,v),removeItem:(k:string)=>data.delete(k)},
    fetch:async()=>({ok:true,json:async()=>({ga4MeasurementId:'G-TEST123'})})});
  vm.runInContext(code,context);await new Promise(resolve=>setImmediate(resolve));
  const api=window.GYMeasurement as {event:(name:string,data?:Record<string,unknown>)=>void;context:()=>Record<string,unknown>;page:()=>void;preferences:()=>void};
  const events=()=>Array.from(window.dataLayer as IArguments[]||[]).map(a=>Array.from(a)).filter(a=>a[0]==='event');
  return {window,api,events,appended,data,context,nodes};
}
describe('public measurement privacy and attribution',()=>{
  it('does not load Google or emit events before consent',async()=>{const t=await setup(false);t.api.event('generate_lead',{lead_id:'test'});expect(t.appended).toHaveLength(0);expect(t.events()).toHaveLength(0);});
  it('emits one page view and strips unknown query values and referrer queries',async()=>{const t=await setup();t.api.page();expect(t.events()).toHaveLength(1);expect(JSON.stringify(t.events())).not.toMatch(/secret|private|oppref|click123/);});
  it('retains click identifiers for inquiry attribution, never the analytics event',async()=>{const t=await setup();expect(t.api.context()).toMatchObject({utm_source:'chatgpt',oppref:'click123',first_touch:{utm_source:'chatgpt'}});t.api.event('questionnaire_start',{email:'private@example.test',oppref:'click123'});expect(JSON.stringify(t.events())).not.toMatch(/private@example|click123/);});
  it('deduplicates successful inquiry conversions in the page lifetime',async()=>{const t=await setup();t.api.event('generate_lead',{lead_id:'receipt-1'});t.api.event('generate_lead',{lead_id:'receipt-1'});expect(t.events().filter(e=>e[1]==='generate_lead')).toHaveLength(1);});
  it('preserves first and last campaign on an untagged internal page',async()=>{const t=await setup();vm.runInContext("location=new URL('https://www.grayyachts.com/fleet')",t.context);t.api.page();expect(t.api.context()).toMatchObject({first_touch:{utm_campaign:'seller'},last_touch:{utm_campaign:'seller'}});});
  it('does not measure authenticated portal pages',async()=>{const t=await setup(true,'https://www.grayyachts.com/portal/seller-inquiries');expect(t.events()).toHaveLength(0);expect(t.appended).toHaveLength(0);});
});
