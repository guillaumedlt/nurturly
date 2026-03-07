import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-[13px] font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-[280px] text-[12px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref}>
            <Button variant="outline" size="sm" className="mt-4 h-8 text-[12px]">
              {actionLabel}
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" className="mt-4 h-8 text-[12px]" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
