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

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
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

  const currentStatus = params.subscribed ?? "";
  const currentSource = params.source ?? "";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative max-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="h-8 pl-8 text-[12px]"
          />
        </div>

        <div className="flex items-center gap-1">
          <FilterPill
            label="All"
            active={currentStatus === ""}
            onClick={() => onParamsChange({ subscribed: undefined })}
          />
          <FilterPill
            label="Subscribed"
            active={currentStatus === "true"}
            onClick={() => onParamsChange({ subscribed: "true" as ContactsListParams["subscribed"] })}
          />
          <FilterPill
            label="Unsubscribed"
            active={currentStatus === "false"}
            onClick={() => onParamsChange({ subscribed: "false" as ContactsListParams["subscribed"] })}
          />
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          <FilterPill
            label="All sources"
            active={currentSource === ""}
            onClick={() => onParamsChange({ source: undefined })}
          />
          <FilterPill
            label="Manual"
            active={currentSource === "manual"}
            onClick={() => onParamsChange({ source: "manual" as ContactsListParams["source"] })}
          />
          <FilterPill
            label="Import"
            active={currentSource === "import"}
            onClick={() => onParamsChange({ source: "import" as ContactsListParams["source"] })}
          />
          <FilterPill
            label="API"
            active={currentSource === "api"}
            onClick={() => onParamsChange({ source: "api" as ContactsListParams["source"] })}
          />
        </div>
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
