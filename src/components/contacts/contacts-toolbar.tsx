"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ContactsListParams } from "@/lib/contacts/types";

interface ContactsToolbarProps {
  params: ContactsListParams;
  onParamsChange: (updates: Partial<ContactsListParams>) => void;
  selectedCount: number;
  onBulkDelete: () => void;
}

export function ContactsToolbar({
  params,
  onParamsChange,
  selectedCount,
  onBulkDelete,
}: ContactsToolbarProps) {
  const [searchValue, setSearchValue] = useState(params.search ?? "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onParamsChange({ search: searchValue || undefined });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>

        <select
          value={params.subscribed ?? ""}
          onChange={(e) => onParamsChange({ subscribed: (e.target.value || undefined) as ContactsListParams["subscribed"] })}
          className="h-8 rounded-md border border-border bg-background px-2 text-[12px] text-foreground outline-none"
        >
          <option value="">All status</option>
          <option value="true">Subscribed</option>
          <option value="false">Unsubscribed</option>
        </select>

        <select
          value={params.source ?? ""}
          onChange={(e) => onParamsChange({ source: (e.target.value || undefined) as ContactsListParams["source"] })}
          className="hidden h-8 rounded-md border border-border bg-background px-2 text-[12px] text-foreground outline-none sm:block"
        >
          <option value="">All sources</option>
          <option value="manual">Manual</option>
          <option value="import">Import</option>
          <option value="api">API</option>
        </select>
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted-foreground">{selectedCount} selected</span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onBulkDelete}>
            <Trash2 className="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
