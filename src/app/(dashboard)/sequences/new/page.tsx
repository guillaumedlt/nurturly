"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function NewSequencePage() {
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function create() {
      if (creating) return;
      setCreating(true);
      try {
        const res = await fetch("/api/sequences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Untitled sequence" }),
        });
        if (res.ok) {
          const seq = await res.json();
          window.location.href = `/sequences/${seq.id}`;
        }
      } catch {
        window.location.href = "/sequences";
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
