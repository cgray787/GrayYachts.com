import {describe,it,expect,vi,beforeEach} from 'vitest';
const mocks=vi.hoisted(()=>({recipient:vi.fn(),record:vi.fn()}));
vi.mock('@/lib/campaign-tracking',async()=>{const actual=await vi.importActual<typeof import('./campaign-tracking')>('@/lib/campaign-tracking');return {...actual,...mocks};});
import {GET,HEAD} from '@/app/c/[token]/[link]/route';
const token='a'.repeat(48);const ctx=(link:string)=>({params:Promise.resolve({token,link})});
beforeEach(()=>{vi.clearAllMocks();mocks.recipient.mockResolvedValue({token,is_test:1});mocks.record.mockResolvedValue(undefined);});
describe('tracked redirects',()=>{
 it('records the exact clicked placement before a fixed redirect',async()=>{const r=await GET(new Request('https://grayyachts.com/c/x/sirena--2'),ctx('sirena--2'));expect(r.status).toBe(302);expect(r.headers.get('location')).toBe('https://grayyachts.com/yachts/sirena-48');expect(mocks.record).toHaveBeenCalledWith(token,'click','sirena--2',expect.any(Request));expect(r.headers.get('cache-control')).toContain('no-store');});
 it('does not count HEAD requests',async()=>{expect((await HEAD(new Request('https://grayyachts.com',{method:'HEAD'}),ctx('talk'))).status).toBe(302);expect(mocks.record).not.toHaveBeenCalled();});
 it('rejects missing recipients and unapproved links',async()=>{mocks.recipient.mockResolvedValue(null);expect((await GET(new Request('https://grayyachts.com'),ctx('talk'))).status).toBe(404);expect((await GET(new Request('https://grayyachts.com'),ctx('https://evil.example'))).status).toBe(404);expect(mocks.record).not.toHaveBeenCalled();});
 it('does not pretend successful recording if the database fails',async()=>{mocks.record.mockRejectedValue(Error('db unavailable'));expect((await GET(new Request('https://grayyachts.com'),ctx('talk'))).status).toBe(503);});
});
