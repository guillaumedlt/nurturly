"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateListDialog({ open, onOpenChange, onCreated }: CreateListDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => { setName(""); setDescription(""); setError(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, type: "static" }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      reset();
      onOpenChange(false);
      onCreated();
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Create list</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Name *</label>
            <Input placeholder="Newsletter subscribers" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Description</label>
            <Textarea placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} className="text-[13px] min-h-[60px]" />
          </div>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={loading}>{loading ? "Creating..." : "Create list"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
