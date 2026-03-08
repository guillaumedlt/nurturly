"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";

const DIVIDER_COLORS = ["#e5e5e5", "#d4d4d4", "#a3a3a3", "#525252", "#0a0a0a", "#2563eb", "#16a34a", "#dc2626"];

export function DividerBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const [showControls, setShowControls] = useState(false);
  const { color = "#e5e5e5", thickness = 1, style = "solid", width = 100 } = node.attrs;

  return (
    <NodeViewWrapper data-drag-handle="">
      <div
        className={`group relative cursor-pointer py-3 ${selected ? "ring-1 ring-foreground/20 rounded" : ""}`}
        onClick={() => setShowControls(!showControls)}
      >
        <div style={{ textAlign: "center" }}>
          <hr
            style={{
              border: "none",
              borderTop: `${thickness}px ${style} ${color}`,
              width: `${width}%`,
              margin: "0 auto",
            }}
          />
        </div>

        {/* Controls */}
        {showControls && selected && (
          <div
            className="mt-2 rounded-xl border border-border bg-background p-3 shadow-xl"
            contentEditable={false}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Color */}
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

            {/* Style + Thickness */}
            <div className="flex gap-3">
              <div className="flex-1">
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
              <div className="flex-1">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Weight</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateAttributes({ thickness: t })}
                      className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                        thickness === t ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Width */}
            <div className="mt-2">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Width</span>
              <div className="flex gap-0.5">
                {[25, 50, 75, 100].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => updateAttributes({ width: w })}
                    className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                      width === w ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {w}%
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
