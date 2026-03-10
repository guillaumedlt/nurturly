"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeDate } from "@/lib/utils";
import Link from "next/link";

interface ListDetail {
  id: string;
  name: string;
  description: string | null;
  type: string;
  filterRules: string | null;
  contactCount: number;
  createdAt: string;
}

interface Member {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  subscribed: boolean;
  addedAt: string;
}

export default function ListDetailPage() {
  const params = useParams();
  const listId = params.listId as string;
  const [list, setList] = useState<ListDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [listRes, membersRes] = await Promise.all([
      fetch(`/api/lists/${listId}`),
      fetch(`/api/lists/${listId}/members`),
    ]);
    if (listRes.ok) setList(await listRes.json());
    if (membersRes.ok) setMembers(await membersRes.json());
    setLoading(false);
  }, [listId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    );
  }

  if (!list) {
    return <p className="text-[13px] text-muted-foreground">Audience not found.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/lists"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">{list.name}</h2>
            <Badge variant="outline" className="text-[10px] font-normal">{list.type}</Badge>
          </div>
          {list.description && <p className="text-[12px] text-muted-foreground">{list.description}</p>}
        </div>
        <span className="text-[12px] text-muted-foreground">{members.length} contact{members.length !== 1 ? "s" : ""}</span>
      </div>

      {list.type === "dynamic" && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[12px] text-muted-foreground">
            This audience is dynamic — contacts are automatically included based on filter rules.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-border">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Users className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-[13px] font-medium text-foreground">No members</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {list.type === "dynamic"
                ? "No contacts match the current filter rules."
                : "Add contacts to this list from the contacts page."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Contact</th>
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">Company</th>
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Status</th>
                <th className="h-9 px-4 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground hidden sm:table-cell">
                  {list.type === "dynamic" ? "Created" : "Added"}
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const name = [m.firstName, m.lastName].filter(Boolean).join(" ");
                return (
                  <tr key={m.id} className="h-[42px] border-b border-border last:border-b-0 transition-colors hover:bg-muted/30">
                    <td className="px-4">
                      <Link href={`/contacts/${m.id}`} className="block">
                        {name && <p className="text-[13px] font-medium text-foreground hover:underline">{name}</p>}
                        <p className={cn("text-[12px]", name ? "text-muted-foreground" : "text-foreground hover:underline")}>{m.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 hidden sm:table-cell">
                      <span className="text-[12px] text-muted-foreground">{m.company || "—"}</span>
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", m.subscribed ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                        <span className="text-[11px] text-muted-foreground">{m.subscribed ? "Subscribed" : "Unsubscribed"}</span>
                      </div>
                    </td>
                    <td className="px-4 hidden sm:table-cell">
                      <span className="text-[12px] text-muted-foreground">{formatRelativeDate(m.addedAt)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
