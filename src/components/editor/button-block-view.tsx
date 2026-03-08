"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";

const BUTTON_COLORS = [
  "#0a0a0a", "#525252", "#2563eb", "#16a34a",
  "#dc2626", "#ea580c", "#7c3aed", "#0891b2",
];

export function ButtonBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const [editing, setEditing] = useState(false);
  const { text, href, align, bgColor = "#0a0a0a", textColor = "#ffffff", borderRadius = 6, size = "md" } = node.attrs;
  const padding = size === "sm" ? "8px 16px" : size === "lg" ? "14px 32px" : "10px 24px";
  const fontSize = size === "sm" ? "12px" : size === "lg" ? "16px" : "14px";

  return (
    <NodeViewWrapper data-drag-handle="">
      <div
        className={`relative py-2 ${selected ? "ring-1 ring-foreground/20 rounded-lg" : ""}`}
        style={{ textAlign: align as "left" | "center" | "right" }}
      >
        {/* Button preview */}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-block font-medium transition-opacity hover:opacity-90"
          style={{
            padding,
            fontSize,
            backgroundColor: bgColor,
            color: textColor,
            borderRadius: `${borderRadius}px`,
            textDecoration: "none",
            fontWeight: 500,
            border: bgColor === "#ffffff" ? "1px solid #e5e5e5" : "none",
          }}
        >
          {text}
        </button>

        {/* Edit controls */}
        {editing && selected && (
          <div
            className="mt-2 flex flex-col gap-3 rounded-xl border border-border bg-background p-4 text-left shadow-xl"
            contentEditable={false}
          >
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-10">Text</label>
              <input
                type="text"
                value={text}
                onChange={(e) => updateAttributes({ text: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-10">URL</label>
              <input
                type="text"
                value={href}
                onChange={(e) => updateAttributes({ href: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://"
              />
            </div>

            {/* Colors */}
            <div>
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Color</span>
              <div className="flex gap-1">
                {BUTTON_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateAttributes({ bgColor: c, textColor: "#ffffff" })}
                    className={`h-6 w-6 rounded-full border transition-all ${bgColor === c ? "ring-2 ring-ring ring-offset-1" : "border-border hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => updateAttributes({ bgColor: "#ffffff", textColor: "#0a0a0a" })}
                  className={`h-6 w-6 rounded-full border transition-all ${bgColor === "#ffffff" ? "ring-2 ring-ring ring-offset-1" : "border-border hover:scale-110"}`}
                  style={{ backgroundColor: "#ffffff" }}
                  title="Outline"
                />
              </div>
            </div>

            {/* Size + Radius + Align */}
            <div className="flex gap-3">
              <div className="flex-1">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Size</span>
                <div className="flex gap-0.5">
                  {(["sm", "md", "lg"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateAttributes({ size: s })}
                      className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                        size === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {s.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Corners</span>
                <div className="flex gap-0.5">
                  {[4, 6, 12, 24].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updateAttributes({ borderRadius: r })}
                      className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                        borderRadius === r ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alignment */}
            <div>
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Align</span>
              <div className="flex gap-0.5">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => updateAttributes({ align: a })}
                    className={`flex-1 rounded px-2 py-1 text-[10px] font-medium capitalize transition-colors ${
                      align === a ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditing(false)}
              className="self-end text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
