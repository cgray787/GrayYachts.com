"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Anchor,
  LayoutDashboard,
  Ship,
  Columns2,
  FileText,
  Wrench,
  Briefcase,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  {
    label: "Dashboard",
    href: "/portal/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My Yachts",
    href: "/portal/my-yachts",
    icon: Ship,
  },
  {
    label: "Compare Yachts",
    href: "/portal/compare-yachts",
    icon: Columns2,
  },
  {
    label: "Documents",
    href: "/portal/documents",
    icon: FileText,
  },
  {
    label: "Maintenance",
    href: "/portal/maintenance",
    icon: Wrench,
  },
  {
    label: "Services",
    href: "/portal/services",
    icon: Briefcase,
    subItems: [
      { label: "Insurance", href: "/portal/services/insurance" },
      { label: "Captain & Crew", href: "/portal/services/captain-crew" },
      { label: "Berth & Marina", href: "/portal/services/berth-marina" },
      { label: "Engine & Boat Service", href: "/portal/services/engine-boat" },
    ],
  },
];

interface SidebarProps {
  profile?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [servicesOpen, setServicesOpen] = useState(
    pathname.startsWith("/portal/services")
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-close drawer + sync services accordion on navigation
  useEffect(() => {
    setDrawerOpen(false);
    if (pathname.startsWith("/portal/services")) {
      setServicesOpen(true);
    }
  }, [pathname]);

  // Scroll lock when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const navContent = (onNavigate?: () => void) => (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          pathname.startsWith(item.href + "/") ||
          (item.subItems &&
            item.subItems.some((sub) => pathname === sub.href));
        const hasSubItems = !!item.subItems;

        return (
          <li key={item.href}>
            {hasSubItems ? (
              <>
                <button
                  onClick={() => setServicesOpen(!servicesOpen)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-gold-muted text-white"
                      : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px]",
                      isActive ? "text-gold" : "text-text-secondary"
                    )}
                  />
                  <span className="flex-1 text-left">{item.label}</span>
                  {servicesOpen ? (
                    <ChevronDown className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  )}
                </button>
                {servicesOpen && item.subItems && (
                  <ul className="mt-1 ml-[30px] space-y-0.5 border-l border-border pl-3">
                    {item.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            onClick={onNavigate}
                            className={cn(
                              "block rounded-md px-3 py-2 text-[13px] transition-colors",
                              isSubActive
                                ? "text-gold"
                                : "text-text-secondary hover:text-text-primary"
                            )}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            ) : (
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gold-muted text-white"
                    : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px]",
                    isActive ? "text-gold" : "text-text-secondary"
                  )}
                />
                {item.label}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );

  const userFooter = (
    <div className="border-t border-border px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-muted text-sm font-semibold text-gold">
          {getInitials(profile?.full_name ?? "Portal User")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {profile?.full_name ?? "Portal User"}
          </p>
          <p className="truncate text-xs text-text-secondary">
            {profile?.email ?? ""}
          </p>
        </div>
        <button
          onClick={async () => {
            try {
              const { createClient } = await import("@/lib/supabase/client");
              const supabase = createClient();
              if (supabase) await supabase.auth.signOut();
            } catch {
              // Supabase not configured — just redirect
            }
            window.location.href = "/";
          }}
          title="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-card hover:text-text-primary"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
    <aside className="fixed top-0 left-0 z-40 hidden h-screen w-60 flex-col border-r border-border bg-bg-secondary lg:flex">
      {/* Logo — links back to main page */}
      <Link href="/" className="flex items-center gap-3 px-6 py-6 transition-opacity hover:opacity-80">
        <Anchor className="h-6 w-6 text-gold" />
        <span className="font-[family-name:var(--font-cormorant)] text-lg font-semibold tracking-wide text-gold">
          GRAY YACHTS
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        <p className="mb-3 px-3 text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary">
          Navigation
        </p>
        {navContent()}
      </nav>

      {/* User Footer */}
      {userFooter}
    </aside>

    {/* Mobile hamburger button */}
    <button
      onClick={() => setDrawerOpen(!drawerOpen)}
      className="fixed top-3 left-3 z-[60] flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-bg-secondary text-text-secondary transition-colors hover:text-gold lg:hidden"
      aria-label="Toggle navigation"
      aria-expanded={drawerOpen}
      aria-controls="mobile-drawer"
    >
      {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>

    {/* Mobile backdrop */}
    {drawerOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        onClick={() => setDrawerOpen(false)}
      />
    )}

    {/* Mobile drawer */}
    <div
      id="mobile-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      className={cn(
        "fixed top-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-bg-secondary transition-transform duration-300 ease-in-out lg:hidden",
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <Link
        href="/"
        onClick={() => setDrawerOpen(false)}
        className="flex items-center gap-3 px-6 py-6 transition-opacity hover:opacity-80"
      >
        <Anchor className="h-6 w-6 text-gold" />
        <span className="font-[family-name:var(--font-cormorant)] text-lg font-semibold tracking-wide text-gold">
          GRAY YACHTS
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pt-2">
        <p className="mb-3 px-3 text-[11px] font-medium uppercase tracking-[0.15em] text-text-secondary">
          Navigation
        </p>
        {navContent(() => setDrawerOpen(false))}
      </nav>

      {userFooter}
    </div>
    </>
  );
}
