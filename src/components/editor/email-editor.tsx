"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import ImageExt from "@tiptap/extension-image";
import LinkExt from "@tiptap/extension-link";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import { useCallback, useRef, useState, useEffect } from "react";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Plus,
  Copy,
  Trash2,
  GripVertical,
  Columns2,
  Columns3,
  Columns4,
  Square,
} from "lucide-react";

import { VariableNode, AVAILABLE_VARIABLES } from "@/lib/editor/extensions/variable-node";
import { ButtonBlock } from "@/lib/editor/extensions/button-block";
import { SpacerBlock } from "@/lib/editor/extensions/spacer-block";
import { SectionBlock } from "@/lib/editor/extensions/section-block";
import { ColumnsBlock, ColumnCell } from "@/lib/editor/extensions/columns-block";
import { SocialBlock } from "@/lib/editor/extensions/social-block";
import { DividerBlock } from "@/lib/editor/extensions/divider-block";
import { FontSize } from "@/lib/editor/extensions/font-size";

import { ButtonBlockView } from "./button-block-view";
import { SpacerBlockView } from "./spacer-block-view";
import { VariableNodeView } from "./variable-node-view";
import { SectionBlockView } from "./section-block-view";
import { SocialBlockView } from "./social-block-view";
import { DividerBlockView } from "./divider-block-view";

import {
  SlashCommand,
  getSlashCommandItems,
  type SlashCommandItem,
} from "@/lib/editor/extensions/slash-command";
import { SlashCommandList } from "./slash-command-list";
import { EditorBubbleMenu } from "./bubble-menu";
import { VariablePicker } from "./variable-picker";
import { ImageInsertModal } from "./image-insert-modal";

/* ─── Toolbar button ─── */
function ToolbarBtn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-25 ${
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Helper: find nearest block drop boundary ─── */
function findNearestBlockBoundary(
  editor: Editor,
  clientY: number,
  excludeFrom?: number,
  excludeSize?: number
): { pos: number; top: number } | null {
  const doc = editor.state.doc;
  let bestPos = -1;
  let bestDist = Infinity;
  let bestTop = 0;

  doc.forEach((node, offset) => {
    const positions = [offset, offset + node.nodeSize];
    for (const pos of positions) {
      // Skip boundaries of the dragged block itself
      if (excludeFrom !== undefined && excludeSize !== undefined) {
        if (pos === excludeFrom || pos === excludeFrom + excludeSize) continue;
      }
      try {
        const coords = editor.view.coordsAtPos(pos);
        const dist = Math.abs(coords.top - clientY);
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = pos;
          bestTop = coords.top;
        }
      } catch {
        // ignore
      }
    }
  });

  return bestPos >= 0 ? { pos: bestPos, top: bestTop } : null;
}

