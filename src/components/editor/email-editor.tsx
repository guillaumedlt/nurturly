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
import { useCallback, useEffect, useRef } from "react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { createRoot } from "react-dom/client";

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
            let popup: TippyInstance[] | undefined;
            let component: {
              root: ReturnType<typeof createRoot>;
              ref: { onKeyDown: (props: { event: KeyboardEvent }) => boolean } | null;
            } | null = null;

            return {
              onStart: (props: any) => {
                const container = document.createElement("div");
                const root = createRoot(container);
                const ref = { current: null as any };

                root.render(
                  <SlashCommandListWrapper
                    items={props.items}
                    command={props.command}
                    refCallback={(r: any) => {
                      ref.current = r;
                    }}
                  />
                );

                component = { root, ref: ref.current };

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: container,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                  animation: false,
                });
              },
              onUpdate: (props: any) => {
                if (!component) return;
                const container = document.createElement("div");
                const root = createRoot(container);
                const ref = { current: null as any };

                component.root.unmount();

                root.render(
                  <SlashCommandListWrapper
                    items={props.items}
                    command={props.command}
                    refCallback={(r: any) => {
                      ref.current = r;
                    }}
                  />
                );

                component = { root, ref: ref.current };

                if (popup?.[0]) {
                  popup[0].setContent(container);
                  if (props.clientRect) {
                    popup[0].setProps({
                      getReferenceClientRect: props.clientRect,
                    });
                  }
                }
              },
              onKeyDown: (props: any) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                return component?.ref?.onKeyDown?.(props) ?? false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.root.unmount();
                component = null;
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
    </div>
  );
}

// Wrapper to forward ref to SlashCommandList
function SlashCommandListWrapper({
  items,
  command,
  refCallback,
}: {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
  refCallback: (ref: any) => void;
}) {
  return (
    <SlashCommandList
      items={items}
      command={command}
      ref={(r) => refCallback(r)}
    />
  );
}
