import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="mt-4 text-[14px] font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        {description}
      </p>
      {actionLabel && (
        actionHref ? (
          <a href={actionHref}>
            <Button size="sm" className="mt-4 text-[13px]">
              {actionLabel}
            </Button>
          </a>
        ) : (
          <Button size="sm" className="mt-4 text-[13px]" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
