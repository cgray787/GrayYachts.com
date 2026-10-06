import {describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/newsletter/db',()=>({newsletterEnv:vi.fn()}));
import {automated,destination,validToken,validateCall} from './campaign-tracking';
describe('campaign attribution safety',()=>{
 it('allows only random opaque tokens',()=>{expect(validToken('a'.repeat(48))).toBe(true);expect(validToken('jamie@example.com')).toBe(false);expect(validToken('../abc')).toBe(false);});
 it('only redirects to fixed approved destinations',()=>{expect(destination('a'.repeat(48),'https://evil.example')).toBeNull();expect(destination('a'.repeat(48),'talk')).toBe('https://grayyachts.com/discovery-call?t='+'a'.repeat(48));expect(destination('x','sirena')).toBe('https://grayyachts.com/yachts/sirena-48');});
 it('flags scanners and prefetch separately from regular requests',()=>{expect(automated(new Request('https://grayyachts.com',{headers:{'user-agent':'Proofpoint scanner'}}))).toBe(true);expect(automated(new Request('https://grayyachts.com',{headers:{purpose:'prefetch'}}))).toBe(true);expect(automated(new Request('https://grayyachts.com',{headers:{'user-agent':'Mozilla/5.0'}}))).toBe(false);});
 it('rejects invalid form shapes, dates and zones',()=>{const b={name:'Test',email:'test@example.com',phone:'',preferred_time:new Date(Date.now()+86400000*7).toISOString().slice(0,16),timezone:'America/Chicago',message:'',company:''};expect(validateCall(b)).toEqual(b);expect(validateCall({...b,timezone:'invalid-zone'})).toBeNull();expect(validateCall({...b,preferred_time:'2020-01-01T12:00'})).toBeNull();expect(validateCall({...b,email:'bad'})).toBeNull();expect(validateCall({...b,name:[]})).toBeNull();});
});
