"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Zap,
  Mail,
  Clock,
  GitBranch,
  Tag,
  CircleStop,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  Check,
  Search,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  TriggerNodeData,
  EmailNodeData,
  DelayNodeData,
  ConditionNodeData,
  ActionNodeData,
  WorkflowNodeData,
} from "@/lib/sequences/types";
import { NODE_META } from "@/lib/sequences/types";

/* ─── Constants ─── */
const NODE_WIDTH = 260;
const NODE_HEIGHT = 72;
const CONDITION_HEIGHT = 80;
const V_GAP = 100; // vertical gap between node centers
const H_GAP = 300; // horizontal gap between branches

/* ─── Node Icon Map ─── */
const NODE_ICONS: Record<WorkflowNodeType, typeof Zap> = {
  trigger: Zap,
  email: Mail,
  delay: Clock,
  condition: GitBranch,
  action: Tag,
  end: CircleStop,
};

/* ─── Add Node Menu Items ─── */
const ADD_NODE_OPTIONS: { type: WorkflowNodeType; label: string; description: string }[] = [
  { type: "email", label: "Send Email", description: "Send an email template" },
  { type: "delay", label: "Wait", description: "Wait for a duration" },
  { type: "condition", label: "Condition", description: "Branch based on behavior" },
  { type: "action", label: "Action", description: "Tag, move to list, etc." },
];

/* ─── Utility: generate ID ─── */
let idCounter = 0;
function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}

/* ─────────────────────────────────────────────
   Auto-layout algorithm (tree layout from trigger)
   ───────────────────────────────────────────── */
function autoLayoutWorkflow(workflow: WorkflowDefinition): WorkflowDefinition {
  if (workflow.nodes.length === 0) return workflow;

  const trigger = workflow.nodes.find((n) => n.type === "trigger");
  if (!trigger) return workflow;

  // Build adjacency: source -> [{ target, handle }]
  const children: Record<string, { target: string; handle?: string }[]> = {};
  for (const edge of workflow.edges) {
    if (!children[edge.source]) children[edge.source] = [];
    children[edge.source].push({ target: edge.target, handle: edge.sourceHandle });
  }

  // Recursive layout: returns { width } of the subtree
  // and assigns positions to each node
  const positions: Record<string, { x: number; y: number }> = {};

  function layoutSubtree(nodeId: string, depth: number): number {
    const node = workflow.nodes.find((n) => n.id === nodeId);
    if (!node) return NODE_WIDTH;

    const kids = children[nodeId] || [];
    const isCondition = node.type === "condition";

    if (kids.length === 0) {
      // Leaf node
      positions[nodeId] = { x: 0, y: depth * (NODE_HEIGHT + V_GAP) };
      return NODE_WIDTH;
    }

    if (isCondition && kids.length === 2) {
      // Sort: "yes" on left, "no" on right
      const sorted = [...kids].sort((a, b) => {
        if (a.handle === "yes") return -1;
        if (b.handle === "yes") return 1;
        return 0;
      });

      const leftWidth = layoutSubtree(sorted[0].target, depth + 1);
      const rightWidth = layoutSubtree(sorted[1].target, depth + 1);
      const totalWidth = leftWidth + H_GAP + rightWidth;

      // Center condition node over its children
      const leftCenter = positions[sorted[0].target]?.x ?? 0;
      const rightCenter = positions[sorted[1].target]?.x ?? 0;

      // Position children relative to center
      const centerX = 0;
      const leftOffset = centerX - H_GAP / 2 - leftWidth / 2;
      const rightOffset = centerX + H_GAP / 2 + rightWidth / 2;

      // Shift left subtree
      shiftSubtree(sorted[0].target, leftOffset - (positions[sorted[0].target]?.x ?? 0), children, positions);
      // Shift right subtree
      shiftSubtree(sorted[1].target, rightOffset - (positions[sorted[1].target]?.x ?? 0), children, positions);

      positions[nodeId] = { x: centerX, y: depth * (NODE_HEIGHT + V_GAP) };
      return Math.max(totalWidth, NODE_WIDTH);
    }

    // Single child (most common)
    if (kids.length === 1) {
      const childWidth = layoutSubtree(kids[0].target, depth + 1);
      const childX = positions[kids[0].target]?.x ?? 0;
      positions[nodeId] = { x: childX, y: depth * (NODE_HEIGHT + V_GAP) };
      return childWidth;
    }

    // Multiple children (shouldn't happen normally, but handle gracefully)
    let totalW = 0;
    const childXs: number[] = [];
    for (let i = 0; i < kids.length; i++) {
      const w = layoutSubtree(kids[i].target, depth + 1);
      if (i > 0) totalW += H_GAP;
      childXs.push(totalW + w / 2);
      totalW += w;
    }
    // Center parent over children
    const firstX = childXs[0];
    const lastX = childXs[childXs.length - 1];
    const centerX = (firstX + lastX) / 2;

    // Shift children to be relative to center
    const offset = -centerX;
    for (let i = 0; i < kids.length; i++) {
      shiftSubtree(kids[i].target, offset + childXs[i] - (positions[kids[i].target]?.x ?? 0), children, positions);
    }

    positions[nodeId] = { x: 0, y: depth * (NODE_HEIGHT + V_GAP) };
    return totalW;
  }

  function shiftSubtree(
    nodeId: string,
    dx: number,
    adj: Record<string, { target: string }[]>,
    pos: Record<string, { x: number; y: number }>
  ) {
    if (!pos[nodeId]) return;
    pos[nodeId].x += dx;
    const kids = adj[nodeId] || [];
    for (const k of kids) {
      shiftSubtree(k.target, dx, adj, pos);
    }
  }

  layoutSubtree(trigger.id, 0);

  // Find bounding box and center everything
  const xs = Object.values(positions).map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const centerOffset = -((maxX + minX) / 2);

  // Apply positions with centering (will be offset by canvas center later)
  const updatedNodes = workflow.nodes.map((n) => {
    const pos = positions[n.id];
    if (pos) {
      return {
        ...n,
        position: {
          x: pos.x + centerOffset,
          y: pos.y + 60, // top padding
        },
      };
    }
    return n;
  });

  return { ...workflow, nodes: updatedNodes };
}

