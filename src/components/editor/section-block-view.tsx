"use client";

import { NodeViewWrapper, NodeViewContent, type ReactNodeViewProps } from "@tiptap/react";
import { useState, useRef } from "react";
import { Paintbrush } from "lucide-react";

const BG_COLORS = [
  "#ffffff", "#fafafa", "#f5f5f5", "#e5e5e5",
  "#0a0a0a", "#1e293b", "#eff6ff", "#dbeafe",
  "#f0fdf4", "#dcfce7", "#fef2f2", "#fecaca",
  "#fefce8", "#fef3c7", "#faf5ff", "#ede9fe",
  "#f0fdfa", "#e0f2fe",
];

const PADDING_PRESETS = [
  { label: "None", value: 0 },
  { label: "S", value: 16 },
  { label: "M", value: 24 },
  { label: "L", value: 40 },
];

export function SectionBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const [showControls, setShowControls] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const { backgroundColor, paddingTop, paddingBottom, paddingLeft, paddingRight, borderRadius } = node.attrs;
  const isDark = backgroundColor === "#0a0a0a" || backgroundColor === "#1e293b";

  return (
    <NodeViewWrapper data-drag-handle="" data-section-block="">
      <div
        className={`group relative rounded transition-all ${selected ? "ring-2 ring-ring/30" : ""}`}
        style={{
          backgroundColor,
          padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
          borderRadius: `${borderRadius}px`,
          color: isDark ? "#ffffff" : undefined,
        }}
      >
        {/* Floating edit button */}
        <button
          type="button"
          onClick={() => setShowControls(!showControls)}
          className="absolute -top-3 right-2 z-10 flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-foreground"
          contentEditable={false}
        >
          <Paintbrush className="h-3 w-3" />
          Section
        </button>

        {/* Controls panel */}
        {showControls && (
          <div
            className="absolute -top-2 right-2 z-40 w-64 translate-y-[-100%] rounded-xl border border-border bg-background p-3 shadow-xl"
            contentEditable={false}
          >
            {/* Background color */}
            <div className="mb-3">
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground/70">Background</span>
              <div className="grid grid-cols-6 gap-1.5">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateAttributes({ backgroundColor: c })}
                    className={`h-6 w-6 rounded-full border transition-all ${backgroundColor === c ? "ring-2 ring-ring ring-offset-1" : "border-border hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              {/* Custom color input */}
              <div className="mt-2 flex items-center gap-2">
                <div
                  className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
                  onClick={() => colorInputRef.current?.click()}
                >
                  <div className="absolute inset-0" style={{ backgroundColor }} />
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={backgroundColor || "#ffffff"}
                    onChange={(e) => updateAttributes({ backgroundColor: e.target.value })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </div>
                <input
                  type="text"
                  value={backgroundColor || "#ffffff"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                      updateAttributes({ backgroundColor: val });
                    }
                  }}
                  placeholder="#ffffff"
                  className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-mono text-[11px] outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Padding */}
            <div>
              <span className="mb-1.5 block text-[10px] uppercase tracking-wider text-muted-foreground/70">Padding</span>
              <div className="flex gap-1">
                {PADDING_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => updateAttributes({ paddingTop: p.value, paddingBottom: p.value, paddingLeft: p.value, paddingRight: p.value })}
                    className={`flex-1 rounded px-1.5 py-1 text-[10px] font-medium transition-colors ${
                      paddingTop === p.value && paddingBottom === p.value
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}
