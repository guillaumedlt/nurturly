"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const title = getPageTitle(pathname);
  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : session?.user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-[14px] font-medium text-foreground">{title}</h1>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground outline-none transition-opacity hover:opacity-80">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {session?.user?.email && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-[12px] font-medium">{session.user.name ?? "User"}</p>
                  <p className="text-[11px] text-muted-foreground">{session.user.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="text-[13px]"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
