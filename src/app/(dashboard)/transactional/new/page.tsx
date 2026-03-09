"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function NewTransactionalPage() {
  useEffect(() => {
    async function create() {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled email" }),
      });
      if (res.ok) {
        const item = await res.json();
        window.location.href = `/transactional/${item.id}`;
      } else {
        window.location.href = "/transactional";
      }
    }
    create();
  }, []);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
