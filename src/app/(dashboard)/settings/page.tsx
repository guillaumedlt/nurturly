"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical, Settings, Tag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Property {
  id: string;
  name: string;
  label: string;
  type: string;
  groupName: string;
  options: string[] | null;
  required: boolean;
  position: number;
}

const PROPERTY_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Single select" },
  { value: "multi_select", label: "Multi select" },
  { value: "boolean", label: "Yes / No" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
];

const GROUPS = ["Contact info", "Company info", "Deal info", "Custom"];

export default function SettingsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState("text");
  const [newGroup, setNewGroup] = useState("Custom");
  const [newOptions, setNewOptions] = useState("");
  const [activeTab, setActiveTab] = useState<"properties" | "general">("properties");

  const fetchProperties = useCallback(async () => {
    const res = await fetch("/api/contact-properties");
    if (res.ok) {
      const data = await res.json();
      setProperties(data.properties);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        label: newLabel.trim(),
        type: newType,
        groupName: newGroup,
        position: properties.length,
      };
      if ((newType === "select" || newType === "multi_select") && newOptions.trim()) {
        body.options = newOptions.split(",").map((o) => o.trim()).filter(Boolean);
      }
      const res = await fetch("/api/contact-properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setProperties((prev) => [...prev, created]);
        setNewLabel("");
        setNewType("text");
        setNewGroup("Custom");
        setNewOptions("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/contact-properties", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  // Group properties
  const grouped: Record<string, Property[]> = {};
  for (const p of properties) {
    if (!grouped[p.groupName]) grouped[p.groupName] = [];
    grouped[p.groupName].push(p);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">Settings</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Manage your account and contact properties.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border">
        {[
          { key: "properties", label: "Contact Properties" },
          { key: "general", label: "General" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "properties" && (
        <div className="space-y-6">
          {/* Create property */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="text-[13px] font-medium text-foreground mb-4">Add a custom property</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Label</label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Lifecycle stage"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Group</label>
                <select
                  value={newGroup}
                  onChange={(e) => setNewGroup(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                >
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button size="sm" className="h-9 w-full text-[12px]" onClick={handleCreate} disabled={!newLabel.trim() || creating}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {creating ? "Adding..." : "Add property"}
                </Button>
              </div>
            </div>
            {(newType === "select" || newType === "multi_select") && (
              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Options (comma-separated)</label>
                <input
                  type="text"
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  placeholder="e.g. Lead, Qualified, Customer, Churned"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40"
                />
              </div>
            )}
          </div>

          {/* Property list */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-xl border border-border bg-background">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Tag className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                <p className="mt-3 text-[13px] font-medium text-foreground">No custom properties</p>
                <p className="mt-1 text-[12px] text-muted-foreground max-w-[280px]">
                  Create custom properties to store additional data on your contacts — like lifecycle stage, company size, or lead score.
                </p>
              </div>
            </div>
          ) : (
            Object.entries(grouped).map(([group, props]) => (
              <div key={group}>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{group}</h4>
                <div className="rounded-xl border border-border bg-background divide-y divide-border">
                  {props.map((prop) => (
                    <div key={prop.id} className="group flex items-center gap-3 px-5 py-3">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground">{prop.label}</span>
                          <Badge variant="outline" className="text-[10px] font-normal">{PROPERTY_TYPES.find((t) => t.value === prop.type)?.label || prop.type}</Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">Internal name: {prop.name}</span>
                        {prop.options && prop.options.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {prop.options.map((opt) => (
                              <span key={opt} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{opt}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(prop.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "general" && (
        <div className="rounded-xl border border-border bg-background p-5">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Settings className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="mt-3 text-[13px] font-medium text-foreground">General settings</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Account settings, sender configuration, and domain verification coming soon.</p>
          </div>
        </div>
      )}
    </div>
  );
}
