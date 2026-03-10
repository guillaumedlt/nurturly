"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ContactFilters, createEmptyFilters, hasActiveFilters } from "@/lib/contacts/filters";
import type { ContactProperty } from "@/lib/contacts/types";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateListDialog({ open, onOpenChange, onCreated }: CreateListDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"static" | "dynamic">("static");
  const [filters, setFilters] = useState<ContactFilters>(createEmptyFilters());
  const [customProps, setCustomProps] = useState<ContactProperty[]>([]);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/contact-properties")
      .then((r) => r.json())
      .then((data) => setCustomProps(data.properties || []))
      .catch(() => {});
  }, [open]);

  // Preview count for dynamic filters
  useEffect(() => {
    if (type !== "dynamic" || !hasActiveFilters(filters)) {
      setMatchCount(null);
      return;
    }
    const timer = setTimeout(async () => {
      setCountLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("filters", JSON.stringify(filters));
        params.set("limit", "1");
        const res = await fetch(`/api/contacts?${params}`);
        if (res.ok) {
          const data = await res.json();
          setMatchCount(data.total);
        }
      } catch {} finally {
        setCountLoading(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [type, filters]);

  const reset = () => {
    setName("");
    setDescription("");
    setType("static");
    setFilters(createEmptyFilters());
    setError(null);
    setMatchCount(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    if (type === "dynamic" && !hasActiveFilters(filters)) {
      setError("Add at least one filter condition for dynamic audiences");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          type,
          ...(type === "dynamic" && { filterRules: JSON.stringify(filters) }),
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      reset();
      onOpenChange(false);
      onCreated();
    } catch { setError("Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className={`${type === "dynamic" ? "sm:max-w-[680px]" : "sm:max-w-[400px]"} transition-all`}>
        <DialogHeader>
          <DialogTitle className="text-[15px]">Create audience</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type toggle */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Type</label>
            <div className="flex rounded-lg border border-border p-0.5">
              {(["static", "dynamic"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    type === t
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "static" ? "Static" : "Dynamic"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/60">
              {type === "static"
                ? "Manually add and remove contacts from this audience."
                : "Contacts matching your filters are automatically included."}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Name *</label>
            <Input placeholder="Newsletter subscribers" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-foreground">Description</label>
            <Textarea placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} className="text-[13px] min-h-[60px]" />
          </div>

          {/* Dynamic filter builder */}
          {type === "dynamic" && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-foreground">Filter conditions</label>
              <InlineFilterBuilder
                filters={filters}
                onChange={setFilters}
                customProperties={customProps}
              />
              {matchCount !== null && (
                <p className="text-[11px] text-muted-foreground">
                  {countLoading ? "Counting..." : `${matchCount} contact${matchCount !== 1 ? "s" : ""} match`}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-[12px] text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-8 text-[12px]" disabled={loading}>{loading ? "Creating..." : "Create audience"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Inline Filter Builder (embedded version without popover) ──

import { X, Plus, ChevronDown } from "lucide-react";
import {
  type FilterCondition,
  type FilterGroup,
  type FilterOperator,
  BUILTIN_FILTER_FIELDS,
  getOperatorsForType,
  needsValue,
  needsSecondValue,
  createCondition,
  createGroup,
} from "@/lib/contacts/filters";

interface InlineFilterBuilderProps {
  filters: ContactFilters;
  onChange: (filters: ContactFilters) => void;
  customProperties: ContactProperty[];
}

function InlineFilterBuilder({ filters, onChange, customProperties }: InlineFilterBuilderProps) {
  const allFields = [
    ...BUILTIN_FILTER_FIELDS,
    ...customProperties.map((p) => ({
      key: `prop:${p.name}`,
      label: p.label,
      type: p.type,
      options: p.options || undefined,
    })),
  ];

  const getFieldType = (fieldKey: string) => allFields.find((f) => f.key === fieldKey)?.type || "text";
  const getFieldOptions = (fieldKey: string) => {
    const field = allFields.find((f) => f.key === fieldKey);
    return (field && "options" in field && field.options) ? field.options : undefined;
  };

  const addGroup = () => {
    onChange({ ...filters, groups: [...filters.groups, createGroup()] });
  };

  const removeGroup = (groupId: string) => {
    onChange({ ...filters, groups: filters.groups.filter((g) => g.id !== groupId) });
  };

  const updateGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    onChange({ ...filters, groups: filters.groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)) });
  };

  const addCondition = (groupId: string) => {
    onChange({
      ...filters,
      groups: filters.groups.map((g) =>
        g.id === groupId ? { ...g, conditions: [...g.conditions, createCondition()] } : g
      ),
    });
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    const group = filters.groups.find((g) => g.id === groupId);
    if (!group) return;
    if (group.conditions.length <= 1) {
      removeGroup(groupId);
    } else {
      onChange({
        ...filters,
        groups: filters.groups.map((g) =>
          g.id === groupId ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) } : g
        ),
      });
    }
  };

  const updateCondition = (groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    onChange({
      ...filters,
      groups: filters.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: g.conditions.map((c) => {
                if (c.id !== conditionId) return c;
                const updated = { ...c, ...updates };
                if (updates.field && updates.field !== c.field) {
                  const newType = getFieldType(updates.field);
                  const ops = getOperatorsForType(newType);
                  updated.operator = ops[0].value;
                  updated.value = "";
                  updated.value2 = undefined;
                }
                if (updates.operator && !needsValue(updates.operator)) {
                  updated.value = "";
                  updated.value2 = undefined;
                }
                return updated;
              }),
            }
          : g
      ),
    });
  };

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-3 space-y-2">
      {filters.groups.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-[12px] text-muted-foreground">No filter conditions yet</p>
        </div>
      ) : (
        filters.groups.map((group, groupIdx) => (
          <div key={group.id}>
            {groupIdx > 0 && (
              <div className="flex items-center justify-center py-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, logic: filters.logic === "and" ? "or" : "and" })}
                  className="rounded-full border border-border px-3 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {filters.logic}
                </button>
              </div>
            )}
            <div className="rounded-lg border border-border bg-background p-2.5 space-y-1.5">
              {group.conditions.map((condition, condIdx) => (
                <div key={condition.id}>
                  {condIdx > 0 && (
                    <div className="flex items-center gap-2 py-0.5 pl-1">
                      <button
                        type="button"
                        onClick={() => updateGroup(group.id, { logic: group.logic === "and" ? "or" : "and" })}
                        className="rounded border border-border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                      >
                        {group.logic}
                      </button>
                    </div>
                  )}
                  <InlineConditionRow
                    condition={condition}
                    fields={allFields}
                    fieldType={getFieldType(condition.field)}
                    fieldOptions={getFieldOptions(condition.field)}
                    onChange={(updates) => updateCondition(group.id, condition.id, updates)}
                    onRemove={() => removeCondition(group.id, condition.id)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => addCondition(group.id)}
                className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Add condition
              </button>
            </div>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addGroup}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
        Add filter group
      </button>
    </div>
  );
}

function InlineConditionRow({
  condition,
  fields,
  fieldType,
  fieldOptions,
  onChange,
  onRemove,
}: {
  condition: FilterCondition;
  fields: { key: string; label: string; type: string; options?: string[] }[];
  fieldType: string;
  fieldOptions?: string[];
  onChange: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const operators = getOperatorsForType(fieldType);
  const showValue = needsValue(condition.operator);
  const showValue2 = needsSecondValue(condition.operator);

  const builtinFields = fields.filter((f) => !f.key.startsWith("prop:"));
  const customFields = fields.filter((f) => f.key.startsWith("prop:"));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="relative min-w-[120px]">
        <select
          value={condition.field}
          onChange={(e) => onChange({ field: e.target.value })}
          className="h-7 w-full appearance-none rounded-md border border-border bg-background pl-2 pr-6 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
        >
          <optgroup label="Default">
            {builtinFields.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </optgroup>
          {customFields.length > 0 && (
            <optgroup label="Custom">
              {customFields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </optgroup>
          )}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      </div>

      <div className="relative min-w-[110px]">
        <select
          value={condition.operator}
          onChange={(e) => onChange({ operator: e.target.value as FilterOperator })}
          className="h-7 w-full appearance-none rounded-md border border-border bg-background pl-2 pr-6 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
      </div>

      {showValue && (
        <>
          {fieldType === "select" && fieldOptions ? (
            <div className="relative min-w-[110px] flex-1">
              <select
                value={condition.value}
                onChange={(e) => onChange({ value: e.target.value })}
                className="h-7 w-full appearance-none rounded-md border border-border bg-background pl-2 pr-6 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="">Select...</option>
                {fieldOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            </div>
          ) : fieldType === "date" ? (
            <input type="date" value={condition.value} onChange={(e) => onChange({ value: e.target.value })}
              className="h-7 min-w-[110px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring" />
          ) : fieldType === "number" ? (
            <input type="number" value={condition.value} onChange={(e) => onChange({ value: e.target.value })} placeholder="Value"
              className="h-7 min-w-[70px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50" />
          ) : (
            <input type="text" value={condition.value} onChange={(e) => onChange({ value: e.target.value })} placeholder="Value"
              className="h-7 min-w-[90px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50" />
          )}
          {showValue2 && (
            <>
              <span className="text-[10px] text-muted-foreground">and</span>
              {fieldType === "date" ? (
                <input type="date" value={condition.value2 || ""} onChange={(e) => onChange({ value2: e.target.value })}
                  className="h-7 min-w-[110px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring" />
              ) : (
                <input type="number" value={condition.value2 || ""} onChange={(e) => onChange({ value2: e.target.value })} placeholder="Value"
                  className="h-7 min-w-[70px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50" />
              )}
            </>
          )}
        </>
      )}

      <button type="button" onClick={onRemove}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
