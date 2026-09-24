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
  if (prominent) return <nav aria-label="Yacht research" data-editorial-navigation className={`relative border-b border-[#162636]/15 bg-white px-4 sm:px-6 lg:px-10 ${className}`}>
    <div className="grid grid-cols-2 md:grid-cols-5">
      {sections.map(({href,label},index) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
          className={`group flex min-h-16 items-center justify-center px-3 py-2 text-center text-xs font-medium uppercase tracking-[0.2em] transition-colors duration-300 motion-reduce:transition-none lg:min-h-20 lg:text-sm focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#806336] ${index===4?'col-span-2 md:col-span-1':''} ${active ? 'text-[#806336]' : 'text-[#162636] hover:text-[#806336]'}`}>
          <span className={`border-b-2 py-4 transition-colors duration-300 motion-reduce:transition-none ${active?'border-[#b39460]':'border-transparent group-hover:border-[#b39460]/50'}`}>{label}</span>
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
