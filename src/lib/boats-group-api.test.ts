import { afterEach, expect, it, vi } from 'vitest';
import { boatsGroupIdentity, fetchBoatsGroupListing, mapBoatsGroupRecord } from './boats-group-api';
afterEach(()=>vi.unstubAllGlobals());
const url='https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/';
const record={YachtWorldID:'9727102',ModelYear:'2018',MakeString:'Lagoon',Model:'50',Price:'566246 USD',LengthOverall:'14.8 meter',BeamMeasure:'26.6 ft',MaximumSpeedMeasure:'20 mph',RangeMeasure:'218 mi',TotalEngineHoursNumeric:'6776',CabinsCountNumeric:'8',SalesStatus:'Active',Images:[{Uri:'https://images.boats.com/boat.jpg'}]};
it('uses the source-specific ID and rejects lookalike hosts',()=>{
 expect(boatsGroupIdentity(url)).toEqual({field:'YachtWorldID',id:'9727102'});
 expect(boatsGroupIdentity('https://www.boattrader.com/boat/2023-axopar-9589437/')).toEqual({field:'BtolID',id:'9589437'});
 expect(boatsGroupIdentity('https://www.boats.com/power-boats/2023-axopar-9589437/')).toEqual({field:'BcnaID',id:'9589437'});
 expect(boatsGroupIdentity(url.replace('yachtworld.com','yachtworld.com.evil.test'))).toBeNull();
});
it('maps units and excludes combined hours, hidden prices, and unrelated boats',()=>{
 const data=mapBoatsGroupRecord(record,url)!;
 expect(data.lengthFt).toBeCloseTo(48.556);
 expect(data.maxSpeed).toBeCloseTo(17.3795);
 expect(data.engineHours).toBeNull();
 expect(data.priceNum).toBe(566246);
 expect(mapBoatsGroupRecord({...record,PriceHideInd:true},url)?.priceNum).toBeNull();
 expect(mapBoatsGroupRecord({...record,Price:'500000 EUR'},url)?.priceNum).toBeNull();
 expect(mapBoatsGroupRecord({...record,YachtWorldID:'999'},url)).toBeNull();
 expect(mapBoatsGroupRecord({...record,MaximumSpeedMeasure:null,CruisingSpeedMeasure:'10 kn'},url)?.maxSpeed).toBeNull();
});
it('skips unconfigured access and validates exact feed matches',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 expect(await fetchBoatsGroupListing(url,'')).toBeNull();expect(fetcher).not.toHaveBeenCalled();
 fetcher.mockResolvedValue(new Response(JSON.stringify({results:[record]})));
 const result=await fetchBoatsGroupListing(url,'test-key');
 expect(result?.data.builder).toBe('Lagoon');expect(result?.photos).toHaveLength(1);
 const query=new URL(fetcher.mock.calls[0][0]);expect(query.searchParams.get('YachtWorldID')).toBe('9727102');
 fetcher.mockResolvedValue(new Response(JSON.stringify({results:[{...record,YachtWorldID:'different'}]})));
 expect(await fetchBoatsGroupListing(url,'test-key')).toBeNull();
});
it('does not expose credential-bearing upstream errors',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('https://api.boats.com/?key=secret')));
 await expect(fetchBoatsGroupListing(url,'secret')).rejects.toThrow('Boats Group connection unavailable.');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('key=secret',{status:401})));
 await expect(fetchBoatsGroupListing(url,'secret')).rejects.toThrow('Boats Group API HTTP 401.');
});
