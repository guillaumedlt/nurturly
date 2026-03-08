"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";

export function ButtonBlockView({
  node,
  updateAttributes,
  selected,
}: ReactNodeViewProps) {
  const [editing, setEditing] = useState(false);
  const { text, href, align } = node.attrs;

  return (
    <NodeViewWrapper data-drag-handle="">
      <div
        className={`relative py-2 ${
          selected ? "ring-1 ring-foreground/20 rounded-lg" : ""
        }`}
        style={{ textAlign: align as "left" | "center" | "right" }}
      >
        {/* Button preview */}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-block rounded-md bg-foreground px-6 py-2.5 text-[14px] font-medium text-background transition-opacity hover:opacity-90"
        >
          {text}
        </button>

        {/* Edit controls */}
        {editing && selected && (
          <div
            className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-left shadow-lg"
            contentEditable={false}
          >
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground w-12">
                Text
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => updateAttributes({ text: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground w-12">
                URL
              </label>
              <input
                type="text"
                value={href}
                onChange={(e) => updateAttributes({ href: e.target.value })}
                className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground w-12">
                Align
              </label>
              <div className="flex gap-1">
                {(["left", "center", "right"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => updateAttributes({ align: a })}
                    className={`rounded px-2.5 py-1 text-[11px] transition-colors ${
                      align === a
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-accent"
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
              className="self-end text-[11px] text-muted-foreground hover:text-foreground"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