/* ─── Floating block actions (drag / duplicate / delete) ─── */
function FloatingBlockActions({ editor, editorContentRef }: { editor: Editor; editorContentRef: React.RefObject<HTMLDivElement | null> }) {
  const [info, setInfo] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number;
    from: number;
    size: number;
  }>({ visible: false, top: 0, left: 0, width: 0, from: 0, size: 0 });

  const draggingRef = useRef(false);
  const dragSourceRef = useRef<{ from: number; size: number } | null>(null);
  const dragGhostRef = useRef<HTMLDivElement | null>(null);
  const [dropLine, setDropLine] = useState<{ top: number; left: number; width: number; visible: boolean }>({
    top: 0, left: 0, width: 0, visible: false,
  });
  const dropPosRef = useRef<number>(-1);

  // Track block info from editor selection
  useEffect(() => {
    const update = () => {
      if (draggingRef.current) return;
      const { selection } = editor.state;
      let blockFrom: number | null = null;
      let blockSize = 0;

      if (selection instanceof NodeSelection) {
        blockFrom = selection.from;
        blockSize = selection.node.nodeSize;
      } else if (selection.$from.depth >= 1) {
        const node = selection.$from.node(1);
        if (node && !["paragraph", "doc"].includes(node.type.name)) {
          blockFrom = selection.$from.before(1);
          blockSize = node.nodeSize;
        }
      }

      if (blockFrom !== null && blockSize > 0) {
        const dom = editor.view.nodeDOM(blockFrom);
        if (dom instanceof HTMLElement) {
          const rect = dom.getBoundingClientRect();
          setInfo({
            visible: true,
            top: rect.top,
            left: rect.left - 34,
            width: rect.width,
            from: blockFrom,
            size: blockSize,
          });
          return;
        }
      }
      setInfo((prev) => ({ ...prev, visible: false }));
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  // Mouse-based drag handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const node = editor.state.doc.nodeAt(info.from);
      if (!node) return;

      const dom = editor.view.nodeDOM(info.from);
      if (!(dom instanceof HTMLElement)) return;

      dragSourceRef.current = { from: info.from, size: info.size };
      draggingRef.current = true;

      // Create ghost element (semi-transparent clone)
      const rect = dom.getBoundingClientRect();
      const ghost = document.createElement("div");
      ghost.style.cssText = `
        position: fixed; z-index: 9999; pointer-events: none;
        width: ${rect.width}px; opacity: 0.7;
        border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        overflow: hidden; transition: transform 0.05s ease;
      `;
      ghost.appendChild(dom.cloneNode(true));
      document.body.appendChild(ghost);
      dragGhostRef.current = ghost;

      // Dim original
      dom.style.opacity = "0.25";
      dom.style.transition = "opacity 0.15s";

      const offsetY = e.clientY - rect.top;

      const onMouseMove = (ev: MouseEvent) => {
        // Move ghost
        if (dragGhostRef.current) {
          dragGhostRef.current.style.top = `${ev.clientY - offsetY}px`;
          dragGhostRef.current.style.left = `${rect.left}px`;
        }

        // Find drop target
        const boundary = findNearestBlockBoundary(
          editor, ev.clientY,
          dragSourceRef.current?.from, dragSourceRef.current?.size
        );
        if (boundary) {
          dropPosRef.current = boundary.pos;
          // Get editor content bounds for constraining the line
          const contentEl = editorContentRef?.current?.querySelector(".mx-auto");
          const contentRect = contentEl?.getBoundingClientRect();
          setDropLine({
            top: boundary.top,
            left: contentRect ? contentRect.left : rect.left,
            width: contentRect ? contentRect.width : rect.width,
            visible: true,
          });
        }
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        // Remove ghost
        if (dragGhostRef.current) {
          dragGhostRef.current.remove();
          dragGhostRef.current = null;
        }

        // Restore original opacity
        const origDom = editor.view.nodeDOM(dragSourceRef.current?.from ?? -1);
        if (origDom instanceof HTMLElement) {
          origDom.style.opacity = "";
          origDom.style.transition = "";
        }

        setDropLine((prev) => ({ ...prev, visible: false }));
        draggingRef.current = false;

        // Perform the move
        const source = dragSourceRef.current;
        const targetPos = dropPosRef.current;
        dragSourceRef.current = null;
        dropPosRef.current = -1;

        if (!source || targetPos < 0) return;
        const { from, size } = source;
        if (targetPos === from || targetPos === from + size) return;

        const srcNode = editor.state.doc.nodeAt(from);
        if (!srcNode) return;

        const tr = editor.state.tr;
        const nodeJson = srcNode.toJSON();

        if (targetPos > from) {
          tr.insert(targetPos, editor.state.schema.nodeFromJSON(nodeJson));
          tr.delete(from, from + size);
        } else {
          tr.delete(from, from + size);
          tr.insert(targetPos, editor.state.schema.nodeFromJSON(nodeJson));
        }

        editor.view.dispatch(tr);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [editor, info.from, info.size, editorContentRef]
  );

  if (!info.visible) return null;

  const deleteBlock = () => {
    editor
      .chain()
      .focus()
      .deleteRange({ from: info.from, to: info.from + info.size })
      .run();
  };

  const duplicateBlock = () => {
    const node = editor.state.doc.nodeAt(info.from);
    if (node) {
      editor
        .chain()
        .focus()
        .insertContentAt(info.from + info.size, node.toJSON())
        .run();
    }
  };

  return (
    <>
      <div
        className="fixed z-30 flex flex-col gap-0.5 animate-in fade-in duration-150"
        style={{ top: info.top, left: Math.max(info.left, 4) }}
      >
        <div
          onMouseDown={handleMouseDown}
          title="Drag to reorder"
          className="flex h-6 w-6 cursor-grab items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="h-3 w-3" />
        </div>
        <button
          type="button"
          onClick={duplicateBlock}
          title="Duplicate block"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={deleteBlock}
          title="Delete block"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Drop indicator line — constrained to editor width */}
      {dropLine.visible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ top: dropLine.top - 1, left: dropLine.left, width: dropLine.width }}
        >
          <div className="h-0.5 rounded-full bg-ring" />
          <div className="absolute -left-1.5 -top-[3px] h-2 w-2 rounded-full bg-ring" />
          <div className="absolute -right-1.5 -top-[3px] h-2 w-2 rounded-full bg-ring" />
        </div>
      )}
    </>
  );
}

