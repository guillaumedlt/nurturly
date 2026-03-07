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
} from "lucide-react";
import { useCallback, useState } from "react";

interface EditorBubbleMenuProps {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

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
              onClick={() =>
                editor.chain().focus().setTextAlign("left").run()
              }
              active={editor.isActive({ textAlign: "left" })}
              title="Align left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("center").run()
              }
              active={editor.isActive({ textAlign: "center" })}
              title="Align center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign("right").run()
              }
              active={editor.isActive({ textAlign: "right" })}
              title="Align right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>

            <div className="mx-0.5 h-4 w-px bg-border" />

            {/* Color swatches */}
            {["#0a0a0a", "#525252", "#a3a3a3"].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() =>
                  editor.chain().focus().setColor(color).run()
                }
                className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-accent"
                title={`Color ${color}`}
              >
                <div
                  className="h-3 w-3 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
              </button>
            ))}
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
