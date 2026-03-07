"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NewCampaignPage() {
  const router = useRouter();

  useEffect(() => {
    async function create() {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled campaign" }),
      });
      if (res.ok) {
        const campaign = await res.json();
        router.replace(`/campaigns/${campaign.id}`);
      } else {
        router.replace("/campaigns");
      }
    }
    create();
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
