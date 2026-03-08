"use client";

import { NodeViewWrapper, NodeViewContent, type ReactNodeViewProps } from "@tiptap/react";
import { Columns2, Columns3, Columns4, X } from "lucide-react";
import { useState } from "react";

export function ColumnsBlockView({ node, updateAttributes, selected, editor }: ReactNodeViewProps) {
  const [showControls, setShowControls] = useState(false);
  const { columns, gap } = node.attrs;

  const changeColumns = (newCount: number) => {
    const currentCount = node.childCount;
    if (newCount === currentCount) return;

    // Use editor to add/remove column cells
    if (editor) {
      const pos = editor.view.state.doc.resolve(editor.state.selection.from);

      if (newCount > currentCount) {
        // Add columns at the end of this node
        const endPos = editor.view.nodeDOM(pos.before())
          ? pos.before() + node.nodeSize - 1
          : pos.before() + node.nodeSize - 1;

        for (let i = currentCount; i < newCount; i++) {
          editor.chain().insertContentAt(endPos, {
            type: "columnCell",
            content: [{ type: "paragraph" }],
          }).run();
        }
      }
    }
    updateAttributes({ columns: newCount });
  };

  return (
    <NodeViewWrapper data-drag-handle="">
      <div className={`group relative ${selected ? "ring-2 ring-ring/30 rounded-lg" : ""}`}>
        {/* Controls */}
        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className="absolute -top-3 left-2 z-10 flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-foreground"
          contentEditable={false}
        >
          <Columns2 className="h-3 w-3" />
          {columns} cols
        </button>

        {showControls && (
          <div
            className="absolute -top-2 left-2 z-20 w-48 translate-y-[-100%] rounded-xl border border-border bg-background p-3 shadow-xl"
            contentEditable={false}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Columns</span>
              <button type="button" onClick={() => setShowControls(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>

            <div className="mb-2">
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground/70">Layout</span>
              <div className="flex gap-1">
                {[2, 3, 4].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => changeColumns(c)}
                    className={`flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-[10px] font-medium transition-colors ${
                      columns === c ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {c === 2 && <Columns2 className="h-3 w-3" />}
                    {c === 3 && <Columns3 className="h-3 w-3" />}
                    {c === 4 && <Columns4 className="h-3 w-3" />}
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground/70">Gap</span>
              <div className="flex gap-1">
                {[8, 16, 24, 32].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => updateAttributes({ gap: g })}
                    className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                      gap === g ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Columns layout */}
        <div style={{ display: "flex", gap: `${gap}px` }}>
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
