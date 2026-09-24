'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';

const sections = [
  {href:'/newsletter', label:'Newsletter'},
  {href:'/brands', label:'Featured Brands'},
  {href:'/boat-shows', label:'Boat Shows'},
  {href:'/insights', label:'Owner Guides'},
  {href:'/about-connor-gray', label:'Connor Gray'},
];

export default function EditorialTabs({className = '', prominent=false}: {className?:string;prominent?:boolean}) {
  const pathname = usePathname();
  if (prominent) return <nav aria-label="Yacht research" data-editorial-navigation className={`relative border-b border-[#162636]/10 bg-white px-4 py-6 sm:px-6 lg:px-10 ${className}`}>
    <div className="grid grid-cols-2 gap-1.5 rounded-[24px] border border-[#162636]/10 bg-gradient-to-b from-[#f9f9f7] to-[#efefeb] p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,1),0_8px_24px_-18px_rgba(22,38,54,0.25)] md:grid-cols-5 md:rounded-full">
      {sections.map(({href,label},index) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
          className={`group relative flex min-h-14 items-center justify-center gap-2.5 rounded-full border px-3 py-3 text-center text-[15px] font-semibold tracking-[0.015em] transition-[color,background-color,box-shadow,border-color] duration-200 motion-reduce:transition-none lg:min-h-16 lg:text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#806336] ${index===4?'col-span-2 md:col-span-1':''} ${active ? 'border-[#34495b] bg-gradient-to-b from-[#24394a] to-[#101e2b] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_3px_8px_rgba(15,30,43,0.18)]' : 'border-transparent text-[#334455] hover:border-[#d9cbb4] hover:bg-white hover:text-[#101e2b] hover:shadow-sm'}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${active?'bg-[#dfc18e] shadow-[0_0_8px_rgba(223,193,142,0.5)]':'bg-transparent'}`}/>
          <span>{label}</span>
          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0"/>
        </Link>;
      })}
    </div>
  </nav>;
  return <nav aria-label="Yacht research" className={`flex flex-wrap gap-x-6 gap-y-1 border-y border-gold/25 py-2 text-sm ${className}`}>
    {sections.map(({href,label}) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
        className={`border-b-2 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold ${active ? 'border-gold text-gold' : 'border-transparent text-slate-300 hover:border-gold/50 hover:text-gold'}`}>
        {label}
      </Link>;
    })}
  </nav>;
}
