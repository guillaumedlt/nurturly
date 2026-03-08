"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";

export function VariableNodeView({ node }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper as="span" className="inline">
      <span
        className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground select-none"
        contentEditable={false}
      >
        {`{{${node.attrs.name}}}`}
      </span>
    </NodeViewWrapper>
  );
}
