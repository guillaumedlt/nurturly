"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

// Default column mapping: common CSV header names → contact fields
const AUTO_MAPPING: Record<string, string> = {
  email: "email",
  e_mail: "email",
  email_address: "email",
  first_name: "firstName",
  firstname: "firstName",
  prenom: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  nom: "lastName",
  company: "company",
  entreprise: "company",
  job_title: "jobTitle",
  jobtitle: "jobTitle",
  titre: "jobTitle",
  phone: "phone",
  telephone: "phone",
  tags: "tags",
};

export function ImportContactsDialog({ open, onOpenChange, onImported }: ImportContactsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: { row: number; email: string; reason: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setResult(null);
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    try {
      // Read CSV headers to build mapping
      const text = await file.text();
      const firstLine = text.split("\n")[0] || "";
      const headers = firstLine.split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));

      const mapping: Record<string, string> = {};
      for (const header of headers) {
        const originalHeader = firstLine.split(",").find((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, "") === header)?.trim();
        if (originalHeader && AUTO_MAPPING[header]) {
          mapping[originalHeader] = AUTO_MAPPING[header];
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        setResult({ imported: 0, skipped: 0, errors: [{ row: 0, email: "", reason: err.error || "Import failed" }] });
      } else {
        const data = await res.json();
        setResult({
          imported: data.imported,
          skipped: data.skipped,
          errors: data.errors || [],
        });
        onImported();
      }
    } catch {
      setResult({ imported: 0, skipped: 0, errors: [{ row: 0, email: "", reason: "Network error" }] });
    } finally {
      setImporting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => { reset(); onOpenChange(false); }} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
        <button
          type="button"
          onClick={() => { reset(); onOpenChange(false); }}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Import contacts</h3>
        <p className="mt-1 text-[12px] text-muted-foreground">Upload a CSV file with your contacts.</p>

        {result ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-[13px] font-medium text-foreground">Import complete</span>
              </div>
              <div className="space-y-1.5 text-[12px] text-muted-foreground">
                <p><span className="font-medium text-foreground">{result.imported}</span> contacts imported</p>
                {result.skipped > 0 && <p><span className="font-medium text-foreground">{result.skipped}</span> skipped (duplicate or missing email)</p>}
                {result.errors.length > 0 && (
                  <div className="mt-2 flex items-start gap-1.5 text-destructive">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{result.errors.length} error{result.errors.length > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" className="h-8 text-[12px]" onClick={() => { reset(); onOpenChange(false); }}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-ring hover:bg-muted/20"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <>
                  <FileText className="h-8 w-8 text-foreground" strokeWidth={1.5} />
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-foreground">{file.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-foreground">Click to upload CSV</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Columns: email, first_name, last_name, company, job_title, phone</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => { reset(); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-[12px]" disabled={!file || importing} onClick={handleImport}>
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
