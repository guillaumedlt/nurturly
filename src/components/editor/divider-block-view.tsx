"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";

const DIVIDER_COLORS = ["#e5e5e5", "#d4d4d4", "#a3a3a3", "#525252", "#0a0a0a"];

export function DividerBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const [showControls, setShowControls] = useState(false);
  const { color = "#e5e5e5", thickness = 1, style = "solid" } = node.attrs;

  return (
    <NodeViewWrapper data-drag-handle="">
      <div
        className={`group relative cursor-pointer py-3 ${selected ? "ring-1 ring-foreground/20 rounded" : ""}`}
        onClick={() => setShowControls(!showControls)}
      >
        <hr
          style={{
            border: "none",
            borderTop: `${thickness}px ${style} ${color}`,
            width: "100%",
            margin: "0 auto",
          }}
        />

        {/* Controls */}
        {showControls && selected && (
          <div
            className="mt-2 rounded-xl border border-border bg-background p-3 shadow-xl"
            contentEditable={false}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Color</span>
              <div className="flex gap-1">
                {DIVIDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateAttributes({ color: c })}
                    className={`h-5 w-5 rounded-full border transition-all ${color === c ? "ring-2 ring-ring ring-offset-1" : "border-border hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Style</span>
              <div className="flex gap-0.5">
                {(["solid", "dashed", "dotted"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateAttributes({ style: s })}
                    className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium capitalize transition-colors ${
                      style === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
