"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ImageIcon,
  MousePointerClick,
  Minus,
  MoveVertical,
} from "lucide-react";
import type { SlashCommandItem } from "@/lib/editor/extensions/slash-command";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  list: List,
  listOrdered: ListOrdered,
  quote: Quote,
  image: ImageIcon,
  button: MousePointerClick,
  divider: Minus,
  spacer: MoveVertical,
};

interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandList = forwardRef<
  { onKeyDown: (props: { event: KeyboardEvent }) => boolean },
  SlashCommandListProps
>(function SlashCommandList({ items, command }, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) command(item);
    },
    [items, command]
  );

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) return null;

  return (
    <div className="z-50 w-56 rounded-lg border border-border bg-background p-1 shadow-lg">
      {items.map((item, index) => {
        const Icon = ICONS[item.icon];
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
              index === selectedIndex
                ? "bg-accent text-foreground"
                : "text-foreground hover:bg-accent"
            }`}
          >
            {Icon && (
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="text-[13px] font-medium">{item.title}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {item.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
});
