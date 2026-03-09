"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportContactsDialog({ open, onOpenChange, onImported }: ImportContactsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] || ""; });
      return row;
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of rows) {
        const email = row.email || row.e_mail || row.email_address;
        if (!email) {
          skipped++;
          continue;
        }

        try {
          const res = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              firstName: row.first_name || row.firstname || row.prenom || null,
              lastName: row.last_name || row.lastname || row.nom || null,
              company: row.company || row.entreprise || null,
              jobTitle: row.job_title || row.jobtitle || row.titre || null,
              phone: row.phone || row.telephone || null,
              source: "import",
            }),
          });
          if (res.ok) imported++;
          else skipped++;
        } catch {
          errors.push(`Failed to import ${email}`);
        }
      }

      setResult({ imported, skipped, errors });
      onImported();
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
                    <span>{result.errors.length} errors</span>
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
            {/* Drop zone */}
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
