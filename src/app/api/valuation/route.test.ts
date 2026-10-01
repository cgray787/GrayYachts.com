import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/valuation-ledger',()=>({ATTRIBUTION_KEYS:['utm_source','oppref'],storeInquiry:vi.fn(),markInquiry:vi.fn()}));
import {storeInquiry,markInquiry} from '@/lib/valuation-ledger';
import {POST} from './route';
const id='c07005de-7cda-45eb-8b75-5d32f057763b';
const body={name:'Test Owner',email:'owner@example.test',phone:'2065550123',submission_id:id,engine_hours:'Under 500',utm_source:'chatgpt'};
const request=(value:unknown)=>new Request('https://www.grayyachts.com/api/valuation',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://www.grayyachts.com'},body:JSON.stringify(value)});
beforeEach(()=>{vi.stubEnv('RESEND_API_KEY','test-only');vi.mocked(storeInquiry).mockResolvedValue({id,accepted:false,attribution:{utm_source:'chatgpt'}});vi.mocked(markInquiry).mockResolvedValue();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'test-receipt'}),{status:200})));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetAllMocks();});
describe('valuation acceptance boundary',()=>{
  it('rejects malformed bodies and empty contacts before storage',async()=>{
    for(const value of [null,[],{}, {...body,email:'invalid'}]) expect((await POST(request(value))).status).toBe(400);
    expect(storeInquiry).not.toHaveBeenCalled();
  });
  it('never counts honeypot submissions',async()=>{expect(await (await POST(request({...body,hp:'bot'}))).json()).toEqual({ok:true,accepted:false});expect(storeInquiry).not.toHaveBeenCalled();});
  it('does not send email when durable storage fails',async()=>{
    vi.mocked(storeInquiry).mockRejectedValue(new Error('lead_storage_failed'));
    expect((await POST(request(body))).status).toBe(503);expect(fetch).not.toHaveBeenCalled();
  });
  it('reports provider failure without a successful conversion',async()=>{
    vi.mocked(fetch).mockResolvedValue(new Response('{}',{status:502}));
    expect((await POST(request(body))).status).toBe(502);expect(markInquiry).toHaveBeenCalledWith(id,null);
  });
  it('requires the notification receipt to be saved before success',async()=>{
    vi.mocked(markInquiry).mockRejectedValue(new Error('db unavailable'));
    expect((await POST(request(body))).status).toBe(503);
  });
  it('returns the durable id and uses a stable provider idempotency key',async()=>{
    expect(await (await POST(request(body))).json()).toEqual({ok:true,accepted:true,lead_id:id});
    const args=vi.mocked(fetch).mock.calls[0][1]!;
    expect(args.headers).toMatchObject({'Idempotency-Key':`valuation/${id}`});
    expect(markInquiry).toHaveBeenCalledWith(id,'test-receipt');
    expect(String(args.body)).toContain('Under 500');
  });
  it('returns an already accepted inquiry without sending another email',async()=>{
    vi.mocked(storeInquiry).mockResolvedValue({id,accepted:true,attribution:{}});
    expect(await (await POST(request(body))).json()).toMatchObject({accepted:true,lead_id:id});expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects conflicting retry payloads',async()=>{
    vi.mocked(storeInquiry).mockRejectedValue(new Error('submission_conflict'));
    expect((await POST(request(body))).status).toBe(409);expect(fetch).not.toHaveBeenCalled();
  });
});
