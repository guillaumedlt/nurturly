"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import type { ImportResult } from "@/lib/contacts/types";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

const CONTACT_FIELDS = [
  { value: "email", label: "Email" },
  { value: "firstName", label: "First Name" },
  { value: "lastName", label: "Last Name" },
  { value: "company", label: "Company" },
  { value: "jobTitle", label: "Job Title" },
  { value: "phone", label: "Phone" },
  { value: "tags", label: "Tags" },
  { value: "", label: "Skip" },
];

function autoDetectField(header: string): string {
  const h = header.toLowerCase().replace(/[_\s-]/g, "");
  if (h.includes("email") || h.includes("mail")) return "email";
  if (h.includes("firstname") || h === "first" || h === "prenom") return "firstName";
  if (h.includes("lastname") || h === "last" || h === "nom") return "lastName";
  if (h.includes("company") || h.includes("societe") || h.includes("entreprise") || h.includes("organization")) return "company";
  if (h.includes("jobtitle") || h.includes("title") || h.includes("role") || h.includes("poste")) return "jobTitle";
  if (h.includes("phone") || h.includes("tel")) return "phone";
  if (h.includes("tag")) return "tags";
  return "";
}

export function ImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const [step, setStep] = useState<"upload" | "mapping" | "importing" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setPreview([]);
    setMapping({});
    setResult(null);
    setError(null);
  };

  const handleFile = (f: File) => {
    setFile(f);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true, preview: 5 });

      if (errors.length > 0 || data.length === 0) {
        setError("Could not parse CSV file");
        return;
      }

      const h = Object.keys(data[0] as Record<string, string>);
      setHeaders(h);
      setPreview(data as Record<string, string>[]);

      const autoMapping: Record<string, string> = {};
      for (const header of h) {
        autoMapping[header] = autoDetectField(header);
      }
      setMapping(autoMapping);
      setStep("mapping");
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;

    const hasEmail = Object.values(mapping).includes("email");
    if (!hasEmail) {
      setError("You must map at least one column to Email");
      return;
    }

    setStep("importing");
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));

    try {
      const res = await fetch("/api/contacts/import", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Import failed");
        setStep("mapping");
        return;
      }
      const data: ImportResult = await res.json();
      setResult(data);
      setStep("done");
      onImported();
    } catch {
      setError("Something went wrong");
      setStep("mapping");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Import contacts</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12 transition-colors hover:border-muted-foreground/30"
            >
              <Upload className="mb-3 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[13px] font-medium text-foreground">Drop your CSV file here</p>
              <p className="mt-1 text-[12px] text-muted-foreground">or click to browse</p>
            </div>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {error && <p className="text-[12px] text-destructive">{error}</p>}
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] text-muted-foreground">{file?.name} — {preview.length}+ rows</span>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Column mapping</p>
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-3">
                  <span className="w-32 truncate text-[12px] text-foreground">{header}</span>
                  <span className="text-[12px] text-muted-foreground/50">→</span>
                  <select
                    value={mapping[header] || ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                    className="h-8 flex-1 rounded-md border border-border bg-background px-2 text-[12px] outline-none"
                  >
                    {CONTACT_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {error && <p className="text-[12px] text-destructive">{error}</p>}

            <DialogFooter>
              <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => { reset(); }}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-[12px]" onClick={handleImport}>
                Import contacts
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="mt-3 text-[13px] text-muted-foreground">Importing contacts...</p>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground">
                <Check className="h-5 w-5 text-background" />
              </div>
              <p className="mt-3 text-[14px] font-medium text-foreground">Import complete</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Imported</span>
                <span className="font-medium text-foreground">{result.imported}</span>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Skipped (duplicates)</span>
                  <span className="text-muted-foreground">{result.skipped}</span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-destructive">Errors</span>
                  <span className="text-destructive">{result.errors.length}</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-md bg-muted p-2">
                {result.errors.slice(0, 10).map((err, i) => (
                  <div key={i} className="flex items-start gap-1.5 py-0.5">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                    <span className="text-[11px] text-muted-foreground">
                      Row {err.row}: {err.reason} {err.email && `(${err.email})`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button size="sm" className="h-8 text-[12px]" onClick={() => { onOpenChange(false); reset(); }}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
