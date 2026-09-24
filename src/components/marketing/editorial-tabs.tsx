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

export default function EditorialTabs({className = ''}: {className?:string}) {
  const pathname = usePathname();
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
