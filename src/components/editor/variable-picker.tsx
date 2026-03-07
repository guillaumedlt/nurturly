"use client";

import { Braces } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { AVAILABLE_VARIABLES } from "@/lib/editor/extensions/variable-node";

interface VariablePickerProps {
  editor: Editor;
}

export function VariablePicker({ editor }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const insertVariable = (name: string) => {
    editor
      .chain()
      .focus()
      .insertContent({ type: "variable", attrs: { name } })
      .run();
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Insert variable"
      >
        <Braces className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Variables</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-border bg-background p-1 shadow-lg">
          {AVAILABLE_VARIABLES.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => insertVariable(v.name)}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-accent"
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
      )}
    </div>
  );
}
