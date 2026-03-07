"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ListFilter,
  Send,
  GitBranch,
  BarChart3,
  Settings,
  Search,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/lists", label: "Lists", icon: ListFilter },
  { href: "/campaigns", label: "Campaigns", icon: Send },
  { href: "/sequences", label: "Sequences", icon: GitBranch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">
            nurturly
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-1">
        <button
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent"
          onClick={() => {
            setMobileOpen(false);
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-auto hidden rounded border border-border px-1 py-0.5 font-mono text-[9px] text-muted-foreground/50 sm:inline-block">
            &#8984;K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-px px-3 pt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150",
                active
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 py-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150",
            pathname.startsWith("/settings")
              ? "bg-foreground text-background font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Settings className="h-[15px] w-[15px] shrink-0" strokeWidth={1.5} />
          <span>Settings</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background shadow-sm transition-colors hover:bg-accent lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col border-r border-border bg-background transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
