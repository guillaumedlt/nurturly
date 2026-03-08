"use client";

import { BubbleMenu as TiptapBubbleMenu, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Palette,
} from "lucide-react";
import { useCallback, useState, useRef } from "react";

const FONT_SIZES = [
  { label: "Small", value: "13px" },
  { label: "Normal", value: "15px" },
  { label: "Medium", value: "18px" },
  { label: "Large", value: "22px" },
  { label: "XL", value: "28px" },
];

const PRESET_COLORS = [
  "#0a0a0a", "#525252", "#a3a3a3",
  "#2563eb", "#16a34a", "#dc2626",
  "#ea580c", "#7c3aed", "#0891b2",
];

interface EditorBubbleMenuProps {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const colorInputRef = useRef<HTMLInputElement>(null);

  const currentColor = editor.getAttributes("textStyle")?.color || "#0a0a0a";

  const setLink = useCallback(() => {
    if (linkUrl.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const toggleLink = useCallback(() => {
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const previousUrl = editor.getAttributes("link").href || "";
      setLinkUrl(previousUrl);
      setShowLinkInput(true);
    }
  }, [editor]);

  const setColor = useCallback(
    (color: string) => {
      editor.chain().focus().setColor(color).run();
    },
    [editor]
  );

  const currentFontSize = editor.getAttributes("textStyle")?.fontSize || "15px";
  const currentSizeLabel = FONT_SIZES.find((s) => s.value === currentFontSize)?.label || "Normal";

  return (
    <TiptapBubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 150,
        placement: "top",
      }}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-1 shadow-xl">
        {showLinkInput ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setLink();
                if (e.key === "Escape") {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }
              }}
              placeholder="https://"
              className="h-7 w-40 rounded border-none bg-transparent px-2 text-[12px] outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={setLink}
              className="h-7 rounded bg-foreground px-2 text-[11px] font-medium text-background"
            >
              Set
            </button>
          </div>
        ) : (
          <>
            {/* Font size dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowFontSize(!showFontSize); setShowColorPicker(false); }}
                className="flex h-7 items-center gap-0.5 rounded px-1.5 text-[11px] text-foreground transition-colors hover:bg-accent"
                title="Font size"
              >
                {currentSizeLabel}
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
              {showFontSize && (
                <div className="absolute top-full left-0 z-50 mt-1 w-28 rounded-lg border border-border bg-background p-0.5 shadow-lg">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => {
                        if (s.value === "15px") {
                          editor.chain().focus().unsetFontSize().run();
                        } else {
                          editor.chain().focus().setFontSize(s.value).run();
                        }
                        setShowFontSize(false);
                      }}
                      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-[12px] transition-colors ${
                        currentFontSize === s.value
                          ? "bg-accent font-medium"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span>{s.label}</span>
                      <span className="text-[10px] text-muted-foreground">{s.value}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mx-0.5 h-4 w-px bg-border" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline"
            >
              <Underline className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-0.5 h-4 w-px bg-border" />

            <ToolbarButton
              onClick={toggleLink}
              active={editor.isActive("link")}
              title="Link"
            >
              <Link2 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-0.5 h-4 w-px bg-border" />

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              active={editor.isActive({ textAlign: "left" })}
              title="Align left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              active={editor.isActive({ textAlign: "center" })}
              title="Align center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              active={editor.isActive({ textAlign: "right" })}
              title="Align right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-0.5 h-4 w-px bg-border" />

            {/* Color picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowColorPicker(!showColorPicker); setShowFontSize(false); }}
                className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-accent"
                title="Text color"
              >
                <div className="relative">
                  <Palette className="h-3.5 w-3.5 text-foreground" />
                  <div
                    className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full"
                    style={{ backgroundColor: currentColor }}
                  />
                </div>
              </button>

              {showColorPicker && (
                <div className="absolute top-full right-0 z-50 mt-1 rounded-lg border border-border bg-background p-2 shadow-lg" style={{ width: 192 }}>
                  {/* Preset colors */}
                  <div className="mb-2 grid grid-cols-5 gap-1.5 justify-items-center">
                    {/* Reset */}
                    <button
                      type="button"
                      onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background transition-all hover:scale-110"
                      title="Reset color"
                    >
                      <div className="h-[1px] w-3 bg-destructive rotate-45" />
                    </button>
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => { setColor(color); setShowColorPicker(false); }}
                        className={`h-7 w-7 rounded-full border transition-all hover:scale-110 ${
                          currentColor === color ? "ring-2 ring-ring ring-offset-1" : "border-border"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  {/* Custom color input */}
                  <div className="flex items-center gap-2 border-t border-border pt-2">
                    <div
                      className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border"
                      onClick={() => colorInputRef.current?.click()}
                    >
                      <div
                        className="absolute inset-0"
                        style={{ backgroundColor: currentColor }}
                      />
                      <input
                        ref={colorInputRef}
                        type="color"
                        value={currentColor}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </div>
                    <input
                      type="text"
                      value={currentColor}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                          if (val.length === 7) setColor(val);
                        }
                      }}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (/^#[0-9a-fA-F]{6}$/.test(val)) setColor(val);
                      }}
                      placeholder="#000000"
                      className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 font-mono text-[11px] outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </TiptapBubbleMenu>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
        active
          ? "bg-foreground text-background"
          : "text-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}
