/* eslint-disable @next/next/no-img-element -- Local, licensed editorial thumbnails. */
import Link from 'next/link';
export type EditorialPhoto={url:string;alt:string;caption?:string;credit?:string;source?:string;license?:string;licenseUrl?:string;fit?:'contain'|'cover'};
export default function PostThumbnail({photo,href,priority=false}:{photo:EditorialPhoto;href?:string;priority?:boolean}) {
 const picture=<div className="overflow-hidden rounded-sm bg-[#122535]"><img data-post-thumbnail src={photo.url} alt={photo.alt} width="1000" height="667" loading={priority?'eager':'lazy'} className={`aspect-[3/2] w-full ${photo.fit==='cover'?'object-cover':'object-contain'} transition-transform duration-500 group-hover:scale-[1.025]`}/></div>;
 return <figure className="mb-6">{href?<Link href={href} aria-label={`Read article: ${photo.alt}`}>{picture}</Link>:picture}{(photo.caption||photo.credit)&&<figcaption className="mt-2 text-[10px] leading-4 opacity-65">{photo.caption}<span className="block">{photo.credit}{photo.source&&<> · <a href={photo.source} className="underline">Photo source</a></>}{photo.licenseUrl&&<> · <a href={photo.licenseUrl} className="underline">{photo.license}</a></>}</span></figcaption>}</figure>;
}
