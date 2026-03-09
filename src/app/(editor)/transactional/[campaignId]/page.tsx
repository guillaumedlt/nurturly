"use client";

import { useParams } from "next/navigation";
import { TransactionalEditorPage } from "@/components/transactional/transactional-editor-page";

export default function TransactionalEditorRoute() {
  const params = useParams<{ campaignId: string }>();
  return <TransactionalEditorPage campaignId={params.campaignId} />;
}
