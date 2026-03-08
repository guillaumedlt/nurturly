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
  Braces,
  SquareDashedBottom,
  Columns2,
  Columns3,
  Share2,
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
  variable: Braces,
  section: SquareDashedBottom,
  columns2: Columns2,
  columns3: Columns3,
  social: Share2,
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

  // Group items by category
  const categories = new Map<string, { items: SlashCommandItem[]; indices: number[] }>();
  items.forEach((item, index) => {
    const cat = item.category || "Other";
    if (!categories.has(cat)) {
      categories.set(cat, { items: [], indices: [] });
    }
    categories.get(cat)!.items.push(item);
    categories.get(cat)!.indices.push(index);
  });

  return (
    <div className="z-50 w-60 max-h-80 overflow-y-auto rounded-xl border border-border bg-background p-1.5 shadow-xl">
      {Array.from(categories.entries()).map(([category, { items: catItems, indices }]) => (
        <div key={category}>
          <div className="px-2.5 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
            {category}
          </div>
          {catItems.map((item, i) => {
            const globalIndex = indices[i];
            const Icon = ICONS[item.icon];
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => selectItem(globalIndex)}
                onMouseEnter={() => setSelectedIndex(globalIndex)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  globalIndex === selectedIndex
                    ? "bg-accent text-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                  {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium">{item.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
});
