"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Users,
  ListFilter,
  Send,
  GitBranch,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")}>
            <LayoutDashboard className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/contacts")}>
            <Users className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">Contacts</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/lists")}>
            <ListFilter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">Lists</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/campaigns")}>
            <Send className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">Campaigns</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/sequences")}>
            <GitBranch className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">Sequences</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/analytics")}>
            <BarChart3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">Analytics</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">Settings</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate("/campaigns/new")}>
            <Plus className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">New Campaign</span>
          </CommandItem>
          <CommandItem onSelect={() => navigate("/sequences/new")}>
            <Plus className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px]">New Sequence</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
