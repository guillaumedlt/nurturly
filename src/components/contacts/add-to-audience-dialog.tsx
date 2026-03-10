"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ListFilter, Check, Search } from "lucide-react";
import { toast } from "sonner";

interface AudienceOption {
  id: string;
  name: string;
  type: "static" | "dynamic";
  contactCount: number;
}

interface AddToAudienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactIds: string[];
  onDone: () => void;
}

export function AddToAudienceDialog({ open, onOpenChange, contactIds, onDone }: AddToAudienceDialogProps) {
  const [audiences, setAudiences] = useState<AudienceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch("");
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data) => {
        // Only show static audiences (can't manually add to dynamic)
        setAudiences((Array.isArray(data) ? data : []).filter((a: AudienceOption) => a.type === "static"));
      });
  }, [open]);

  const handleAdd = async (audienceId: string) => {
    setAdding(audienceId);
    try {
      const res = await fetch(`/api/lists/${audienceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds }),
      });
      if (res.ok) {
        const name = audiences.find((a) => a.id === audienceId)?.name;
        toast.success(`${contactIds.length} contact${contactIds.length !== 1 ? "s" : ""} added to ${name}`);
        onOpenChange(false);
        onDone();
      } else {
        toast.error("Failed to add contacts");
      }
    } catch {
      toast.error("Failed to add contacts");
    } finally {
      setAdding(null);
    }
  };

  const filtered = audiences.filter((a) =>
    !search.trim() || a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            Add to audience
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            {contactIds.length} contact{contactIds.length !== 1 ? "s" : ""} selected
          </p>
        </DialogHeader>

        {audiences.length > 3 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audiences..."
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto -mx-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <ListFilter className="mx-auto h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
              <p className="mt-2 text-[12px] text-muted-foreground">
                {audiences.length === 0 ? "No static audiences yet" : "No audiences match"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                Create a static audience first from the audiences page.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-1">
              {filtered.map((audience) => (
                <button
                  key={audience.id}
                  type="button"
                  disabled={adding !== null}
                  onClick={() => handleAdd(audience.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{audience.name}</p>
                    <p className="text-[11px] text-muted-foreground">{audience.contactCount} contact{audience.contactCount !== 1 ? "s" : ""}</p>
                  </div>
                  {adding === audience.id && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
