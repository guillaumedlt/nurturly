"use client";

import { useState, useRef, useEffect } from "react";
import { FolderOpen, FolderPlus, Pencil, Trash2, X, Check } from "lucide-react";

export interface Folder {
  id: string;
  name: string;
  entityType: string;
  createdAt: string;
}

interface FolderNavProps {
  folders: Folder[];
  activeFolderId: string | null; // null = "All"
  entityType: string;
  onSelect: (folderId: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function FolderNav({
  folders,
  activeFolderId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: FolderNavProps) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const createRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (creating) createRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onCreate(trimmed);
      setNewName("");
      setCreating(false);
    }
  };

  const handleRename = (id: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      onRename(id, trimmed);
      setEditingId(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* All button */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
          activeFolderId === null
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        All
      </button>

      {/* Folder chips */}
      {folders.map((folder) =>
        editingId === folder.id ? (
          <div key={folder.id} className="flex items-center gap-1">
            <input
              ref={editRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(folder.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="h-[26px] w-[120px] rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:border-ring"
            />
            <button
              type="button"
              onClick={() => handleRename(folder.id)}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div key={folder.id} className="group/folder relative flex items-center">
            <button
              type="button"
              onClick={() => onSelect(folder.id)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                activeFolderId === folder.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <FolderOpen className="h-3 w-3" />
              {folder.name}
            </button>
            {/* Edit/delete actions on hover */}
            <div className="ml-0.5 hidden items-center gap-0.5 group-hover/folder:flex">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(folder.id);
                  setEditName(folder.name);
                }}
                className="flex h-[22px] w-[22px] items-center justify-center rounded text-muted-foreground/60 hover:text-foreground"
              >
                <Pencil className="h-2.5 w-2.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete folder "${folder.name}"? Items will be moved to "All".`)) {
                    onDelete(folder.id);
                  }
                }}
                className="flex h-[22px] w-[22px] items-center justify-center rounded text-muted-foreground/60 hover:text-destructive"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Create folder */}
      {creating ? (
        <div className="flex items-center gap-1">
          <input
            ref={createRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") {
                setCreating(false);
                setNewName("");
              }
            }}
            placeholder="Folder name..."
            className="h-[26px] w-[120px] rounded-md border border-input bg-background px-2 text-[12px] outline-none focus:border-ring placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={handleCreate}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <FolderPlus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// Small dropdown to move an item to a folder
interface MoveToFolderProps {
  folders: Folder[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
}

export function MoveToFolderDropdown({ folders, currentFolderId, onMove }: MoveToFolderProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (folders.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        title="Move to folder"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <FolderOpen className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-md border border-border bg-background p-1 shadow-lg">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(null);
              setOpen(false);
            }}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-muted ${
              currentFolderId === null ? "font-medium text-foreground" : "text-muted-foreground"
            }`}
          >
            No folder
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMove(f.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-muted ${
                currentFolderId === f.id ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              <FolderOpen className="h-3 w-3" />
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
