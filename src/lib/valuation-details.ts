/** Normalize an optional public listing URL; never fetch a user-provided URL here. */
export function listingUrl(value:unknown):string|null {
 if(value==null||value==='')return null;
 if(typeof value!=='string'||value.length>2000)throw Error('invalid_listing_url');
 const raw=value.trim();if(!raw)return null;
 const u=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port||!u.hostname.includes('.')||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname)||u.hostname.endsWith('.local')||u.hostname.startsWith('['))throw Error('invalid_listing_url');
 u.hash='';return u.href;
}
