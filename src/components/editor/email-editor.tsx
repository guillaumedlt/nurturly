"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import { useCallback, useRef, useState } from "react";

import { VariableNode } from "@/lib/editor/extensions/variable-node";
import { ButtonBlock } from "@/lib/editor/extensions/button-block";
import { SpacerBlock } from "@/lib/editor/extensions/spacer-block";
import {
  SlashCommand,
  getSlashCommandItems,
  type SlashCommandItem,
} from "@/lib/editor/extensions/slash-command";
import { SlashCommandList } from "./slash-command-list";
import { EditorBubbleMenu } from "./bubble-menu";
import { VariablePicker } from "./variable-picker";

interface EmailEditorProps {
  content: string; // JSON string
  onUpdate: (json: string) => void;
}

export function EmailEditor({ content, onUpdate }: EmailEditorProps) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Slash command state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashItems, setSlashItems] = useState<SlashCommandItem[]>([]);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const slashCommandRef = useRef<{ onKeyDown: (props: { event: KeyboardEvent }) => boolean } | null>(null);
  const slashRangeRef = useRef<any>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: {},
        dropcursor: { color: "#d4d4d4", width: 2 },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      ImageExt.configure({
        inline: false,
        allowBase64: false,
      }),
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "underline text-foreground",
        },
      }),
      Color,
      TextStyle,
      UnderlineExt,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Heading";
          return 'Type "/" for blocks...';
        },
      }),
      VariableNode,
      ButtonBlock,
      SpacerBlock,
      SlashCommand.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            return getSlashCommandItems().filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase())
            );
          },
          render: () => {
            return {
              onStart: (props: any) => {
                setSlashItems(props.items);
                slashRangeRef.current = props.range;
                if (props.clientRect) {
                  const rect = props.clientRect();
                  if (rect) {
                    setSlashPos({ top: rect.bottom + 4, left: rect.left });
                  }
                }
                setSlashOpen(true);
              },
              onUpdate: (props: any) => {
                setSlashItems(props.items);
                slashRangeRef.current = props.range;
                if (props.clientRect) {
                  const rect = props.clientRect();
                  if (rect) {
                    setSlashPos({ top: rect.bottom + 4, left: rect.left });
                  }
                }
              },
              onKeyDown: (props: any) => {
                if (props.event.key === "Escape") {
                  setSlashOpen(false);
                  return true;
                }
                return slashCommandRef.current?.onKeyDown(props) ?? false;
              },
              onExit: () => {
                setSlashOpen(false);
              },
            };
          },
        },
      }),
    ],
    content: (() => {
      try {
        return JSON.parse(content);
      } catch {
        return { type: "doc", content: [{ type: "paragraph" }] };
      }
    })(),
    onUpdate: ({ editor }) => {
      onUpdateRef.current(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px]",
      },
    },
  });

  const handleSlashCommand = useCallback(
    (item: SlashCommandItem) => {
      if (editor && slashRangeRef.current) {
        item.command({ editor, range: slashRangeRef.current });
      }
      setSlashOpen(false);
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="relative">
      {/* Toolbar row */}
      <div className="mb-3 flex items-center gap-2">
        <VariablePicker editor={editor} />
      </div>

      {/* Editor area */}
      <div className="email-editor-content rounded-lg border border-border bg-white p-8">
        <div className="mx-auto max-w-[600px]">
          <EditorBubbleMenu editor={editor} />
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Slash command popup */}
      {slashOpen && slashItems.length > 0 && (
        <div
          className="fixed z-50"
          style={{ top: slashPos.top, left: slashPos.left }}
        >
          <SlashCommandList
            items={slashItems}
            command={handleSlashCommand}
            ref={slashCommandRef}
          />
        </div>
      )}
    </div>
  );
}