/* ─── SVG Edge Path ─── */
function EdgePath({
  x1, y1, x2, y2, dashed,
}: {
  x1: number; y1: number; x2: number; y2: number;
  dashed?: boolean;
}) {
  const dy = y2 - y1;
  const controlY = Math.min(dy * 0.5, 60);
  const d = x1 === x2
    ? `M ${x1} ${y1} C ${x1} ${y1 + controlY}, ${x2} ${y2 - controlY}, ${x2} ${y2}`
    : `M ${x1} ${y1} C ${x1} ${y1 + controlY}, ${x2} ${y2 - controlY}, ${x2} ${y2}`;

  return (
    <path
      d={d}
      fill="none"
      stroke="var(--border)"
      strokeWidth={2}
      strokeDasharray={dashed ? "6 4" : undefined}
      className="transition-colors"
    />
  );
}

/* ─── Add Node Button (on edge) ─── */
function AddNodeButton({
  x, y, onAdd,
}: {
  x: number; y: number;
  onAdd: (type: WorkflowNodeType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="absolute z-20"
      style={{ left: x - 12, top: y - 12 }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
          open
            ? "border-foreground bg-foreground text-background scale-110"
            : "border-border bg-background text-muted-foreground opacity-0 hover:opacity-100 hover:border-foreground hover:bg-foreground hover:text-background hover:scale-110"
        }`}
        style={open ? {} : undefined}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.opacity = ""; }}
      >
        <Plus className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute left-1/2 top-8 z-30 w-52 -translate-x-1/2 rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {ADD_NODE_OPTIONS.map((opt) => {
            const Icon = NODE_ICONS[opt.type];
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => { onAdd(opt.type); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: NODE_META[opt.type].color + "18", color: NODE_META[opt.type].color }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Node Subtitle Text ─── */
function getNodeSubtitle(node: WorkflowNode): string {
  switch (node.type) {
    case "trigger": {
      const d = node.data as TriggerNodeData;
      if (d.triggerType === "list_add") return d.listName || "When added to audience";
      return d.triggerType === "manual" ? "Manual enrollment" : "When tag added";
    }
    case "email": {
      const d = node.data as EmailNodeData;
      return d.emailName || "Select an email template";
    }
    case "delay": {
      const d = node.data as DelayNodeData;
      if (!d.duration) return "Set wait duration";
      return `Wait ${d.duration} ${d.unit}`;
    }
    case "condition": {
      const d = node.data as ConditionNodeData;
      if (d.conditionType === "email_opened") return d.referenceEmailName ? `Opened "${d.referenceEmailName}"` : "Email opened?";
      if (d.conditionType === "email_clicked") return "Email clicked?";
      if (d.conditionType === "email_not_opened") return "Email NOT opened?";
      if (d.conditionType === "tag_has") return d.tagName ? `Has tag "${d.tagName}"` : "Has tag?";
      return "Set condition";
    }
    case "action": {
      const d = node.data as ActionNodeData;
      if (d.actionType === "add_tag") return d.tagName ? `Add tag "${d.tagName}"` : "Add tag";
      if (d.actionType === "remove_tag") return "Remove tag";
      if (d.actionType === "move_to_list") return d.listName || "Move to audience";
      if (d.actionType === "mark_completed") return "Mark completed";
      return "Configure action";
    }
    case "end":
      return "Sequence ends";
    default:
      return "";
  }
}

/* ─── Dropdown Component ─── */
function Dropdown({
  value, onChange, options, placeholder, searchable = false, disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; sublabel?: string }[];
  placeholder: string;
  searchable?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-[13px] transition-colors hover:border-ring disabled:opacity-50"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground/50"}>{selected?.label || placeholder}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-50 w-full rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-100">
          {searchable && (
            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full rounded-md border-0 bg-muted pl-8 pr-3 text-[12px] outline-none"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-center text-[12px] text-muted-foreground">No options</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-accent"
                >
                  <span className="flex-1 truncate text-foreground">{o.label}</span>
                  {value === o.value && <Check className="h-3.5 w-3.5 text-foreground" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Node Config Panel ─── */
function NodeConfigPanel({
  node, emails, lists, emailNodes, onUpdate, onDelete, onClose,
}: {
  node: WorkflowNode;
  emails: { id: string; name: string }[];
  lists: { id: string; name: string }[];
  emailNodes: { id: string; name: string }[];
  onUpdate: (data: WorkflowNodeData) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = NODE_ICONS[node.type];

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ backgroundColor: meta.color + "18", color: meta.color }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[13px] font-medium text-foreground">{meta.label}</span>
        </div>
        <button type="button" onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground">
          Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {node.type === "trigger" && <TriggerConfig data={node.data as TriggerNodeData} lists={lists} onUpdate={onUpdate} />}
        {node.type === "email" && <EmailConfig data={node.data as EmailNodeData} emails={emails} onUpdate={onUpdate} />}
        {node.type === "delay" && <DelayConfig data={node.data as DelayNodeData} onUpdate={onUpdate} />}
        {node.type === "condition" && <ConditionConfig data={node.data as ConditionNodeData} emailNodes={emailNodes} onUpdate={onUpdate} />}
        {node.type === "action" && <ActionConfig data={node.data as ActionNodeData} lists={lists} onUpdate={onUpdate} />}
        {node.type === "end" && <p className="text-[13px] text-muted-foreground">Contacts reaching this node exit the sequence.</p>}
      </div>

      {node.type !== "trigger" && (
        <div className="border-t border-border p-4">
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/30 py-2 text-[12px] font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete node
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Config Sub-panels ─── */

function TriggerConfig({ data, lists, onUpdate }: {
  data: TriggerNodeData; lists: { id: string; name: string }[]; onUpdate: (d: WorkflowNodeData) => void;
}) {
  const triggers = [
    { value: "manual", label: "Manual enrollment" },
    { value: "list_add", label: "When added to audience" },
    { value: "tag_add", label: "When tag is added" },
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Trigger type</label>
        <div className="flex flex-col gap-1">
          {triggers.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onUpdate({ ...data, triggerType: t.value as TriggerNodeData["triggerType"] })}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] transition-colors ${
                data.triggerType === t.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {data.triggerType === t.value && <Check className="h-3.5 w-3.5" />}
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {data.triggerType === "list_add" && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">Audience</label>
          <Dropdown
            value={data.listId || ""}
            onChange={(v) => {
              const list = lists.find((l) => l.id === v);
              onUpdate({ ...data, listId: v, listName: list?.name });
            }}
            options={lists.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Select audience..."
            searchable
          />
        </div>
      )}
    </div>
  );
}

function EmailConfig({ data, emails, onUpdate }: {
  data: EmailNodeData; emails: { id: string; name: string }[]; onUpdate: (d: WorkflowNodeData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Email template</label>
        <Dropdown
          value={data.emailId || ""}
          onChange={(v) => {
            const email = emails.find((e) => e.id === v);
            onUpdate({ ...data, emailId: v, emailName: email?.name });
          }}
          options={emails.map((e) => ({ value: e.id, label: e.name }))}
          placeholder="Select email..."
          searchable
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Subject override</label>
        <input
          type="text"
          value={data.subject || ""}
          onChange={(e) => onUpdate({ ...data, subject: e.target.value })}
          placeholder="Leave blank to use email's subject"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
  );
}

function DelayConfig({ data, onUpdate }: {
  data: DelayNodeData; onUpdate: (d: WorkflowNodeData) => void;
}) {
  const units = [
    { value: "minutes", label: "Min" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
    { value: "weeks", label: "Weeks" },
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Duration</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={data.duration || ""}
            onChange={(e) => onUpdate({ ...data, duration: parseInt(e.target.value) || 0 })}
            placeholder="1"
            className="h-9 w-20 rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center gap-1">
            {units.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => onUpdate({ ...data, unit: u.value as DelayNodeData["unit"] })}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  data.unit === u.value
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConditionConfig({ data, emailNodes, onUpdate }: {
  data: ConditionNodeData; emailNodes: { id: string; name: string }[]; onUpdate: (d: WorkflowNodeData) => void;
}) {
  const conditions = [
    { value: "email_opened", label: "Email was opened" },
    { value: "email_clicked", label: "Email was clicked" },
    { value: "email_not_opened", label: "Email was NOT opened" },
    { value: "email_not_clicked", label: "Email was NOT clicked" },
    { value: "tag_has", label: "Contact has tag" },
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Condition</label>
        <div className="flex flex-col gap-1">
          {conditions.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => onUpdate({ ...data, conditionType: c.value as ConditionNodeData["conditionType"] })}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] transition-colors ${
                data.conditionType === c.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {data.conditionType === c.value && <Check className="h-3 w-3" />}
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {(data.conditionType === "email_opened" || data.conditionType === "email_clicked" ||
        data.conditionType === "email_not_opened" || data.conditionType === "email_not_clicked") && emailNodes.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">Which email?</label>
          <Dropdown
            value={data.referenceNodeId || ""}
            onChange={(v) => {
              const en = emailNodes.find((e) => e.id === v);
              onUpdate({ ...data, referenceNodeId: v, referenceEmailName: en?.name });
            }}
            options={emailNodes.map((e) => ({ value: e.id, label: e.name }))}
            placeholder="Select email node..."
          />
        </div>
      )}
      {data.conditionType === "tag_has" && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">Tag name</label>
          <input
            type="text"
            value={data.tagName || ""}
            onChange={(e) => onUpdate({ ...data, tagName: e.target.value })}
            placeholder="e.g. interested"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
      )}
    </div>
  );
}

function ActionConfig({ data, lists, onUpdate }: {
  data: ActionNodeData; lists: { id: string; name: string }[]; onUpdate: (d: WorkflowNodeData) => void;
}) {
  const actions = [
    { value: "add_tag", label: "Add tag to contact" },
    { value: "remove_tag", label: "Remove tag from contact" },
    { value: "move_to_list", label: "Move to audience" },
    { value: "remove_from_list", label: "Remove from audience" },
    { value: "mark_completed", label: "Mark as completed" },
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Action</label>
        <div className="flex flex-col gap-1">
          {actions.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => onUpdate({ ...data, actionType: a.value as ActionNodeData["actionType"] })}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] transition-colors ${
                data.actionType === a.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {data.actionType === a.value && <Check className="h-3 w-3" />}
              {a.label}
            </button>
          ))}
        </div>
      </div>
      {(data.actionType === "add_tag" || data.actionType === "remove_tag") && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">Tag name</label>
          <input
            type="text"
            value={data.tagName || ""}
            onChange={(e) => onUpdate({ ...data, tagName: e.target.value })}
            placeholder="e.g. engaged"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
      )}
      {(data.actionType === "move_to_list" || data.actionType === "remove_from_list") && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">Audience</label>
          <Dropdown
            value={data.listId || ""}
            onChange={(v) => {
              const list = lists.find((l) => l.id === v);
              onUpdate({ ...data, listId: v, listName: list?.name });
            }}
            options={lists.map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Select audience..."
            searchable
          />
        </div>
      )}
    </div>
  );
}

/* ─── Workflow Node Component ─── */
function WorkflowNodeCard({
  node, selected, onSelect, onDragStart,
}: {
  node: WorkflowNode;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = NODE_ICONS[node.type];
  const subtitle = getNodeSubtitle(node);
  const isCondition = node.type === "condition";
  const height = isCondition ? CONDITION_HEIGHT : NODE_HEIGHT;

  return (
    <div
      className={`absolute select-none transition-all duration-200 ${selected ? "z-10" : "z-0"}`}
      style={{
        left: node.position.x - NODE_WIDTH / 2,
        top: node.position.y - height / 2,
        width: NODE_WIDTH,
      }}
    >
      <div
        onClick={onSelect}
        className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-background px-4 transition-all ${
          selected
            ? "border-foreground shadow-lg"
            : "border-border hover:border-muted-foreground/50 hover:shadow-md"
        }`}
        style={{ height }}
      >
        {/* Drag handle */}
        {node.type !== "trigger" && (
          <div
            onMouseDown={onDragStart}
            className="absolute -left-7 top-1/2 -translate-y-1/2 flex h-5 w-5 cursor-grab items-center justify-center rounded-md text-muted-foreground/0 transition-all group-hover:text-muted-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: meta.color + "15", color: meta.color }}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground">{meta.label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>

        {/* Condition branch labels */}
        {isCondition && (
          <>
            <div className="absolute -bottom-5 left-[25%] -translate-x-1/2 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-green-600">
              YES
            </div>
            <div className="absolute -bottom-5 left-[75%] -translate-x-1/2 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-red-500">
              NO
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Floating Canvas Toolbar ─── */
function CanvasToolbar({
  onOrganize, onFitView, zoom, onZoomIn, onZoomOut,
}: {
  onOrganize: () => void;
  onFitView: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 rounded-lg border border-border bg-background p-1 shadow-sm">
      <button
        type="button"
        onClick={onOrganize}
        title="Auto-organize layout"
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Organize
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onZoomOut}
        title="Zoom out"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[36px] text-center text-[11px] font-medium text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={onZoomIn}
        title="Zoom in"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onFitView}
        title="Fit to view"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ─── Main Workflow Builder ─── */
interface WorkflowBuilderProps {
  workflow: WorkflowDefinition;
  onChange: (workflow: WorkflowDefinition) => void;
  emails: { id: string; name: string }[];
  lists: { id: string; name: string }[];
}

export function WorkflowBuilder({ workflow, onChange, emails, lists }: WorkflowBuilderProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const initializedRef = useRef(false);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const emailNodes = workflow.nodes
    .filter((n) => n.type === "email")
    .map((n) => ({
      id: n.id,
      name: (n.data as EmailNodeData).emailName || "Untitled email",
    }));

  // ─── Compute canvas-relative positions (center workflow in viewport) ───
  const { offsetX, offsetY, canvasW, canvasH } = useMemo(() => {
    if (workflow.nodes.length === 0) return { offsetX: 0, offsetY: 0, canvasW: 800, canvasH: 500 };

    const xs = workflow.nodes.map((n) => n.position.x);
    const ys = workflow.nodes.map((n) => n.position.y);
    const minX = Math.min(...xs) - NODE_WIDTH / 2;
    const maxX = Math.max(...xs) + NODE_WIDTH / 2;
    const minY = Math.min(...ys) - CONDITION_HEIGHT / 2;
    const maxY = Math.max(...ys) + CONDITION_HEIGHT / 2;

    const contentW = maxX - minX + 200;
    const contentH = maxY - minY + 200;
    const w = Math.max(contentW, 1200);
    const h = Math.max(contentH, 800);

    // Offset to center the content in canvas
    const ox = (w - contentW) / 2 - minX + 100;
    const oy = -minY + 100;

    return { offsetX: ox, offsetY: oy, canvasW: w, canvasH: h };
  }, [workflow.nodes]);

  // ─── Auto-center scroll on first load ───
  useEffect(() => {
    if (initializedRef.current || !canvasRef.current || workflow.nodes.length === 0) return;
    initializedRef.current = true;

    const container = canvasRef.current;
    const trigger = workflow.nodes.find((n) => n.type === "trigger");
    if (!trigger) return;

    // Scroll so trigger is centered in viewport
    const triggerScreenX = (trigger.position.x + offsetX) * zoom;
    const triggerScreenY = (trigger.position.y + offsetY) * zoom;

    requestAnimationFrame(() => {
      container.scrollLeft = triggerScreenX - container.clientWidth / 2;
      container.scrollTop = Math.max(0, triggerScreenY - 120);
    });
  }, [workflow.nodes, offsetX, offsetY, zoom]);

  // ─── Organize handler ───
  const handleOrganize = useCallback(() => {
    const organized = autoLayoutWorkflow(workflow);
    onChange(organized);

    // Re-center after organize
    requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const container = canvasRef.current;
      const trigger = organized.nodes.find((n) => n.type === "trigger");
      if (!trigger) return;

      const xs = organized.nodes.map((n) => n.position.x);
      const ys = organized.nodes.map((n) => n.position.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const contentW = maxX - minX + NODE_WIDTH + 200;
      const w = Math.max(contentW, 1200);
      const ox = (w - contentW) / 2 - minX + NODE_WIDTH / 2 + 100;

      const centerX = (trigger.position.x + ox) * zoom;
      container.scrollLeft = centerX - container.clientWidth / 2;
      container.scrollTop = 0;
    });
  }, [workflow, onChange, zoom]);

  // ─── Fit view ───
  const handleFitView = useCallback(() => {
    if (!canvasRef.current || workflow.nodes.length === 0) return;
    const container = canvasRef.current;

    const xs = workflow.nodes.map((n) => n.position.x);
    const ys = workflow.nodes.map((n) => n.position.y);
    const minX = Math.min(...xs) - NODE_WIDTH;
    const maxX = Math.max(...xs) + NODE_WIDTH;
    const minY = Math.min(...ys) - CONDITION_HEIGHT;
    const maxY = Math.max(...ys) + CONDITION_HEIGHT;

    const contentW = maxX - minX + 100;
    const contentH = maxY - minY + 100;

    const scaleX = container.clientWidth / contentW;
    const scaleY = container.clientHeight / contentH;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.5);

    setZoom(newZoom);

    requestAnimationFrame(() => {
      const cx = ((minX + maxX) / 2 + offsetX) * newZoom;
      const cy = ((minY + maxY) / 2 + offsetY) * newZoom;
      container.scrollLeft = cx - container.clientWidth / 2;
      container.scrollTop = cy - container.clientHeight / 2;
    });
  }, [workflow.nodes, offsetX, offsetY]);

  // ─── Zoom ───
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.1, 2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.1, 0.3)), []);

  // Mouse wheel zoom
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom((z) => Math.min(Math.max(z + delta, 0.3), 2));
      }
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  // ─── Node dragging ───
  const handleNodeDragStart = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node || node.type === "trigger") return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      const scrollLeft = canvasRef.current?.scrollLeft || 0;
      const scrollTop = canvasRef.current?.scrollTop || 0;

      draggingRef.current = {
        nodeId,
        offsetX: e.clientX - canvasRect.left + scrollLeft - (node.position.x + offsetX) * zoom,
        offsetY: e.clientY - canvasRect.top + scrollTop - (node.position.y + offsetY) * zoom,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!draggingRef.current || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const sl = canvasRef.current.scrollLeft;
        const st = canvasRef.current.scrollTop;
        const rawX = (ev.clientX - rect.left + sl - draggingRef.current.offsetX) / zoom - offsetX;
        const rawY = (ev.clientY - rect.top + st - draggingRef.current.offsetY) / zoom - offsetY;

        onChange({
          ...workflow,
          nodes: workflow.nodes.map((n) =>
            n.id === draggingRef.current!.nodeId
              ? { ...n, position: { x: rawX, y: rawY } }
              : n
          ),
        });
      };

      const onMouseUp = () => {
        draggingRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [workflow, onChange, offsetX, offsetY, zoom]
  );

  // ─── Add node on edge ───
  const addNodeOnEdge = useCallback(
    (edgeId: string, type: WorkflowNodeType) => {
      const edge = workflow.edges.find((e) => e.id === edgeId);
      if (!edge) return;

      const sourceNode = workflow.nodes.find((n) => n.id === edge.source);
      const targetNode = workflow.nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) return;

      const newId = genId(type);
      const midX = (sourceNode.position.x + targetNode.position.x) / 2;
      const midY = (sourceNode.position.y + targetNode.position.y) / 2;

      let data: WorkflowNodeData;
      switch (type) {
        case "email": data = { emailId: undefined, emailName: undefined, subject: undefined } as unknown as EmailNodeData; break;
        case "delay": data = { duration: 1, unit: "days" } as DelayNodeData; break;
        case "condition": data = { conditionType: "email_opened" } as ConditionNodeData; break;
        case "action": data = { actionType: "add_tag" } as ActionNodeData; break;
        default: data = {}; break;
      }

      const newNode: WorkflowNode = { id: newId, type, position: { x: midX, y: midY }, data };

      const shiftAmount = NODE_HEIGHT + V_GAP;
      const updatedNodes = workflow.nodes.map((n) => {
        if (n.position.y >= midY && n.id !== edge.source) {
          return { ...n, position: { ...n.position, y: n.position.y + shiftAmount } };
        }
        return n;
      });

      let newEdges: WorkflowEdge[];

      if (type === "condition") {
        const endId = genId("end");
        const endNode: WorkflowNode = {
          id: endId, type: "end",
          position: { x: midX + H_GAP / 2, y: midY + shiftAmount },
          data: {},
        };
        updatedNodes.push(endNode);

        newEdges = workflow.edges
          .filter((e) => e.id !== edgeId)
          .concat([
            { id: genId("e"), source: edge.source, target: newId, sourceHandle: edge.sourceHandle },
            { id: genId("e"), source: newId, target: edge.target, sourceHandle: "yes" },
            { id: genId("e"), source: newId, target: endId, sourceHandle: "no" },
          ]);
      } else {
        newEdges = workflow.edges
          .filter((e) => e.id !== edgeId)
          .concat([
            { id: genId("e"), source: edge.source, target: newId, sourceHandle: edge.sourceHandle },
            { id: genId("e"), source: newId, target: edge.target },
          ]);
      }

      const newWorkflow = { nodes: [...updatedNodes, newNode], edges: newEdges };
      // Auto-organize after adding
      onChange(autoLayoutWorkflow(newWorkflow));
      setSelectedNodeId(newId);
    },
    [workflow, onChange]
  );

  // ─── Delete node ───
  const deleteNode = useCallback(
    (nodeId: string) => {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node || node.type === "trigger") return;

      const incomingEdges = workflow.edges.filter((e) => e.target === nodeId);
      const outgoingEdges = workflow.edges.filter((e) => e.source === nodeId);

      let newEdges = workflow.edges.filter((e) => e.source !== nodeId && e.target !== nodeId);

      if (outgoingEdges.length > 0) {
        const mainTarget = outgoingEdges[0].target;
        for (const inc of incomingEdges) {
          newEdges.push({ id: genId("e"), source: inc.source, target: mainTarget, sourceHandle: inc.sourceHandle });
        }
      }

      let nodesToRemove = [nodeId];
      if (node.type === "condition") {
        for (const oe of outgoingEdges) {
          const targetNode = workflow.nodes.find((n) => n.id === oe.target);
          if (targetNode?.type === "end") {
            const otherIncoming = workflow.edges.filter((e) => e.target === oe.target && e.source !== nodeId);
            if (otherIncoming.length === 0) {
              nodesToRemove.push(oe.target);
              newEdges = newEdges.filter((e) => e.source !== oe.target && e.target !== oe.target);
            }
          }
        }
      }

      const result = {
        nodes: workflow.nodes.filter((n) => !nodesToRemove.includes(n.id)),
        edges: newEdges,
      };
      onChange(autoLayoutWorkflow(result));
      setSelectedNodeId(null);
    },
    [workflow, onChange]
  );

  // ─── Update node data ───
  const updateNodeData = useCallback(
    (data: WorkflowNodeData) => {
      if (!selectedNodeId) return;
      onChange({
        ...workflow,
        nodes: workflow.nodes.map((n) => n.id === selectedNodeId ? { ...n, data } : n),
      });
    },
    [workflow, onChange, selectedNodeId]
  );

  // ─── Compute edge positions (with offset) ───
  const edgeElements = useMemo(() => {
    const result: {
      id: string; x1: number; y1: number; x2: number; y2: number;
      midX: number; midY: number; dashed?: boolean;
    }[] = [];

    for (const edge of workflow.edges) {
      const source = workflow.nodes.find((n) => n.id === edge.source);
      const target = workflow.nodes.find((n) => n.id === edge.target);
      if (!source || !target) continue;

      const isCondition = source.type === "condition";
      const sourceH = isCondition ? CONDITION_HEIGHT : NODE_HEIGHT;

      let x1 = source.position.x + offsetX;
      if (isCondition && edge.sourceHandle === "yes") {
        x1 = source.position.x + offsetX - NODE_WIDTH / 4;
      } else if (isCondition && edge.sourceHandle === "no") {
        x1 = source.position.x + offsetX + NODE_WIDTH / 4;
      }

      const y1 = source.position.y + offsetY + sourceH / 2;
      const targetH = target.type === "condition" ? CONDITION_HEIGHT : NODE_HEIGHT;
      const x2 = target.position.x + offsetX;
      const y2 = target.position.y + offsetY - targetH / 2;

      result.push({
        id: edge.id, x1, y1, x2, y2,
        midX: (x1 + x2) / 2,
        midY: (y1 + y2) / 2,
        dashed: edge.sourceHandle === "no",
      });
    }
    return result;
  }, [workflow, offsetX, offsetY]);

  return (
    <div className="flex h-full">
      {/* Canvas area */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-auto bg-[var(--muted)]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-canvas-bg]")) {
            setSelectedNodeId(null);
          }
        }}
      >
        <div
          data-canvas-bg
          className="relative origin-top-left"
          style={{
            width: canvasW * zoom,
            height: canvasH * zoom,
            minHeight: "100%",
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Actual content at natural scale */}
          <div style={{ width: canvasW, height: canvasH }}>
            {/* SVG edges */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: canvasW, height: canvasH }}>
              {edgeElements.map((edge) => (
                <EdgePath key={edge.id} x1={edge.x1} y1={edge.y1} x2={edge.x2} y2={edge.y2} dashed={edge.dashed} />
              ))}
            </svg>

            {/* Add node buttons on edges */}
            {edgeElements.map((edge) => (
              <AddNodeButton
                key={`add-${edge.id}`}
                x={edge.midX}
                y={edge.midY}
                onAdd={(type) => addNodeOnEdge(edge.id, type)}
              />
            ))}

            {/* Nodes */}
            {workflow.nodes.map((node) => (
              <WorkflowNodeCard
                key={node.id}
                node={{ ...node, position: { x: node.position.x + offsetX, y: node.position.y + offsetY } }}
                selected={selectedNodeId === node.id}
                onSelect={() => setSelectedNodeId(node.id)}
                onDragStart={(e) => handleNodeDragStart(node.id, e)}
              />
            ))}
          </div>
        </div>

        {/* Canvas toolbar */}
        <CanvasToolbar
          onOrganize={handleOrganize}
          onFitView={handleFitView}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </div>

      {/* Config panel */}
      {selectedNode && (
        <div className="w-[320px] shrink-0">
          <NodeConfigPanel
            node={selectedNode}
            emails={emails}
            lists={lists}
            emailNodes={emailNodes}
            onUpdate={updateNodeData}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      )}
    </div>
  );
}
