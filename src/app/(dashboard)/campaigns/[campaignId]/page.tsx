"use client";

import { useParams } from "next/navigation";
import { CampaignDetailClient } from "@/components/campaigns/campaign-detail-client";

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  return <CampaignDetailClient campaignId={params.campaignId} />;
}
