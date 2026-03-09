"use client";

import { useState } from "react";
import { X, Plus, Filter, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContactProperty } from "@/lib/contacts/types";
import {
  type ContactFilters,
  type FilterGroup,
  type FilterCondition,
  type FilterOperator,
  BUILTIN_FILTER_FIELDS,
  getOperatorsForType,
  needsValue,
  needsSecondValue,
  createCondition,
  createGroup,
  hasActiveFilters,
  countActiveFilters,
} from "@/lib/contacts/filters";

interface ContactFilterBuilderProps {
  filters: ContactFilters;
  onChange: (filters: ContactFilters) => void;
  customProperties: ContactProperty[];
}

export function ContactFilterBuilder({ filters, onChange, customProperties }: ContactFilterBuilderProps) {
  const [open, setOpen] = useState(false);

  const allFields = [
    ...BUILTIN_FILTER_FIELDS,
    ...customProperties.map((p) => ({
      key: `prop:${p.name}`,
      label: p.label,
      type: p.type,
      options: p.options || undefined,
    })),
  ];

  const getFieldType = (fieldKey: string) => {
    return allFields.find((f) => f.key === fieldKey)?.type || "text";
  };

  const getFieldOptions = (fieldKey: string) => {
    const field = allFields.find((f) => f.key === fieldKey);
    return (field && "options" in field && field.options) ? field.options : undefined;
  };

  const addGroup = () => {
    onChange({
      ...filters,
      groups: [...filters.groups, createGroup()],
    });
  };

  const removeGroup = (groupId: string) => {
    const newGroups = filters.groups.filter((g) => g.id !== groupId);
    onChange({ ...filters, groups: newGroups });
  };

  const updateGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    onChange({
      ...filters,
      groups: filters.groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g)),
    });
  };

  const addCondition = (groupId: string) => {
    onChange({
      ...filters,
      groups: filters.groups.map((g) =>
        g.id === groupId
          ? { ...g, conditions: [...g.conditions, createCondition()] }
          : g
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
          g.id === groupId
            ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }
            : g
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
                // Reset operator and value when field changes
                if (updates.field && updates.field !== c.field) {
                  const newType = getFieldType(updates.field);
                  const ops = getOperatorsForType(newType);
                  updated.operator = ops[0].value;
                  updated.value = "";
                  updated.value2 = undefined;
                }
                // Reset value when operator changes to one that doesn't need it
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

  const clearAll = () => {
    onChange({ logic: "and", groups: [] });
  };

  const active = hasActiveFilters(filters);
  const filterCount = countActiveFilters(filters);

  return (
    <div className="relative">
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        className={`h-8 text-[12px] ${active ? "border-foreground/30 bg-foreground/5" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <Filter className="mr-1.5 h-3.5 w-3.5" />
        Filter
        {filterCount > 0 && (
          <span className="ml-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-medium text-background">
            {filterCount}
          </span>
        )}
      </Button>

      {/* Filter panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-[600px] rounded-xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-foreground">Filters</span>
                {filterCount > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {filterCount} condition{filterCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {active && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
              {filters.groups.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-[12px] text-muted-foreground">No filters applied</p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">Add a filter group to narrow down your contacts</p>
                </div>
              ) : (
                filters.groups.map((group, groupIdx) => (
                  <div key={group.id}>
                    {/* Group logic connector */}
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

                    {/* Group box */}
                    <div className="rounded-lg border border-border bg-muted/20 p-2.5 space-y-1.5">
                      {group.conditions.map((condition, condIdx) => (
                        <div key={condition.id}>
                          {/* Condition logic connector */}
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

                          {/* Condition row */}
                          <ConditionRow
                            condition={condition}
                            fields={allFields}
                            fieldType={getFieldType(condition.field)}
                            fieldOptions={getFieldOptions(condition.field)}
                            onChange={(updates) => updateCondition(group.id, condition.id, updates)}
                            onRemove={() => removeCondition(group.id, condition.id)}
                          />
                        </div>
                      ))}

                      {/* Add condition to group */}
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
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2.5">
              <button
                type="button"
                onClick={addGroup}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Add filter group
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Condition Row ──

interface ConditionRowProps {
  condition: FilterCondition;
  fields: { key: string; label: string; type: string; options?: string[] }[];
  fieldType: string;
  fieldOptions?: string[];
  onChange: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, fields, fieldType, fieldOptions, onChange, onRemove }: ConditionRowProps) {
  const operators = getOperatorsForType(fieldType);
  const showValue = needsValue(condition.operator);
  const showValue2 = needsSecondValue(condition.operator);

  // Group fields by category
  const builtinFields = fields.filter((f) => !f.key.startsWith("prop:"));
  const customFields = fields.filter((f) => f.key.startsWith("prop:"));

  return (
    <div className="flex items-center gap-1.5">
      {/* Field selector */}
      <div className="relative min-w-[130px]">
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

      {/* Operator selector */}
      <div className="relative min-w-[120px]">
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

      {/* Value input */}
      {showValue && (
        <>
          {fieldType === "select" && fieldOptions ? (
            <div className="relative min-w-[120px] flex-1">
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
            <input
              type="date"
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className="h-7 min-w-[120px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
            />
          ) : fieldType === "number" ? (
            <input
              type="number"
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="Value"
              className="h-7 min-w-[80px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
            />
          ) : (
            <input
              type="text"
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="Value"
              className="h-7 min-w-[100px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
            />
          )}

          {/* Second value for "between" */}
          {showValue2 && (
            <>
              <span className="text-[10px] text-muted-foreground">and</span>
              {fieldType === "date" ? (
                <input
                  type="date"
                  value={condition.value2 || ""}
                  onChange={(e) => onChange({ value2: e.target.value })}
                  className="h-7 min-w-[120px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                />
              ) : (
                <input
                  type="number"
                  value={condition.value2 || ""}
                  onChange={(e) => onChange({ value2: e.target.value })}
                  placeholder="Value"
                  className="h-7 min-w-[80px] flex-1 rounded-md border border-border bg-background px-2 text-[11px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
                />
              )}
            </>
          )}
        </>
      )}

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
