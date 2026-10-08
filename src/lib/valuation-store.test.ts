import {afterEach,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.resetModules();});
it('keeps a lead held until photos are attached, including a lead without photos',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-only');
 const calls:any[]=[];vi.stubGlobal('fetch',vi.fn(async(url,opts)=>{calls.push(JSON.parse(opts.body));return new Response(JSON.stringify([{id:'fixture'}]),{status:200});}));
 const {insertLead,attachPhotos}=await import('./valuation-store');
 const id=await insertLead({name:'Owner',email:'owner@example.com',phone:'4255550100',answers:{},attribution:{}});
 expect(id).toBe('fixture');expect(calls[0].status).toBe('held');
 await attachPhotos(id!,[]);expect(calls[1]).toEqual({photos:[],status:'new'});
});
