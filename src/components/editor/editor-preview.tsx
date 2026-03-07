"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState, useMemo } from "react";
import { renderEmailHtml } from "@/lib/editor/render-html";

interface EditorPreviewProps {
  content: string; // JSON string
  subject: string;
  preheaderText: string;
}

export function EditorPreview({
  content,
  subject,
  preheaderText,
}: EditorPreviewProps) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");

  const html = useMemo(() => {
    try {
      const doc = JSON.parse(content);
      return renderEmailHtml(doc, { subject, preheaderText });
    } catch {
      return "<p>Unable to render preview</p>";
    }
  }, [content, subject, preheaderText]);

  return (
    <div className="flex flex-col items-center">
      {/* Viewport toggle */}
      <div className="mb-4 flex items-center rounded-lg border border-border p-0.5">
        <button
          type="button"
          onClick={() => setViewport("desktop")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            viewport === "desktop"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Monitor className="h-3.5 w-3.5" />
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setViewport("mobile")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            viewport === "mobile"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Mobile
        </button>
      </div>

      {/* Preview iframe */}
      <div
        className="overflow-hidden rounded-xl border border-border bg-white shadow-lg transition-all duration-300"
        style={{
          width: viewport === "desktop" ? 640 : 390,
          maxWidth: "100%",
        }}
      >
        {/* Device chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-border" />
          <div className="h-2 w-2 rounded-full bg-border" />
          <div className="h-2 w-2 rounded-full bg-border" />
          <span className="ml-2 text-[10px] text-muted-foreground/50">
            {viewport === "desktop" ? "600px" : "375px"}
          </span>
        </div>

        <iframe
          srcDoc={html}
          title="Email preview"
          className="w-full border-none"
          style={{
            height: 600,
            pointerEvents: "none",
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
