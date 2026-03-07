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
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate("/")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate("/contacts")}>
            <Users className="mr-2 h-4 w-4" />
            Contacts
          </CommandItem>
          <CommandItem onSelect={() => navigate("/lists")}>
            <ListFilter className="mr-2 h-4 w-4" />
            Lists
          </CommandItem>
          <CommandItem onSelect={() => navigate("/campaigns")}>
            <Send className="mr-2 h-4 w-4" />
            Campaigns
          </CommandItem>
          <CommandItem onSelect={() => navigate("/sequences")}>
            <GitBranch className="mr-2 h-4 w-4" />
            Sequences
          </CommandItem>
          <CommandItem onSelect={() => navigate("/analytics")}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analytics
          </CommandItem>
          <CommandItem onSelect={() => navigate("/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => navigate("/campaigns/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </CommandItem>
          <CommandItem onSelect={() => navigate("/sequences/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Sequence
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
