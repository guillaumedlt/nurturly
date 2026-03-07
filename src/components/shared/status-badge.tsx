import { cn } from "@/lib/utils";

type Status = "draft" | "active" | "paused" | "scheduled" | "sending" | "sent" | "completed" | "archived" | "cancelled";

const statusStyles: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  scheduled: "bg-blue-50 text-blue-700",
  sending: "bg-indigo-50 text-indigo-700",
  sent: "bg-emerald-50 text-emerald-700",
  completed: "bg-emerald-50 text-emerald-700",
  archived: "bg-muted text-muted-foreground",
  cancelled: "bg-red-50 text-red-700",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize",
        statusStyles[status],
        className
      )}
    >
      {status}
    </span>
  );
}
