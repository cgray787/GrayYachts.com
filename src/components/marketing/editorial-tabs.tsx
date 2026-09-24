'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Newspaper, Ship, Globe2, BookOpen, UserRound} from 'lucide-react';

const sections = [
  {href:'/newsletter', label:'Newsletter', icon:Newspaper},
  {href:'/brands', label:'Featured Brands', icon:Ship},
  {href:'/boat-shows', label:'Boat Shows', icon:Globe2},
  {href:'/insights', label:'Owner Guides', icon:BookOpen},
  {href:'/about-connor-gray', label:'Connor Gray', icon:UserRound},
];

export default function EditorialTabs({className = '', prominent=false}: {className?:string;prominent?:boolean}) {
  const pathname = usePathname();
  if (prominent) return <nav aria-label="Yacht research" data-editorial-navigation className={`relative border-b border-[#162636]/15 bg-white px-4 py-5 shadow-[0_8px_24px_-16px_rgba(22,38,54,0.3)] sm:px-6 lg:px-10 ${className}`}>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
      {sections.map(({href,label,icon:Icon},index) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
          className={`relative flex min-h-16 items-center justify-center gap-3 rounded-md border px-3 py-4 text-center text-base font-bold transition-colors lg:min-h-20 lg:text-lg xl:text-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#806336] ${index===4?'col-span-2 md:col-span-1':''} ${active ? 'border-[#162636] bg-[#162636] text-white shadow-sm' : 'border-[#162636]/10 bg-[#f7f4ee]/60 text-[#162636] hover:border-[#ad9163] hover:bg-[#eee6d8]'}`}>
          <Icon aria-hidden="true" className={`h-5 w-5 shrink-0 lg:h-6 lg:w-6 ${active?'text-[#e4c99c]':'text-[#806336]'}`}/>
          <span>{label}</span>
          {active&&<span aria-hidden="true" className="absolute inset-x-5 bottom-0 h-1 rounded-t bg-[#d8bd8c]"/>}
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
