import { cn } from "@/lib/utils";

type Status = "draft" | "active" | "paused" | "scheduled" | "sending" | "sent" | "completed" | "archived" | "cancelled";

const statusStyles: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-foreground text-background",
  paused: "bg-muted text-muted-foreground",
  scheduled: "bg-muted text-foreground",
  sending: "bg-foreground text-background",
  sent: "bg-muted text-foreground",
  completed: "bg-muted text-foreground",
  archived: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium capitalize",
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
