"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contacts",
  "/lists": "Lists",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New Campaign",
  "/sequences": "Sequences",
  "/sequences/new": "New Sequence",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (routeNames[pathname]) return routeNames[pathname];
  if (pathname.startsWith("/campaigns/") && pathname.endsWith("/analytics"))
    return "Campaign Analytics";
  if (pathname.startsWith("/campaigns/")) return "Edit Campaign";
  if (pathname.startsWith("/sequences/") && pathname.endsWith("/analytics"))
    return "Sequence Analytics";
  if (pathname.startsWith("/sequences/")) return "Edit Sequence";
  if (pathname.startsWith("/contacts/")) return "Contact Detail";
  if (pathname.startsWith("/lists/")) return "List Detail";
  return "Nurturly";
}

export function Topbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const title = getPageTitle(pathname);
  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() ?? "U";

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-[14px] font-medium text-foreground">{title}</h1>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground outline-none transition-opacity hover:opacity-80"
          >
            {initials}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-50 w-48 rounded-lg border border-border bg-popover p-1 shadow-md">
              {session?.user?.email && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-[12px] font-medium">{session.user.name ?? "User"}</p>
                    <p className="text-[11px] text-muted-foreground">{session.user.email}</p>
                  </div>
                  <div className="mx-1 my-1 h-px bg-border" />
                </>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] text-foreground transition-colors hover:bg-accent"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
