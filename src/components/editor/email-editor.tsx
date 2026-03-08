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
import { ReactNodeViewRenderer } from "@tiptap/react";

import { VariableNode, AVAILABLE_VARIABLES } from "@/lib/editor/extensions/variable-node";
import { ButtonBlock } from "@/lib/editor/extensions/button-block";
import { SpacerBlock } from "@/lib/editor/extensions/spacer-block";
import { ButtonBlockView } from "./button-block-view";
import { SpacerBlockView } from "./spacer-block-view";
import { VariableNodeView } from "./variable-node-view";
import {
  SlashCommand,
  getSlashCommandItems,
  type SlashCommandItem,
} from "@/lib/editor/extensions/slash-command";
import { SlashCommandList } from "./slash-command-list";
import { EditorBubbleMenu } from "./bubble-menu";
import { VariablePicker } from "./variable-picker";
import { ImageInsertModal } from "./image-insert-modal";

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

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const imageRangeRef = useRef<any>(null);

  // Variable suggestion state (triggered by `{`)
  const [varSuggestOpen, setVarSuggestOpen] = useState(false);
  const [varSuggestQuery, setVarSuggestQuery] = useState("");
  const [varSuggestPos, setVarSuggestPos] = useState({ top: 0, left: 0 });
  const [varSuggestIndex, setVarSuggestIndex] = useState(0);
  const varBraceStartRef = useRef<number | null>(null);

  const filteredVars = AVAILABLE_VARIABLES.filter((v) =>
    v.name.toLowerCase().includes(varSuggestQuery.toLowerCase()) ||
    v.label.toLowerCase().includes(varSuggestQuery.toLowerCase())
  );

  const handleImageInsert = useCallback((editorInstance: any, range: any) => {
    imageRangeRef.current = range;
    editorInstance.chain().focus().deleteRange(range).run();
    setImageModalOpen(true);
  }, []);

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
          return 'Type "/" for blocks, "{" for variables...';
        },
      }),
      VariableNode.extend({
        addNodeView() {
          return ReactNodeViewRenderer(VariableNodeView, { as: "span" });
        },
      }),
      ButtonBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(ButtonBlockView);
        },
      }),
      SpacerBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(SpacerBlockView);
        },
      }),
      SlashCommand.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            return getSlashCommandItems({ onImageInsert: handleImageInsert }).filter((item) =>
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

      // Handle { variable suggestion
      if (varBraceStartRef.current !== null) {
        const curPos = editor.state.selection.from;
        const start = varBraceStartRef.current;
        if (curPos <= start) {
          setVarSuggestOpen(false);
          varBraceStartRef.current = null;
        } else {
          const text = editor.state.doc.textBetween(start, curPos, "");
          setVarSuggestQuery(text);
          setVarSuggestIndex(0);
        }
      }
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px]",
      },
      handleKeyDown: (_view, event) => {
        // Handle { trigger for variable suggestion
        if (event.key === "{" && !varSuggestOpen && !slashOpen) {
          // We'll set state after the character is inserted
          setTimeout(() => {
            if (!editor) return;
            const pos = editor.state.selection.from;
            varBraceStartRef.current = pos;
            setVarSuggestQuery("");
            setVarSuggestIndex(0);

            // Get cursor position for popup
            const coords = editor.view.coordsAtPos(pos);
            setVarSuggestPos({ top: coords.bottom + 4, left: coords.left });
            setVarSuggestOpen(true);
          }, 0);
          return false;
        }

        // Handle keyboard nav in variable suggestion
        if (varSuggestOpen) {
          if (event.key === "Escape") {
            setVarSuggestOpen(false);
            varBraceStartRef.current = null;
            return true;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setVarSuggestIndex((prev) => (prev + 1) % Math.max(filteredVars.length, 1));
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setVarSuggestIndex((prev) => (prev + Math.max(filteredVars.length, 1) - 1) % Math.max(filteredVars.length, 1));
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            const selected = filteredVars[varSuggestIndex];
            if (selected && editor) {
              insertVariableFromSuggestion(selected.name);
            }
            return true;
          }
          if (event.key === "Backspace") {
            // Check if we'd delete past the opening brace
            if (editor) {
              const curPos = editor.state.selection.from;
              if (varBraceStartRef.current !== null && curPos <= varBraceStartRef.current + 1) {
                setVarSuggestOpen(false);
                varBraceStartRef.current = null;
              }
            }
            return false;
          }
        }

        return false;
      },
    },
  });

  const insertVariableFromSuggestion = useCallback(
    (name: string) => {
      if (!editor || varBraceStartRef.current === null) return;
      const from = varBraceStartRef.current - 1; // include the `{` character
      const to = editor.state.selection.from;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContent({ type: "variable", attrs: { name } })
        .run();
      setVarSuggestOpen(false);
      varBraceStartRef.current = null;
    },
    [editor]
  );

  const handleSlashCommand = useCallback(
    (item: SlashCommandItem) => {
      if (editor && slashRangeRef.current) {
        item.command({ editor, range: slashRangeRef.current });
      }
      setSlashOpen(false);
    },
    [editor]
  );

  const handleImageModalInsert = useCallback(
    (url: string) => {
      if (editor) {
        editor.chain().focus().setImage({ src: url }).run();
      }
      setImageModalOpen(false);
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

      {/* Variable suggestion popup (triggered by `{`) */}
      {varSuggestOpen && filteredVars.length > 0 && (
        <div
          className="fixed z-50"
          style={{ top: varSuggestPos.top, left: varSuggestPos.left }}
        >
          <div className="w-48 rounded-lg border border-border bg-background p-1 shadow-lg">
            {filteredVars.map((v, index) => (
              <button
                key={v.name}
                type="button"
                onClick={() => insertVariableFromSuggestion(v.name)}
                onMouseEnter={() => setVarSuggestIndex(index)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
                  index === varSuggestIndex
                    ? "bg-accent text-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <span className="font-mono text-[11px] text-muted-foreground">
                  {`{{${v.name}}}`}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {v.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image insert modal */}
      <ImageInsertModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={handleImageModalInsert}
      />
    </div>
  );
}
