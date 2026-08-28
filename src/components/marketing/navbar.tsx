"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn } from "lucide-react";

const navLinks = [
  { label: "FLEET", href: "/fleet" },
  { label: "COMPARE", href: "/compare" },
  { label: "SELL", href: "/sell", accent: true },
  { label: "CONTACT", href: "/#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-bg-primary/90 backdrop-blur-md border-b border-border/50"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12">
        {/* Left: brand mark, then nav links */}
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Gray Yachts — home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-nav.png"
              alt="Gray Yachts"
              width={56}
              height={56}
              className="h-14 w-auto transition-opacity duration-300 hover:opacity-80"
            />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-[11px] font-medium tracking-[0.2em] transition-colors duration-300 ${
                link.accent
                  ? "text-gold hover:text-gold-hover"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-text-secondary hover:text-text-primary md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Right: client login only — the brand mark now anchors the left. */}
        <Link
          href="/login"
          className="hidden items-center gap-2 text-[11px] font-medium tracking-[0.15em] text-text-secondary transition-colors duration-300 hover:text-gold md:flex"
        >
          <LogIn className="h-3.5 w-3.5" />
          CLIENT LOGIN
        </Link>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border-b border-border bg-bg-primary/95 backdrop-blur-md px-6 pb-6 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-[11px] font-medium tracking-[0.2em] ${
                    link.accent
                      ? "text-gold hover:text-gold-hover"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-[11px] font-medium tracking-[0.2em] text-gold hover:text-gold-hover"
              >
                <LogIn className="h-3.5 w-3.5" />
                CLIENT LOGIN
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
