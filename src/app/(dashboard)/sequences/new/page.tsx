import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewSequencePage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/sequences"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">New Sequence</h2>
      </div>
      <div className="rounded-lg border border-border">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-[13px] text-muted-foreground">Sequence builder coming soon.</p>
        </div>
      </div>
    </div>
  );
}
