"use client";

import { useParams } from "next/navigation";
import { CampaignEditorPage } from "@/components/campaigns/campaign-editor-page";

export default function CampaignEditorRoute() {
  const params = useParams<{ campaignId: string }>();
  return <CampaignEditorPage campaignId={params.campaignId} />;
}
