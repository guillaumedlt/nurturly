"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, ListFilter, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeDate } from "@/lib/utils";
import { CreateListDialog } from "./create-list-dialog";
import Link from "next/link";

interface List {
  id: string;
  name: string;
  description: string | null;
  type: "static" | "dynamic";
  contactCount: number;
  createdAt: string;
}

export function ListsPageClient() {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchLists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lists");
      if (res.ok) setLists(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/lists/${id}`, { method: "DELETE" });
    fetchLists();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Audiences</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {lists.length > 0 ? `${lists.length} audience${lists.length !== 1 ? "s" : ""}` : "Organize contacts into audiences for targeted campaigns."}
          </p>
        </div>
        <Button size="sm" className="h-8 text-[12px]" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create audience
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border">
          <div className="flex items-center justify-center py-20">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
          </div>
        </div>
      ) : lists.length === 0 ? (
        <div className="rounded-lg border border-border">
          <EmptyState
            icon={ListFilter}
            title="No audiences yet"
            description="Create an audience to group contacts for targeted campaigns and sequences."
            actionLabel="Create your first audience"
            onAction={() => setCreateOpen(true)}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Name</th>
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Type</th>
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Contacts</th>
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Created</th>
                <th className="h-9 w-10 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {lists.map((list) => (
                <tr key={list.id} className="h-[42px] border-b border-border last:border-b-0 transition-colors hover:bg-muted/30">
                  <td className="px-4">
                    <Link href={`/lists/${list.id}`} className="text-[13px] font-medium text-foreground hover:underline">
                      {list.name}
                    </Link>
                    {list.description && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{list.description}</p>
                    )}
                  </td>
                  <td className="px-4 hidden sm:table-cell">
                    <Badge variant="outline" className="text-[10px] font-normal">{list.type}</Badge>
                  </td>
                  <td className="px-4">
                    <span className="text-[13px] font-stat text-foreground">{list.contactCount}</span>
                  </td>
                  <td className="px-4 hidden sm:table-cell">
                    <span className="text-[12px] text-muted-foreground">{formatRelativeDate(list.createdAt)}</span>
                  </td>
                  <td className="px-4">
                    <button onClick={() => handleDelete(list.id)} className="text-muted-foreground/50 transition-colors hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={fetchLists} />
    </div>
  );
}
