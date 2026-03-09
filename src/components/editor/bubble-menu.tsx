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
  Type,
} from "lucide-react";
import { useCallback, useState, useRef, useMemo } from "react";

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

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Lucida Sans", value: "'Lucida Sans', sans-serif" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Monaco", value: "Monaco, monospace" },
  { label: "Segoe UI", value: "'Segoe UI', sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Open Sans", value: "'Open Sans', sans-serif" },
  { label: "Lato", value: "Lato, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Poppins", value: "Poppins, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Merriweather", value: "Merriweather, serif" },
  { label: "Raleway", value: "Raleway, sans-serif" },
  { label: "Nunito", value: "Nunito, sans-serif" },
  { label: "Source Sans Pro", value: "'Source Sans 3', sans-serif" },
  { label: "PT Sans", value: "'PT Sans', sans-serif" },
  { label: "Oswald", value: "Oswald, sans-serif" },
  { label: "Libre Baskerville", value: "'Libre Baskerville', serif" },
  { label: "Ubuntu", value: "Ubuntu, sans-serif" },
  { label: "Noto Sans", value: "'Noto Sans', sans-serif" },
];

interface EditorBubbleMenuProps {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [fontSearch, setFontSearch] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const colorInputRef = useRef<HTMLInputElement>(null);

  const currentColor = editor.getAttributes("textStyle")?.color || "#0a0a0a";
  const currentFontFamily = editor.getAttributes("textStyle")?.fontFamily || "";
  const currentFontLabel = FONT_FAMILIES.find((f) => f.value === currentFontFamily)?.label || "Default";

  const filteredFonts = useMemo(() => {
    if (!fontSearch.trim()) return FONT_FAMILIES;
    const q = fontSearch.toLowerCase();
    return FONT_FAMILIES.filter((f) => f.label.toLowerCase().includes(q));
  }, [fontSearch]);

  const closeAll = useCallback(() => {
    setShowFontSize(false);
    setShowColorPicker(false);
    setShowFontFamily(false);
  }, []);

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
            {/* Font family dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { const next = !showFontFamily; closeAll(); setShowFontFamily(next); setFontSearch(""); }}
                className="flex h-7 items-center gap-0.5 rounded px-1.5 text-[11px] text-foreground transition-colors hover:bg-accent max-w-[90px]"
                title="Font family"
              >
                <Type className="mr-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{currentFontLabel}</span>
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
              {showFontFamily && (
                <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-lg border border-border bg-background shadow-lg">
                  <div className="p-1.5">
                    <input
                      type="text"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      placeholder="Search fonts..."
                      className="h-7 w-full rounded-md border border-input bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto p-0.5">
                    {filteredFonts.map((f) => (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => {
                          if (!f.value) {
                            editor.chain().focus().unsetFontFamily().run();
                          } else {
                            editor.chain().focus().setFontFamily(f.value).run();
                          }
                          setShowFontFamily(false);
                          setFontSearch("");
                        }}
                        className={`flex w-full items-center rounded px-2 py-1.5 text-[12px] transition-colors ${
                          currentFontFamily === f.value
                            ? "bg-accent font-medium"
                            : "hover:bg-accent"
                        }`}
                        style={f.value ? { fontFamily: f.value } : undefined}
                      >
                        {f.label}
                      </button>
                    ))}
                    {filteredFonts.length === 0 && (
                      <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">No fonts found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mx-0.5 h-4 w-px bg-border" />

            {/* Font size dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { const next = !showFontSize; closeAll(); setShowFontSize(next); }}
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
                onClick={() => { const next = !showColorPicker; closeAll(); setShowColorPicker(next); }}
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
