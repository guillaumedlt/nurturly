"use client";

import { NodeViewWrapper, NodeViewContent, type ReactNodeViewProps } from "@tiptap/react";
import { Columns2, Columns3, Columns4 } from "lucide-react";

export function ColumnsBlockView({ node, updateAttributes, selected, editor }: ReactNodeViewProps) {
  const { columns, gap } = node.attrs;

  const changeColumns = (newCount: number) => {
    const currentCount = node.childCount;
    if (newCount === currentCount) return;

    if (editor && newCount > currentCount) {
      const pos = editor.view.state.doc.resolve(editor.state.selection.from);
      const endPos = pos.before() + node.nodeSize - 1;
      for (let i = currentCount; i < newCount; i++) {
        editor.chain().insertContentAt(endPos, {
          type: "columnCell",
          content: [{ type: "paragraph" }],
        }).run();
      }
    }
    updateAttributes({ columns: newCount });
  };

  return (
    <NodeViewWrapper data-drag-handle="" data-columns-block="">
      <div className={`group relative ${selected ? "ring-2 ring-ring/30 rounded-lg" : ""}`}>
        {/* Inline column toggle — appears on hover */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          contentEditable={false}
        >
          {([2, 3, 4] as const).map((c) => {
            const Icon = c === 2 ? Columns2 : c === 3 ? Columns3 : Columns4;
            return (
              <button
                key={c}
                type="button"
                onClick={() => changeColumns(c)}
                className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                  columns === c
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>

        {/* Columns content — flex applied via CSS on [data-node-view-content] */}
        <NodeViewContent style={{ gap: `${gap}px` }} />
      </div>
    </NodeViewWrapper>
  );
}
