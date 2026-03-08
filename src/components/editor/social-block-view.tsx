"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { SOCIAL_PLATFORMS, type SocialLink } from "@/lib/editor/extensions/social-block";

export function SocialBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const [editing, setEditing] = useState(false);
  const links: SocialLink[] = node.attrs.links || [];
  const align = node.attrs.align || "center";
  const iconStyle = node.attrs.iconStyle || "filled";

  const updateLink = (index: number, field: "platform" | "url", value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    updateAttributes({ links: newLinks });
  };

  const addLink = () => {
    const used = new Set(links.map((l) => l.platform));
    const next = SOCIAL_PLATFORMS.find((p) => !used.has(p.id));
    if (next) {
      updateAttributes({ links: [...links, { platform: next.id, url: "" }] });
    }
  };

  const removeLink = (index: number) => {
    updateAttributes({ links: links.filter((_, i) => i !== index) });
  };

  return (
    <NodeViewWrapper data-drag-handle="">
      <div className={`relative py-4 ${selected ? "ring-1 ring-foreground/20 rounded-lg" : ""}`}>
        {/* Icons preview */}
        <div
          className="flex items-center gap-3"
          style={{ justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center" }}
        >
          {links.map((link, i) => {
            const platform = SOCIAL_PLATFORMS.find((p) => p.id === link.platform);
            return (
              <button
                key={i}
                type="button"
                onClick={() => setEditing(true)}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold transition-opacity hover:opacity-80 ${
                  iconStyle === "filled"
                    ? "bg-foreground text-background"
                    : "border-2 border-foreground text-foreground"
                }`}
              >
                {platform?.icon || "?"}
              </button>
            );
          })}
        </div>

        {/* Edit panel */}
        {editing && selected && (
          <div
            className="mt-3 rounded-xl border border-border bg-background p-4 shadow-xl"
            contentEditable={false}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Social Links</span>
              <button type="button" onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={link.platform}
                    onChange={(e) => updateLink(i, "platform", e.target.value)}
                    className="h-8 w-28 rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:ring-1 focus:ring-ring"
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink(i, "url", e.target.value)}
                    placeholder={`https://${link.platform}.com/...`}
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2.5 text-[12px] outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addLink}
              disabled={links.length >= SOCIAL_PLATFORMS.length}
              className="mt-2 flex h-8 items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              Add link
            </button>

            {/* Style options */}
            <div className="mt-3 flex gap-3">
              <div className="flex-1">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Style</span>
                <div className="flex gap-0.5">
                  {(["filled", "outline"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateAttributes({ iconStyle: s })}
                      className={`flex-1 rounded px-2 py-1 text-[10px] font-medium capitalize transition-colors ${
                        iconStyle === s ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1">
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
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
