"use client";

import { useEffect, useState } from "react";

/** Slides up once the reader is past the hero, mirroring the NGY detail page. */
export function ListingStickyBar({
  name,
  price,
  brochureHref,
}: {
  name: string;
  price: string;
  brochureHref?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-secondary/95 backdrop-blur transition-transform duration-500 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5 lg:px-12">
        <div className="min-w-0">
          <p className="truncate font-[family-name:var(--font-cormorant)] text-lg font-light text-text-primary">
            {name}
          </p>
          <p className="text-xs text-gold">{price}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {brochureHref && (
            <a
              href={brochureHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden border border-border-light px-5 py-2.5 text-[10px] font-semibold tracking-[0.2em] text-text-secondary transition-colors duration-300 hover:border-gold hover:text-gold sm:inline-block"
            >
              BROCHURE
            </a>
          )}
          <a
            href="mailto:connor@grayyachts.com"
            className="bg-gold px-6 py-2.5 text-[10px] font-semibold tracking-[0.2em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
          >
            CONTACT CONNOR
          </a>
        </div>
      </div>
    </div>
  );
}
