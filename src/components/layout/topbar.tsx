"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, ChevronRight } from "lucide-react";

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contacts",
  "/lists": "Audiences",
  "/campaigns": "Campaigns",
  "/transactional": "Transactional",
  "/transactional/new": "New Email",
  "/sequences": "Sequences",
  "/sequences/new": "New Sequence",
  "/emails": "Emails",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function getPageTitle(pathname: string): string {
  if (routeNames[pathname]) return routeNames[pathname];
  if (pathname.startsWith("/transactional/") && pathname.endsWith("/analytics"))
    return "Email Analytics";
  if (pathname.startsWith("/transactional/")) return "Edit Email";
  if (pathname.startsWith("/sequences/") && pathname.endsWith("/analytics"))
    return "Sequence Analytics";
  if (pathname.startsWith("/sequences/")) return "Edit Sequence";
  if (pathname.startsWith("/contacts/")) return "Contact Detail";
  if (pathname.startsWith("/lists/")) return "Audience Detail";
  if (pathname.startsWith("/campaigns/")) return "Campaign Detail";
  return "Nurturly";
}

function getBreadcrumb(pathname: string): { parent: string; parentHref: string } | null {
  if (pathname.startsWith("/transactional/") && pathname !== "/transactional")
    return { parent: "Transactional", parentHref: "/transactional" };
  if (pathname.startsWith("/sequences/") && pathname !== "/sequences")
    return { parent: "Sequences", parentHref: "/sequences" };
  if (pathname.startsWith("/contacts/") && pathname !== "/contacts")
    return { parent: "Contacts", parentHref: "/contacts" };
  if (pathname.startsWith("/lists/") && pathname !== "/lists")
    return { parent: "Audiences", parentHref: "/lists" };
  if (pathname.startsWith("/campaigns/") && pathname !== "/campaigns")
    return { parent: "Campaigns", parentHref: "/campaigns" };
  return null;
}

export function Topbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const title = getPageTitle(pathname);
  const breadcrumb = getBreadcrumb(pathname);
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
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-1.5 pl-10 lg:pl-0">
        {breadcrumb && (
          <>
            <a
              href={breadcrumb.parentHref}
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {breadcrumb.parent}
            </a>
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
          </>
        )}
        <h1 className="text-[13px] font-medium text-foreground">{title}</h1>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[10px] font-medium text-background outline-none transition-opacity hover:opacity-80"
        >
          {initials}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-50 w-52 rounded-lg border border-border bg-background p-1 shadow-lg">
            {session?.user?.email && (
              <>
                <div className="px-2.5 py-2">
                  <p className="text-[12px] font-medium text-foreground">{session.user.name ?? "User"}</p>
                  <p className="text-[11px] text-muted-foreground">{session.user.email}</p>
                </div>
                <div className="mx-1 my-1 h-px bg-border" />
              </>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
