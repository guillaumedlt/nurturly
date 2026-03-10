"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronDown, X, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AiProperty {
  id: string;
  name: string;
  label: string;
  aiPrompt: string | null;
}

interface AiEnrichDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected contact IDs (from multi-select). If empty, shows limit picker. */
  contactIds?: string[];
  /** If enriching from an audience */
  listId?: string;
  listName?: string;
  onDone?: () => void;
}

const LIMITS = [10, 25, 50, 100, 200];

type Phase = "config" | "running" | "done";

export function AiEnrichDialog({ open, onOpenChange, contactIds, listId, listName, onDone }: AiEnrichDialogProps) {
  const [aiProps, setAiProps] = useState<AiProperty[]>([]);
  const [selectedPropId, setSelectedPropId] = useState("");
  const [limit, setLimit] = useState(25);
  const [skipExisting, setSkipExisting] = useState(true);
  const [phase, setPhase] = useState<Phase>("config");
  const [candidates, setCandidates] = useState<string[]>([]);
  const [processed, setProcessed] = useState(0);
  const [succeeded, setSucceeded] = useState(0);
  const [failed, setFailed] = useState(0);
  const cancelRef = useRef(false);

  const hasPreSelected = contactIds && contactIds.length > 0;

  useEffect(() => {
    if (!open) return;
    setPhase("config");
    setProcessed(0);
    setSucceeded(0);
    setFailed(0);
    setCandidates([]);
    cancelRef.current = false;

    fetch("/api/contact-properties")
      .then((r) => r.json())
      .then((data) => {
        const props = (data.properties || []).filter((p: AiProperty) => p.aiPrompt);
        setAiProps(props);
        if (props.length === 1) setSelectedPropId(props[0].id);
        else setSelectedPropId("");
      });
  }, [open]);

  const handleStart = async () => {
    if (!selectedPropId) return;

    setPhase("running");
    setProcessed(0);
    setSucceeded(0);
    setFailed(0);
    cancelRef.current = false;

    try {
      // Fetch candidates from server
      const res = await fetch("/api/ai/enrich-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedPropId,
          ...(hasPreSelected ? { contactIds } : {}),
          ...(listId ? { listId } : {}),
          limit: hasPreSelected ? contactIds.length : limit,
          skipExisting,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to fetch candidates");
        setPhase("config");
        return;
      }

      const { candidates: ids } = await res.json();
      setCandidates(ids);

      if (ids.length === 0) {
        toast.info("No contacts to enrich");
        setPhase("done");
        return;
      }

      // Process one by one
      let ok = 0;
      let fail = 0;
      for (let i = 0; i < ids.length; i++) {
        if (cancelRef.current) break;

        try {
          const genRes = await fetch("/api/ai/generate-property", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contactId: ids[i], propertyId: selectedPropId }),
          });
          if (genRes.ok) {
            ok++;
            setSucceeded(ok);
          } else {
            fail++;
            setFailed(fail);
          }
        } catch {
          fail++;
          setFailed(fail);
        }
        setProcessed(i + 1);
      }

      setPhase("done");
    } catch {
      toast.error("Enrichment failed");
      setPhase("config");
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleClose = () => {
    if (phase === "running") {
      cancelRef.current = true;
    }
    onOpenChange(false);
    if (phase === "done" && onDone) onDone();
  };

  const selectedProp = aiProps.find((p) => p.id === selectedPropId);
  const totalToProcess = phase === "config"
    ? (hasPreSelected ? contactIds.length : limit)
    : candidates.length;
  const progress = totalToProcess > 0 ? (processed / totalToProcess) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Sparkles className="h-4 w-4" />
            AI Enrich
          </DialogTitle>
        </DialogHeader>

        {phase === "config" && (
          <div className="space-y-4">
            {/* Property selector */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">AI Property</label>
              {aiProps.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">
                  No AI properties configured. Create one in Settings &gt; Contact Properties.
                </p>
              ) : (
                <div className="relative">
                  <select
                    value={selectedPropId}
                    onChange={(e) => setSelectedPropId(e.target.value)}
                    className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a property...</option>
                    {aiProps.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                </div>
              )}
              {selectedProp?.aiPrompt && (
                <p className="text-[11px] text-muted-foreground/60 italic truncate">
                  {selectedProp.aiPrompt}
                </p>
              )}
            </div>

            {/* Target info */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Target</label>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                {hasPreSelected ? (
                  <p className="text-[13px] text-foreground">
                    {contactIds.length} selected contact{contactIds.length !== 1 ? "s" : ""}
                  </p>
                ) : listId ? (
                  <p className="text-[13px] text-foreground">
                    Contacts in <span className="font-medium">{listName || "this audience"}</span>
                  </p>
                ) : (
                  <p className="text-[13px] text-foreground">All contacts</p>
                )}
              </div>
            </div>

            {/* Limit picker (only when no pre-selection) */}
            {!hasPreSelected && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-foreground">Limit</label>
                <div className="flex gap-1.5">
                  {LIMITS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLimit(l)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-[12px] font-medium transition-colors ${
                        limit === l
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Skip existing */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                  skipExisting ? "border-foreground bg-foreground" : "border-border"
                }`}
                onClick={() => setSkipExisting(!skipExisting)}
              >
                {skipExisting && (
                  <svg className="h-2.5 w-2.5 text-background" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[12px] text-foreground">Skip contacts that already have a value</span>
            </label>

            <Button
              className="w-full h-9 text-[12px]"
              disabled={!selectedPropId || aiProps.length === 0}
              onClick={handleStart}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Start enrichment
            </Button>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-foreground" />
              <p className="mt-3 text-[13px] font-medium text-foreground">
                Enriching contacts...
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {selectedProp?.label} — {processed}/{candidates.length}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{succeeded} generated{failed > 0 ? `, ${failed} failed` : ""}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-[12px]"
              onClick={handleCancel}
            >
              <X className="mr-1.5 h-3 w-3" />
              Stop
            </Button>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-4 py-2">
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="mt-3 text-[13px] font-medium text-foreground">Enrichment complete</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {selectedProp?.label}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              {succeeded > 0 && (
                <div className="flex items-center gap-1.5 text-[12px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-foreground">{succeeded} generated</span>
                </div>
              )}
              {failed > 0 && (
                <div className="flex items-center gap-1.5 text-[12px]">
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-foreground">{failed} failed</span>
                </div>
              )}
              {candidates.length === 0 && (
                <p className="text-[12px] text-muted-foreground">No contacts needed enrichment</p>
              )}
            </div>

            <Button className="w-full h-9 text-[12px]" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
