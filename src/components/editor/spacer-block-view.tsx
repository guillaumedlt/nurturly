"use client";

import { NodeViewWrapper } from "@tiptap/react";
import { useState, useCallback } from "react";

export function SpacerBlockView({
  node,
  updateAttributes,
  selected,
}: {
  node: { attrs: { height: number } };
  updateAttributes: (attrs: Record<string, unknown>) => void;
  selected: boolean;
}) {
  const { height } = node.attrs;
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = height;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientY - startY;
        const newHeight = Math.max(8, Math.min(200, startHeight + delta));
        updateAttributes({ height: newHeight });
      };

      const handleMouseUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      setDragging(true);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [height, updateAttributes]
  );

  return (
    <NodeViewWrapper data-drag-handle="">
      <div
        className={`group relative ${
          selected || dragging ? "bg-muted/50" : ""
        }`}
        style={{ height: `${height}px` }}
        contentEditable={false}
      >
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-muted-foreground/60 select-none">
            {height}px
          </span>
        </div>

        {/* Drag handle at bottom */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="flex flex-col items-center gap-0.5 rounded-full bg-muted px-2 py-1">
            <div className="h-0.5 w-3 rounded-full bg-muted-foreground/40" />
            <div className="h-0.5 w-3 rounded-full bg-muted-foreground/40" />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
