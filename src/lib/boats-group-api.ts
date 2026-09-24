import type { ScrapeResult } from './yacht-catalog';

/** Public marketplace IDs are not interchangeable with Inventory DocumentID. */
export function boatsGroupIdentity(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return null;
    const host = url.hostname.replace(/^www\./, '');
    const fields: Record<string, string> = { 'yachtworld.com':'YachtWorldID', 'boattrader.com':'BtolID', 'boats.com':'BcnaID' };
    const field = fields[host];
    const id = /-(\d+)\/?$/.exec(url.pathname)?.[1];
    return field && id ? { field, id } : null;
  } catch { return null; }
}
const text = (v: unknown): string | null => typeof v === 'string' && v.trim() ? v.trim() : null;
const numeric = (v: unknown): number | null => {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  if (typeof v === 'string' && !/^\d+(?:\.\d+)?$/.test(v)) return null;
  const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null;
};
function measure(v: unknown, units: Record<string, number>) {
  const match = text(v)?.match(/^([\d,]+(?:\.\d+)?)\s+(.+)$/);
  if (!match) return null;
  const factor = units[match[2].toLowerCase()];
  return factor ? Number(match[1].replaceAll(',', '')) * factor : null;
}
/** Explicit source units only; unknown fields stay unknown. */
export function mapBoatsGroupRecord(record: Record<string, unknown>, url: string): ScrapeResult | null {
  const identity = boatsGroupIdentity(url);
  if (!identity || String(record[identity.field]) !== identity.id) return null;
  const builder = text(record.MakeString) ?? text(record.BuilderName);
  const model = text(record.Model);
  const year = numeric(record.ModelYear);
  if (!builder || !model || !year) return null;
  const hidden = ['true','1','yes','on'].includes(String(record.PriceHideInd).toLowerCase());
  const price = hidden ? null : text(record.Price) ?? text(record.OriginalPrice);
  const flags = ['Imported from the Boats Group inventory API. Review listing details before sharing.'];
  if (record.SalesStatus && record.SalesStatus !== 'Active') flags.push(`Listing status: ${record.SalesStatus}`);
  if (text(record.TaxStatusCode)) flags.push(String(record.TaxStatusCode));
  if (record.TotalEngineHoursNumeric) flags.push('The feed reports combined engine hours; individual engine hours have not been confirmed.');
  const location = record.BoatLocation as Record<string,unknown> | undefined;
  return {
    name: [year,builder,model].join(' '), builder, model, year,
    type: text(record.BoatClassCode), price,
    // Current comparison price ranking is USD only; never compare raw EUR with USD.
    priceNum: price ? measure(price, {usd:1}) : null,
    lengthFt: measure(record.LengthOverall, {ft:1,feet:1,m:3.280839895,meter:3.280839895,meters:3.280839895}), lengthM:null,
    beamFt: measure(record.BeamMeasure, {ft:1,feet:1,m:3.280839895,meter:3.280839895,meters:3.280839895}), beamM:null,
    maxSpeed: measure(record.MaximumSpeedMeasure, {kn:1,knot:1,knots:1,mph:0.868976242,'miles per hour':0.868976242,'km/h':0.539956803}),
    range: measure(record.RangeMeasure, {nm:1,'nautical miles':1,mi:0.868976242,miles:0.868976242,km:0.539956803}),
    cabins: numeric(record.CabinsCountNumeric), guests:null,
    engine: [text(record.EngineMakeString),text(record.EngineModel)].filter(Boolean).join(' ') || null,
    engineHours:null, // TotalEngineHoursNumeric is a sum, not per-engine running hours.
    location: [text(location?.BoatCityName),text(location?.BoatStateCode),text(location?.BoatCountryID)].filter(Boolean).join(', ') || null,
    imageUrl:null, source:'Boats Group', url, confidence:'medium', flags,
  };
}

export async function fetchBoatsGroupListing(url: string, key = process.env.BOATS_GROUP_API_KEY) {
  const identity = boatsGroupIdentity(url);
  if (!identity || !key) return null;
  const endpoint = new URL('https://api.boats.com/inventory/search');
  endpoint.searchParams.set('key',key);
  endpoint.searchParams.set(identity.field,identity.id);
  endpoint.searchParams.set('rows','2');
  let response: Response;
  try {
    response = await fetch(endpoint, {headers:{Accept:'application/vnd.dmm-v1+json'},redirect:'error',signal:AbortSignal.timeout(12000),cache:'no-store'});
  } catch { throw new Error('Boats Group connection unavailable.'); }
  // Never log the request URL or return upstream error bodies: they can contain the key.
  if (!response.ok) throw new Error(`Boats Group API HTTP ${response.status}.`);
  const body = await response.json();
  if (body.error) throw new Error('Boats Group API rejected the request.');
  const records = body.results ?? body.data?.results;
  if (!Array.isArray(records)) throw new Error('Unrecognized Boats Group response; verify the account feed format.');
  const matches = records.filter(r => r && String(r[identity.field]) === identity.id);
  if (matches.length !== 1) return null;
  const data = mapBoatsGroupRecord(matches[0],url);
  if (!data) return null;
  const images = matches[0].Images;
  const photos: string[] = Array.isArray(images) ? images.map(i=>text(i?.Uri)).filter((v): v is string=>Boolean(v)) : [];
  return { data, photos };
}
