"use client";

import { useState, useCallback } from "react";
import { X, ImageIcon } from "lucide-react";

interface ImageInsertModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string) => void;
}

export function ImageInsertModal({ open, onClose, onInsert }: ImageInsertModalProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleInsert = useCallback(() => {
    if (!url.trim()) {
      setError("Please enter an image URL");
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setError("Please enter a valid URL");
      return;
    }
    onInsert(url.trim());
    setUrl("");
    setError("");
  }, [url, onInsert]);

  const handleClose = useCallback(() => {
    setUrl("");
    setError("");
    onClose();
  }, [onClose]);

  if (!open) return null;

  const isValidUrl = (() => {
    try {
      new URL(url.trim());
      return url.trim().length > 0;
    } catch {
      return false;
    }
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[14px] font-medium">Insert Image</h3>
        </div>

        {/* Preview */}
        {isValidUrl && (
          <div className="mb-4 flex items-center justify-center rounded-lg border border-border bg-muted/30 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url.trim()}
              alt="Preview"
              className="max-h-40 max-w-full rounded object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        <div className="space-y-3">
          <div>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInsert();
                if (e.key === "Escape") handleClose();
              }}
              placeholder="https://example.com/image.png"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-[13px] outline-none transition-colors focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-[11px] text-destructive">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md border border-border px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInsert}
              className="rounded-md bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
            >
              Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