/* ─── Floating column controls ─── */
function ColumnControls({ editor }: { editor: Editor }) {
  const [info, setInfo] = useState<{
    visible: boolean;
    top: number;
    left: number;
    width: number;
    blockPos: number;
    currentColumns: number;
  }>({ visible: false, top: 0, left: 0, width: 0, blockPos: 0, currentColumns: 0 });

  useEffect(() => {
    const update = () => {
      const { selection } = editor.state;
      // Walk up the tree to find a columnsBlock
      for (let d = selection.$from.depth; d >= 1; d--) {
        const node = selection.$from.node(d);
        if (node.type.name === "columnsBlock") {
          const pos = selection.$from.before(d);
          const dom = editor.view.nodeDOM(pos);
          if (dom instanceof HTMLElement) {
            const rect = dom.getBoundingClientRect();
            setInfo({
              visible: true,
              top: rect.top - 36,
              left: rect.left + rect.width / 2,
              width: rect.width,
              blockPos: pos,
              currentColumns: node.childCount,
            });
            return;
          }
        }
      }
      setInfo((prev) => ({ ...prev, visible: false }));
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  if (!info.visible) return null;

  const changeColumns = (newCount: number) => {
    const node = editor.state.doc.nodeAt(info.blockPos);
    if (!node || node.type.name !== "columnsBlock") return;
    const currentCount = node.childCount;
    if (newCount === currentCount) return;

    if (newCount > currentCount) {
      // Add columns at the end of the columnsBlock
      const endPos = info.blockPos + node.nodeSize - 1;
      for (let i = currentCount; i < newCount; i++) {
        editor.chain().insertContentAt(endPos, {
          type: "columnCell",
          content: [{ type: "paragraph" }],
        }).run();
      }
    } else if (newCount < currentCount) {
      // Remove columns from the end
      const tr = editor.state.tr;
      let removeCount = currentCount - newCount;
      const childPositions: { from: number; to: number }[] = [];
      node.forEach((child, childOffset) => {
        childPositions.push({
          from: info.blockPos + 1 + childOffset,
          to: info.blockPos + 1 + childOffset + child.nodeSize,
        });
      });
      // Delete from the end
      for (let i = childPositions.length - 1; i >= 0 && removeCount > 0; i--, removeCount--) {
        tr.delete(childPositions[i].from, childPositions[i].to);
      }
      editor.view.dispatch(tr);
    }
    // Update the columns attribute
    editor.chain().focus().command(({ tr }) => {
      tr.setNodeMarkup(info.blockPos, undefined, {
        ...node.attrs,
        columns: newCount,
      });
      return true;
    }).run();
  };

  return (
    <div
      className="fixed z-40 flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm animate-in fade-in duration-150"
      style={{ top: Math.max(info.top, 4), left: info.left, transform: "translateX(-50%)" }}
    >
      {([1, 2, 3, 4] as const).map((c) => {
        const Icon = c === 1 ? Square : c === 2 ? Columns2 : c === 3 ? Columns3 : Columns4;
        return (
          <button
            key={c}
            type="button"
            onClick={() => changeColumns(c)}
            title={`${c} column${c > 1 ? "s" : ""}`}
            className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
              info.currentColumns === c
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main editor ─── */
interface EmailStyles {
  bodyBgColor: string;
  contentBgColor: string;
  contentBorderRadius: number;
  contentPadding: number;
}

interface EmailEditorProps {
  content: string; // JSON string
  onUpdate: (json: string) => void;
  emailStyles?: EmailStyles;
}

export function EmailEditor({ content, onUpdate, emailStyles }: EmailEditorProps) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Slash command state
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashItems, setSlashItems] = useState<SlashCommandItem[]>([]);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const slashCommandRef = useRef<{
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
  } | null>(null);
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

  // Force re-render on transaction for toolbar state
  const [, setTick] = useState(0);

  const filteredVars = AVAILABLE_VARIABLES.filter(
    (v) =>
      v.name.toLowerCase().includes(varSuggestQuery.toLowerCase()) ||
      v.label.toLowerCase().includes(varSuggestQuery.toLowerCase())
  );

  const handleImageInsert = useCallback(
    (editorInstance: any, range: any) => {
      imageRangeRef.current = range;
      editorInstance.chain().focus().deleteRange(range).run();
      setImageModalOpen(true);
    },
    []
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        horizontalRule: false,
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
      FontSize,
      UnderlineExt,
      Placeholder.configure({
        placeholder: ({ node, pos, editor: ed }) => {
          if (node.type.name === "heading") return "Heading";
          // Check if inside a columnCell — shorter placeholder
          if (pos !== undefined && ed) {
            try {
              const $pos = ed.state.doc.resolve(pos);
              for (let d = $pos.depth; d >= 1; d--) {
                if ($pos.node(d).type.name === "columnCell") return "Type here...";
              }
            } catch {
              // ignore
            }
          }
          // Check if inside a sectionBlock
          if (pos !== undefined && ed) {
            try {
              const $pos = ed.state.doc.resolve(pos);
              for (let d = $pos.depth; d >= 1; d--) {
                if ($pos.node(d).type.name === "sectionBlock") return "Type here...";
              }
            } catch {
              // ignore
            }
          }
          return 'Type "/" for commands...';
        },
        includeChildren: true,
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
      SectionBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(SectionBlockView);
        },
      }),
      ColumnsBlock,
      ColumnCell,
      SocialBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(SocialBlockView);
        },
      }),
      DividerBlock.extend({
        addNodeView() {
          return ReactNodeViewRenderer(DividerBlockView);
        },
      }),
      SlashCommand.configure({
        suggestion: {
          items: ({ query }: { query: string }) => {
            return getSlashCommandItems({
              onImageInsert: handleImageInsert,
            }).filter((item) =>
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
    onUpdate: ({ editor: ed }) => {
      onUpdateRef.current(JSON.stringify(ed.getJSON()));

      // Handle { variable suggestion
      if (varBraceStartRef.current !== null) {
        const curPos = ed.state.selection.from;
        const start = varBraceStartRef.current;
        if (curPos <= start) {
          setVarSuggestOpen(false);
          varBraceStartRef.current = null;
        } else {
          const text = ed.state.doc.textBetween(start, curPos, "");
          setVarSuggestQuery(text);
          setVarSuggestIndex(0);
        }
      }
    },
    onTransaction: () => {
      // Force toolbar re-render on every transaction
      setTick((t) => t + 1);
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[400px]",
      },
      handleKeyDown: (_view, event) => {
        // Handle { trigger for variable suggestion
        if (event.key === "{" && !varSuggestOpen && !slashOpen) {
          setTimeout(() => {
            if (!editor) return;
            const pos = editor.state.selection.from;
            varBraceStartRef.current = pos;
            setVarSuggestQuery("");
            setVarSuggestIndex(0);
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
            setVarSuggestIndex(
              (prev) => (prev + 1) % Math.max(filteredVars.length, 1)
            );
            return true;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setVarSuggestIndex(
              (prev) =>
                (prev + Math.max(filteredVars.length, 1) - 1) %
                Math.max(filteredVars.length, 1)
            );
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
            if (editor) {
              const curPos = editor.state.selection.from;
              if (
                varBraceStartRef.current !== null &&
                curPos <= varBraceStartRef.current + 1
              ) {
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
      const from = varBraceStartRef.current - 1;
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

  const editorContentRef = useRef<HTMLDivElement | null>(null);

  const addBlockAtEnd = useCallback(() => {
    if (!editor) return;
    editor.chain().focus("end").insertContent("/").run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="relative">
      {/* ─── Toolbar ─── */}
      <div className="mb-3 flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (⌘Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (⌘⇧Z)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </ToolbarBtn>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Bold (⌘B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Italic (⌘I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Underline (⌘U)"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarBtn>
        </div>

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarBtn>
        </div>

        <div className="flex-1" />

        <VariablePicker editor={editor} />
      </div>

      {/* ─── Editor area ─── */}
      <div
        ref={editorContentRef}
        className="email-editor-content rounded-lg border border-border p-8 shadow-sm transition-colors"
        style={{
          backgroundColor: emailStyles?.bodyBgColor || "#f5f5f5",
        }}
      >
        <div
          className="mx-auto max-w-[600px] transition-all"
          style={{
            backgroundColor: emailStyles?.contentBgColor || "#ffffff",
            borderRadius: `${emailStyles?.contentBorderRadius ?? 8}px`,
            padding: `${emailStyles?.contentPadding ?? 40}px ${Math.round((emailStyles?.contentPadding ?? 40) * 0.8)}px`,
          }}
        >
          <EditorBubbleMenu editor={editor} />
          <EditorContent editor={editor} />

          {/* Add block button at the end */}
          <button
            type="button"
            onClick={addBlockAtEnd}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-3 text-[12px] text-muted-foreground/50 transition-all hover:border-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/30"
          >
            <Plus className="h-3.5 w-3.5" />
            Add block
          </button>
        </div>
      </div>

      {/* ─── Floating block actions ─── */}
      <FloatingBlockActions editor={editor} editorContentRef={editorContentRef} />

      {/* ─── Column controls (when cursor is inside a columnsBlock) ─── */}
      <ColumnControls editor={editor} />

      {/* ─── Slash command popup ─── */}
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

      {/* ─── Variable suggestion popup ─── */}
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

      {/* ─── Image insert modal ─── */}
      <ImageInsertModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={handleImageModalInsert}
      />
    </div>
  );
}
