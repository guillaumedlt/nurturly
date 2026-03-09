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
  Split,
  Hourglass,
  Webhook,
  CornerDownRight,
  Settings2,
  X,
  Target,
  Globe,
  CircleAlert,
  Undo2,
  Redo2,
  Copy,
  FileText,
  Users,
  Activity,
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
  ABSplitNodeData,
  WaitForEventNodeData,
  WebhookNodeData,
  GotoNodeData,
  WorkflowNodeData,
  GoalCondition,
  SendTimeWindow,
  NodeValidationError,
  WorkflowTemplate,
} from "@/lib/sequences/types";
import { NODE_META, validateWorkflow, WORKFLOW_TEMPLATES } from "@/lib/sequences/types";

/* ─── Undo/Redo History ─── */
const MAX_HISTORY = 50;

function useUndoRedo(initial: WorkflowDefinition, onChange: (w: WorkflowDefinition) => void) {
  const [history, setHistory] = useState<WorkflowDefinition[]>([initial]);
  const [index, setIndex] = useState(0);
  const skipNextRef = useRef(false);

  const push = useCallback((w: WorkflowDefinition) => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      onChange(w);
      return;
    }
    setHistory((prev) => {
      const newHistory = prev.slice(0, index + 1);
      newHistory.push(w);
      if (newHistory.length > MAX_HISTORY) newHistory.shift();
      return newHistory;
    });
    setIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    onChange(w);
  }, [index, onChange]);

  const undo = useCallback(() => {
    if (index <= 0) return;
    const newIndex = index - 1;
    setIndex(newIndex);
    skipNextRef.current = true;
    onChange(history[newIndex]);
  }, [index, history, onChange]);

  const redo = useCallback(() => {
    if (index >= history.length - 1) return;
    const newIndex = index + 1;
    setIndex(newIndex);
    skipNextRef.current = true;
    onChange(history[newIndex]);
  }, [index, history, onChange]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  // Sync when external changes come in (e.g. initial load)
  useEffect(() => {
    if (history.length === 1 && JSON.stringify(history[0]) !== JSON.stringify(initial)) {
      setHistory([initial]);
      setIndex(0);
    }
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  return { push, undo, redo, canUndo, canRedo };
}

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
  ab_split: Split,
  wait_for_event: Hourglass,
  webhook: Webhook,
  goto: CornerDownRight,
  end: CircleStop,
};

/* ─── Add Node Menu Items ─── */
const ADD_NODE_OPTIONS: { type: WorkflowNodeType; label: string; description: string; category: string }[] = [
  { type: "email", label: "Send Email", description: "Send an email template", category: "Actions" },
  { type: "delay", label: "Wait", description: "Wait for a duration", category: "Timing" },
  { type: "condition", label: "Condition", description: "Branch based on behavior", category: "Logic" },
  { type: "action", label: "Action", description: "Tag, move to list, etc.", category: "Actions" },
  { type: "ab_split", label: "A/B Split", description: "Split traffic to test variants", category: "Logic" },
  { type: "wait_for_event", label: "Wait for Event", description: "Wait until contact acts", category: "Timing" },
  { type: "webhook", label: "Webhook", description: "Call an external API", category: "Actions" },
  { type: "goto", label: "Go to", description: "Loop back to a previous step", category: "Logic" },
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
    const isBranching = node.type === "condition" || node.type === "ab_split" || node.type === "wait_for_event";

    if (kids.length === 0) {
      // Leaf node
      positions[nodeId] = { x: 0, y: depth * (NODE_HEIGHT + V_GAP) };
      return NODE_WIDTH;
    }

    if (isBranching && kids.length === 2) {
      // Sort: left branch first (yes/a/default on left, no/b/timeout on right)
      const leftHandles = ["yes", "a", "default"];
      const sorted = [...kids].sort((a, b) => {
        if (leftHandles.includes(a.handle || "")) return -1;
        if (leftHandles.includes(b.handle || "")) return 1;
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

/* ─── SVG Edge Path with animated flow dot ─── */
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

  const pathId = `edge-${x1}-${y1}-${x2}-${y2}`;

  return (
    <g>
      <path
        id={pathId}
        d={d}
        fill="none"
        stroke="var(--border)"
        strokeWidth={2}
        strokeDasharray={dashed ? "6 4" : undefined}
        className="transition-colors"
      />
      {/* Animated flow dot */}
      <circle r="3" fill="var(--muted-foreground)" opacity="0.4">
        <animateMotion dur="3s" repeatCount="indefinite" path={d} />
      </circle>
    </g>
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
      data-add-btn
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
        <div className="absolute left-1/2 top-8 z-30 w-56 -translate-x-1/2 rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150">
          {["Actions", "Timing", "Logic"].map((cat) => {
            const items = ADD_NODE_OPTIONS.filter((o) => o.category === cat);
            return (
              <div key={cat}>
                <p className="px-2.5 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60">{cat}</p>
                {items.map((opt) => {
                  const Icon = NODE_ICONS[opt.type];
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => { onAdd(opt.type); setOpen(false); }}
                      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
                    >
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: NODE_META[opt.type].color + "18", color: NODE_META[opt.type].color }}
                      >
                        <Icon className="h-3 w-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-foreground">{opt.label}</p>
                        <p className="truncate text-[10px] text-muted-foreground">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
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
    case "ab_split": {
      const d = node.data as ABSplitNodeData;
      return `${d.splitA || 50}% / ${d.splitB || 50}%`;
    }
    case "wait_for_event": {
      const d = node.data as WaitForEventNodeData;
      const events: Record<string, string> = {
        email_opened: "Email opened",
        email_clicked: "Email clicked",
        link_clicked: "Link clicked",
        tag_added: "Tag added",
        list_joined: "Joined list",
        reply_received: "Reply received",
      };
      const label = events[d.eventType] || "Set event";
      const timeout = d.timeoutDuration ? ` (${d.timeoutDuration}${d.timeoutUnit?.[0] || "d"} timeout)` : "";
      return label + timeout;
    }
    case "webhook": {
      const d = node.data as WebhookNodeData;
      return d.description || d.url || "Configure webhook";
    }
    case "goto": {
      const d = node.data as GotoNodeData;
      return d.targetNodeLabel ? `Go to "${d.targetNodeLabel}"` : "Select target step";
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
  node, emails, lists, emailNodes, allNodes, onUpdate, onDelete, onClose,
}: {
  node: WorkflowNode;
  emails: { id: string; name: string }[];
  lists: { id: string; name: string }[];
  emailNodes: { id: string; name: string }[];
  allNodes: WorkflowNode[];
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
        {node.type === "ab_split" && <ABSplitConfig data={node.data as ABSplitNodeData} onUpdate={onUpdate} />}
        {node.type === "wait_for_event" && <WaitForEventConfig data={node.data as WaitForEventNodeData} emailNodes={emailNodes} lists={lists} onUpdate={onUpdate} />}
        {node.type === "webhook" && <WebhookConfig data={node.data as WebhookNodeData} onUpdate={onUpdate} />}
        {node.type === "goto" && <GotoConfig data={node.data as GotoNodeData} allNodes={allNodes} onUpdate={onUpdate} />}
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

/* ─── A/B Split Config ─── */
function ABSplitConfig({ data, onUpdate }: {
  data: ABSplitNodeData; onUpdate: (d: WorkflowNodeData) => void;
}) {
  const presets = [
    { a: 50, b: 50, label: "50/50" },
    { a: 70, b: 30, label: "70/30" },
    { a: 80, b: 20, label: "80/20" },
    { a: 90, b: 10, label: "90/10" },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Traffic split</label>
        <div className="flex gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onUpdate({ ...data, splitA: p.a, splitB: p.b })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                data.splitA === p.a
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
              <span>Path A</span>
              <span>{data.splitA || 50}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              value={data.splitA || 50}
              onChange={(e) => {
                const a = parseInt(e.target.value);
                onUpdate({ ...data, splitA: a, splitB: 100 - a });
              }}
              className="w-full accent-foreground"
            />
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Path A label</label>
        <input
          type="text"
          value={data.labelA || ""}
          onChange={(e) => onUpdate({ ...data, labelA: e.target.value })}
          placeholder="e.g. Short subject line"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Path B label</label>
        <input
          type="text"
          value={data.labelB || ""}
          onChange={(e) => onUpdate({ ...data, labelB: e.target.value })}
          placeholder="e.g. Long subject line"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Contacts will be randomly assigned to Path A or Path B based on the split percentage. Use this to test different email content or timing strategies.
      </p>
    </div>
  );
}

/* ─── Wait for Event Config ─── */
function WaitForEventConfig({ data, emailNodes, lists, onUpdate }: {
  data: WaitForEventNodeData;
  emailNodes: { id: string; name: string }[];
  lists: { id: string; name: string }[];
  onUpdate: (d: WorkflowNodeData) => void;
}) {
  const events = [
    { value: "email_opened", label: "Email was opened" },
    { value: "email_clicked", label: "Email was clicked" },
    { value: "link_clicked", label: "Specific link clicked" },
    { value: "tag_added", label: "Tag was added" },
    { value: "list_joined", label: "Joined an audience" },
    { value: "reply_received", label: "Reply received" },
  ];
  const timeUnits = [
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
    { value: "weeks", label: "Weeks" },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Wait until</label>
        <div className="flex flex-col gap-1">
          {events.map((ev) => (
            <button
              key={ev.value}
              type="button"
              onClick={() => onUpdate({ ...data, eventType: ev.value as WaitForEventNodeData["eventType"] })}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-[12px] transition-colors ${
                data.eventType === ev.value
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {data.eventType === ev.value && <Check className="h-3 w-3" />}
              {ev.label}
            </button>
          ))}
        </div>
      </div>

      {(data.eventType === "email_opened" || data.eventType === "email_clicked") && emailNodes.length > 0 && (
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

      {data.eventType === "link_clicked" && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">Link URL</label>
          <input
            type="text"
            value={data.linkUrl || ""}
            onChange={(e) => onUpdate({ ...data, linkUrl: e.target.value })}
            placeholder="https://..."
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
      )}

      {data.eventType === "tag_added" && (
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">Tag name</label>
          <input
            type="text"
            value={data.tagName || ""}
            onChange={(e) => onUpdate({ ...data, tagName: e.target.value })}
            placeholder="e.g. purchased"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
          />
        </div>
      )}

      {data.eventType === "list_joined" && (
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

      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Timeout (if event doesn&apos;t happen)</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={data.timeoutDuration || ""}
            onChange={(e) => onUpdate({ ...data, timeoutDuration: parseInt(e.target.value) || 0 })}
            placeholder="3"
            className="h-9 w-20 rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
          />
          <div className="flex items-center gap-1">
            {timeUnits.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => onUpdate({ ...data, timeoutUnit: u.value as WaitForEventNodeData["timeoutUnit"] })}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  data.timeoutUnit === u.value
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

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        If the event occurs, contacts continue down the <span className="text-cyan-600 font-medium">EVENT</span> path. If the timeout is reached, they go down the <span className="text-amber-600 font-medium">TIMEOUT</span> path.
      </p>
    </div>
  );
}

/* ─── Webhook Config ─── */
function WebhookConfig({ data, onUpdate }: {
  data: WebhookNodeData; onUpdate: (d: WorkflowNodeData) => void;
}) {
  const methods = ["GET", "POST", "PUT"] as const;
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Description</label>
        <input
          type="text"
          value={data.description || ""}
          onChange={(e) => onUpdate({ ...data, description: e.target.value })}
          placeholder="e.g. Notify CRM"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Method</label>
        <div className="flex items-center gap-1">
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onUpdate({ ...data, method: m })}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                data.method === m
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">URL</label>
        <input
          type="text"
          value={data.url || ""}
          onChange={(e) => onUpdate({ ...data, url: e.target.value })}
          placeholder="https://api.example.com/webhook"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Custom headers (JSON)</label>
        <textarea
          value={data.headers || ""}
          onChange={(e) => onUpdate({ ...data, headers: e.target.value })}
          placeholder='{"Authorization": "Bearer ..."}'
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-[12px] font-mono outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50 resize-none"
        />
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        The request body will include the contact&apos;s email, name, tags, and custom fields.
      </p>
    </div>
  );
}

/* ─── Goto Config ─── */
function GotoConfig({ data, allNodes, onUpdate }: {
  data: GotoNodeData; allNodes: WorkflowNode[]; onUpdate: (d: WorkflowNodeData) => void;
}) {
  const targetOptions = allNodes
    .filter((n) => n.type !== "end" && n.type !== "trigger" && n.type !== "goto")
    .map((n) => ({
      value: n.id,
      label: `${NODE_META[n.type].label}: ${getNodeSubtitle(n)}`,
    }));
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Go to step</label>
        <Dropdown
          value={data.targetNodeId || ""}
          onChange={(v) => {
            const target = allNodes.find((n) => n.id === v);
            onUpdate({ ...data, targetNodeId: v, targetNodeLabel: target ? NODE_META[target.type].label : undefined });
          }}
          options={targetOptions}
          placeholder="Select a step to jump to..."
          searchable
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-foreground">Max loops per contact</label>
        <input
          type="number"
          min={1}
          max={100}
          value={data.maxLoops || 3}
          onChange={(e) => onUpdate({ ...data, maxLoops: parseInt(e.target.value) || 3 })}
          className="h-9 w-20 rounded-md border border-input bg-background px-3 text-[13px] outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <p className="text-[11px] text-muted-foreground">
          After this many loops, the contact exits the sequence to prevent infinite loops.
        </p>
      </div>
    </div>
  );
}

/* ─── Sequence Settings Panel ─── */
function SequenceSettingsPanel({
  goals, sendTimeWindow, onUpdateGoals, onUpdateSendTime, onClose,
}: {
  goals: GoalCondition[];
  sendTimeWindow: SendTimeWindow;
  onUpdateGoals: (goals: GoalCondition[]) => void;
  onUpdateSendTime: (stw: SendTimeWindow) => void;
  onClose: () => void;
}) {
  const goalTypes = [
    { value: "tag_added", label: "Tag added" },
    { value: "list_joined", label: "Joined audience" },
    { value: "email_replied", label: "Email replied" },
    { value: "link_clicked", label: "Link clicked" },
  ];

  const timezones = [
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
    "Australia/Sydney",
  ];

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
            <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[13px] font-medium text-foreground">Sequence Settings</span>
        </div>
        <button type="button" onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground">
          Done
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ── Goals ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">Goal Conditions</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            When a contact meets any goal, they automatically exit the sequence. Use this for conversion events.
          </p>

          {goals.map((goal, i) => (
            <div key={i} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Dropdown
                  value={goal.type}
                  onChange={(v) => {
                    const updated = [...goals];
                    updated[i] = { ...goal, type: v as GoalCondition["type"] };
                    onUpdateGoals(updated);
                  }}
                  options={goalTypes.map((g) => ({ value: g.value, label: g.label }))}
                  placeholder="Select goal..."
                />
                <button
                  type="button"
                  onClick={() => onUpdateGoals(goals.filter((_, j) => j !== i))}
                  className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {goal.type === "tag_added" && (
                <input
                  type="text"
                  value={goal.tagName || ""}
                  onChange={(e) => {
                    const updated = [...goals];
                    updated[i] = { ...goal, tagName: e.target.value };
                    onUpdateGoals(updated);
                  }}
                  placeholder="Tag name..."
                  className="h-8 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-ring"
                />
              )}
              {goal.type === "link_clicked" && (
                <input
                  type="text"
                  value={goal.linkUrl || ""}
                  onChange={(e) => {
                    const updated = [...goals];
                    updated[i] = { ...goal, linkUrl: e.target.value };
                    onUpdateGoals(updated);
                  }}
                  placeholder="https://..."
                  className="h-8 w-full rounded-md border border-input bg-background px-3 text-[12px] outline-none focus:border-ring"
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => onUpdateGoals([...goals, { type: "tag_added" }])}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-[12px] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <Plus className="h-3 w-3" />
            Add goal
          </button>
        </div>

        {/* ── Send time window ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-semibold text-foreground">Send Time Window</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Only send emails during specific hours. Emails scheduled outside this window will be held until the next available time.
          </p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendTimeWindow.enabled}
              onChange={(e) => onUpdateSendTime({ ...sendTimeWindow, enabled: e.target.checked })}
              className="rounded accent-foreground"
            />
            <span className="text-[12px] text-foreground">Enable send window</span>
          </label>

          {sendTimeWindow.enabled && (
            <div className="space-y-3 pl-1">
              <div className="flex items-center gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">From</label>
                  <select
                    value={sendTimeWindow.startHour}
                    onChange={(e) => onUpdateSendTime({ ...sendTimeWindow, startHour: parseInt(e.target.value) })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-[12px] outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{`${i.toString().padStart(2, "0")}:00`}</option>
                    ))}
                  </select>
                </div>
                <span className="mt-4 text-[12px] text-muted-foreground">to</span>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">To</label>
                  <select
                    value={sendTimeWindow.endHour}
                    onChange={(e) => onUpdateSendTime({ ...sendTimeWindow, endHour: parseInt(e.target.value) })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-[12px] outline-none"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{`${i.toString().padStart(2, "0")}:00`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">Timezone</label>
                <Dropdown
                  value={sendTimeWindow.timezone}
                  onChange={(v) => onUpdateSendTime({ ...sendTimeWindow, timezone: v })}
                  options={timezones.map((tz) => ({ value: tz, label: tz.replace(/_/g, " ") }))}
                  placeholder="Select timezone..."
                  searchable
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendTimeWindow.skipWeekends}
                  onChange={(e) => onUpdateSendTime({ ...sendTimeWindow, skipWeekends: e.target.checked })}
                  className="rounded accent-foreground"
                />
                <span className="text-[12px] text-foreground">Skip weekends</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Workflow Node Component ─── */
function WorkflowNodeCard({
  node, selected, onSelect, onDragStart, error, onDuplicate, onContextMenu,
}: {
  node: WorkflowNode;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  error?: string;
  onDuplicate?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = NODE_ICONS[node.type];
  const subtitle = getNodeSubtitle(node);
  const isCondition = node.type === "condition";
  const isBranching = isCondition || node.type === "ab_split" || node.type === "wait_for_event";
  const height = isBranching ? CONDITION_HEIGHT : NODE_HEIGHT;

  return (
    <div
      data-node-card
      className={`absolute select-none transition-all duration-200 ${selected ? "z-10" : "z-0"}`}
      style={{
        left: node.position.x - NODE_WIDTH / 2,
        top: node.position.y - height / 2,
        width: NODE_WIDTH,
      }}
    >
      <div
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu?.(e); }}
        className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-background px-4 transition-all ${
          error
            ? "border-red-400 shadow-red-100"
            : selected
              ? "border-foreground shadow-lg"
              : "border-border hover:border-muted-foreground/50 hover:shadow-md"
        }`}
        style={{ height }}
      >
        {/* Drag handle + Duplicate */}
        {node.type !== "trigger" && node.type !== "end" && (
          <div className="absolute -left-7 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center">
            <div
              onMouseDown={onDragStart}
              className="flex h-5 w-5 cursor-grab items-center justify-center rounded-md text-muted-foreground/0 transition-all group-hover:text-muted-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            {onDuplicate && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/0 transition-all group-hover:text-muted-foreground hover:!text-foreground"
                title="Duplicate"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        {node.type !== "trigger" && node.type !== "end" && !onDuplicate && (
          <div
            onMouseDown={onDragStart}
            className="absolute -left-7 top-1/2 -translate-y-1/2 flex h-5 w-5 cursor-grab items-center justify-center rounded-md text-muted-foreground/0 transition-all group-hover:text-muted-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Error indicator */}
        {error && (
          <div className="absolute -top-2 -right-2 z-10" title={error}>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">
              <CircleAlert className="h-3 w-3" />
            </div>
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
          <p className={`truncate text-[11px] ${error ? "text-red-500" : "text-muted-foreground"}`}>{error || subtitle}</p>
        </div>

        {/* Branch labels */}
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
        {node.type === "ab_split" && (
          <>
            <div className="absolute -bottom-5 left-[25%] -translate-x-1/2 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600">
              A ({(node.data as ABSplitNodeData).splitA || 50}%)
            </div>
            <div className="absolute -bottom-5 left-[75%] -translate-x-1/2 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600">
              B ({(node.data as ABSplitNodeData).splitB || 50}%)
            </div>
          </>
        )}
        {node.type === "wait_for_event" && (
          <>
            <div className="absolute -bottom-5 left-[25%] -translate-x-1/2 rounded-full bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-600">
              EVENT
            </div>
            <div className="absolute -bottom-5 left-[75%] -translate-x-1/2 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
              TIMEOUT
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Floating Canvas Toolbar ─── */
function CanvasToolbar({
  onOrganize, onFitView, zoom, onZoomIn, onZoomOut, onSettings,
  onUndo, onRedo, canUndo, canRedo, onTemplates, errorCount,
}: {
  onOrganize: () => void;
  onFitView: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onTemplates: () => void;
  errorCount: number;
}) {
  return (
    <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1 rounded-lg border border-border bg-background p-1 shadow-sm">
      {/* Undo/Redo */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Cmd+Z)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Cmd+Shift+Z)"
        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />

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
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onTemplates}
        title="Workflow templates"
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <FileText className="h-3.5 w-3.5" />
        Templates
      </button>
      <div className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onSettings}
        title="Sequence settings"
        className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Settings2 className="h-3.5 w-3.5" />
        Settings
      </button>
      {errorCount > 0 && (
        <>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <div className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-red-500">
            <CircleAlert className="h-3.5 w-3.5" />
            {errorCount} {errorCount === 1 ? "issue" : "issues"}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Template Picker Panel ─── */
function TemplatePicker({
  onSelect, onClose,
}: {
  onSelect: (template: WorkflowTemplate) => void;
  onClose: () => void;
}) {
  const categories = [
    { id: "welcome", label: "Welcome", icon: Mail },
    { id: "nurture", label: "Nurture", icon: Activity },
    { id: "reengagement", label: "Re-engagement", icon: Undo2 },
    { id: "onboarding", label: "Onboarding", icon: Users },
    { id: "sales", label: "Sales", icon: Target },
  ];

  return (
    <div className="flex h-full flex-col border-l border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[13px] font-medium text-foreground">Templates</span>
        </div>
        <button type="button" onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Start with a pre-built workflow. This will replace your current workflow.
        </p>

        {categories.map((cat) => {
          const templates = WORKFLOW_TEMPLATES.filter((t) => t.category === cat.id);
          if (templates.length === 0) return null;
          const CatIcon = cat.icon;
          return (
            <div key={cat.id} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <CatIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{cat.label}</span>
              </div>
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => onSelect(tmpl)}
                  className="flex w-full flex-col gap-0.5 rounded-lg border border-border p-3 text-left transition-all hover:border-foreground/30 hover:shadow-sm"
                >
                  <span className="text-[13px] font-medium text-foreground">{tmpl.name}</span>
                  <span className="text-[11px] text-muted-foreground">{tmpl.description}</span>
                  <span className="mt-1 text-[10px] text-muted-foreground/60">{tmpl.workflow.nodes.length} nodes</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Stats Bar ─── */
function StatsBar({ nodeCount, emailCount, branchCount }: {
  nodeCount: number;
  emailCount: number;
  branchCount: number;
}) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 rounded-lg border border-border bg-background/95 backdrop-blur-sm px-4 py-1.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{nodeCount} steps</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <Mail className="h-3 w-3 text-blue-500" />
        <span className="text-[11px] text-muted-foreground">{emailCount} emails</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center gap-1.5">
        <GitBranch className="h-3 w-3 text-purple-500" />
        <span className="text-[11px] text-muted-foreground">{branchCount} branches</span>
      </div>
    </div>
  );
}

/* ─── Minimap ─── */
function Minimap({
  nodes, edges, canvasW, canvasH, offsetX, offsetY, zoom,
  containerRef,
}: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  canvasW: number;
  canvasH: number;
  offsetX: number;
  offsetY: number;
  zoom: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const MINIMAP_W = 180;
  const MINIMAP_H = 120;

  if (nodes.length === 0) return null;

  const scale = Math.min(MINIMAP_W / canvasW, MINIMAP_H / canvasH);

  // Viewport rect
  const container = containerRef.current;
  const vpX = container ? (container.scrollLeft / zoom) * scale : 0;
  const vpY = container ? (container.scrollTop / zoom) * scale : 0;
  const vpW = container ? (container.clientWidth / zoom) * scale : MINIMAP_W;
  const vpH = container ? (container.clientHeight / zoom) * scale : MINIMAP_H;

  const handleClick = (e: React.MouseEvent) => {
    if (!container) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / scale;
    const clickY = (e.clientY - rect.top) / scale;
    container.scrollLeft = (clickX - container.clientWidth / zoom / 2) * zoom;
    container.scrollTop = (clickY - container.clientHeight / zoom / 2) * zoom;
  };

  return (
    <div
      className="absolute bottom-4 right-4 z-30 cursor-pointer rounded-lg border border-border bg-background/90 backdrop-blur-sm shadow-sm overflow-hidden"
      style={{ width: MINIMAP_W, height: MINIMAP_H }}
      onClick={handleClick}
    >
      <svg width={MINIMAP_W} height={MINIMAP_H}>
        {/* Edges */}
        {edges.map((edge) => {
          const src = nodes.find((n) => n.id === edge.source);
          const tgt = nodes.find((n) => n.id === edge.target);
          if (!src || !tgt) return null;
          return (
            <line
              key={edge.id}
              x1={(src.position.x + offsetX) * scale}
              y1={(src.position.y + offsetY) * scale}
              x2={(tgt.position.x + offsetX) * scale}
              y2={(tgt.position.y + offsetY) * scale}
              stroke="var(--border)"
              strokeWidth={1}
            />
          );
        })}
        {/* Nodes */}
        {nodes.map((node) => {
          const meta = NODE_META[node.type];
          return (
            <rect
              key={node.id}
              x={(node.position.x + offsetX) * scale - 4}
              y={(node.position.y + offsetY) * scale - 2}
              width={8}
              height={4}
              rx={1}
              fill={meta.color}
              opacity={0.7}
            />
          );
        })}
        {/* Viewport rect */}
        <rect
          x={vpX}
          y={vpY}
          width={Math.min(vpW, MINIMAP_W)}
          height={Math.min(vpH, MINIMAP_H)}
          fill="var(--foreground)"
          fillOpacity={0.06}
          stroke="var(--foreground)"
          strokeOpacity={0.3}
          strokeWidth={1}
          rx={2}
        />
      </svg>
    </div>
  );
}

/* ─── Context Menu (right-click on node) ─── */
function NodeContextMenu({
  x, y, node, onEdit, onDuplicate, onDelete, onClose,
}: {
  x: number;
  y: number;
  node: WorkflowNode;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const isTrigger = node.type === "trigger";
  const isEnd = node.type === "end";

  return (
    <div
      ref={ref}
      className="fixed z-50 w-44 rounded-lg border border-border bg-background p-1 shadow-lg animate-in fade-in slide-in-from-top-1 duration-100"
      style={{ left: x, top: y }}
    >
      <button
        onClick={onEdit}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-foreground transition-colors hover:bg-accent"
      >
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        Edit
      </button>
      {!isTrigger && !isEnd && (
        <button
          onClick={onDuplicate}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-foreground transition-colors hover:bg-accent"
        >
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          Duplicate
        </button>
      )}
      {!isTrigger && (
        <button
          onClick={onDelete}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      )}
    </div>
  );
}

/* ─── Main Workflow Builder ─── */
interface WorkflowBuilderProps {
  workflow: WorkflowDefinition;
  onChange: (workflow: WorkflowDefinition) => void;
  emails: { id: string; name: string }[];
  lists: { id: string; name: string }[];
  stats?: { enrolled: number; active: number; completed: number };
}

export function WorkflowBuilder({ workflow, onChange, emails, lists }: WorkflowBuilderProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null);
  const initializedRef = useRef(false);
  const [minimapKey, setMinimapKey] = useState(0);

  const selectedNode = workflow.nodes.find((n) => n.id === selectedNodeId) ?? null;

  // ─── Undo/Redo ───
  const { push: pushHistory, undo, redo, canUndo, canRedo } = useUndoRedo(workflow, onChange);

  // ─── Validation ───
  const validationErrors = useMemo(() => validateWorkflow(workflow), [workflow]);
  const errorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const err of validationErrors) map[err.nodeId] = err.message;
    return map;
  }, [validationErrors]);

  // ─── Stats ───
  const nodeCount = workflow.nodes.filter((n) => n.type !== "trigger" && n.type !== "end").length;
  const emailCount = workflow.nodes.filter((n) => n.type === "email").length;
  const branchCount = workflow.nodes.filter((n) =>
    n.type === "condition" || n.type === "ab_split" || n.type === "wait_for_event"
  ).length;

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
    pushHistory(organized);

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
  }, [workflow, pushHistory, zoom]);

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

  // ─── Scroll listener for minimap viewport update ───
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    const handler = () => setMinimapKey((k) => k + 1);
    container.addEventListener("scroll", handler, { passive: true });
    return () => container.removeEventListener("scroll", handler);
  }, []);

  // ─── Canvas panning (Figma-style drag to pan) ───
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan on left-click on the canvas background itself
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't pan if clicking on a node, button, or interactive element
    if (target.closest("[data-node-card]") || target.closest("button") || target.closest("[data-add-btn]")) return;

    const container = canvasRef.current;
    if (!container) return;

    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    setIsPanning(true);

    const onMouseMove = (ev: MouseEvent) => {
      if (!panRef.current || !canvasRef.current) return;
      const dx = ev.clientX - panRef.current.startX;
      const dy = ev.clientY - panRef.current.startY;
      canvasRef.current.scrollLeft = panRef.current.scrollLeft - dx;
      canvasRef.current.scrollTop = panRef.current.scrollTop - dy;
    };

    const onMouseUp = (ev: MouseEvent) => {
      const wasDragging = panRef.current && (
        Math.abs(ev.clientX - panRef.current.startX) > 3 ||
        Math.abs(ev.clientY - panRef.current.startY) > 3
      );
      panRef.current = null;
      setIsPanning(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      // If we actually panned, don't deselect
      if (!wasDragging) {
        setSelectedNodeId(null);
        setContextMenu(null);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    // Don't deselect yet — wait for mouseup to decide
    e.preventDefault();
  }, []);

  // ─── Undo/Redo keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Delete key to remove selected node
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        deleteNode(selectedNodeId);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo, selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        case "ab_split": data = { splitA: 50, splitB: 50 } as ABSplitNodeData; break;
        case "wait_for_event": data = { eventType: "email_opened", timeoutDuration: 3, timeoutUnit: "days" } as WaitForEventNodeData; break;
        case "webhook": data = { method: "POST" } as WebhookNodeData; break;
        case "goto": data = { maxLoops: 3 } as GotoNodeData; break;
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
      } else if (type === "ab_split") {
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
            { id: genId("e"), source: newId, target: edge.target, sourceHandle: "a" },
            { id: genId("e"), source: newId, target: endId, sourceHandle: "b" },
          ]);
      } else if (type === "wait_for_event") {
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
            { id: genId("e"), source: newId, target: edge.target, sourceHandle: "default" },
            { id: genId("e"), source: newId, target: endId, sourceHandle: "timeout" },
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
      pushHistory(autoLayoutWorkflow(newWorkflow));
      setSelectedNodeId(newId);
    },
    [workflow, pushHistory]
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
      if (node.type === "condition" || node.type === "ab_split" || node.type === "wait_for_event") {
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
      pushHistory(autoLayoutWorkflow(result));
      setSelectedNodeId(null);
    },
    [workflow, pushHistory]
  );

  // ─── Duplicate node ───
  const duplicateNode = useCallback(
    (nodeId: string) => {
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node || node.type === "trigger" || node.type === "end") return;

      // Find the edge going OUT of this node (first one)
      const outEdge = workflow.edges.find((e) => e.source === nodeId);
      if (!outEdge) return;

      const newId = genId(node.type);
      const newNode: WorkflowNode = {
        id: newId,
        type: node.type,
        position: { x: node.position.x, y: node.position.y + NODE_HEIGHT + V_GAP },
        data: { ...node.data },
      };

      // Insert between this node and its target
      const newEdges = workflow.edges
        .filter((e) => e.id !== outEdge.id)
        .concat([
          { id: genId("e"), source: nodeId, target: newId, sourceHandle: outEdge.sourceHandle },
          { id: genId("e"), source: newId, target: outEdge.target },
        ]);

      const newWorkflow = { ...workflow, nodes: [...workflow.nodes, newNode], edges: newEdges };
      pushHistory(autoLayoutWorkflow(newWorkflow));
      setSelectedNodeId(newId);
    },
    [workflow, pushHistory]
  );

  // ─── Update node data ───
  const updateNodeData = useCallback(
    (data: WorkflowNodeData) => {
      if (!selectedNodeId) return;
      pushHistory({
        ...workflow,
        nodes: workflow.nodes.map((n) => n.id === selectedNodeId ? { ...n, data } : n),
      });
    },
    [workflow, pushHistory, selectedNodeId]
  );

  // ─── Apply template ───
  const applyTemplate = useCallback(
    (template: WorkflowTemplate) => {
      pushHistory(autoLayoutWorkflow(template.workflow));
      setShowTemplates(false);
      setSelectedNodeId(null);

      // Re-center
      requestAnimationFrame(() => {
        if (!canvasRef.current) return;
        const trigger = template.workflow.nodes.find((n) => n.type === "trigger");
        if (!trigger) return;
        canvasRef.current.scrollLeft = 0;
        canvasRef.current.scrollTop = 0;
      });
    },
    [pushHistory]
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

      const isBranching = source.type === "condition" || source.type === "ab_split" || source.type === "wait_for_event";
      const sourceH = isBranching ? CONDITION_HEIGHT : NODE_HEIGHT;

      let x1 = source.position.x + offsetX;
      if (isBranching) {
        const isLeft = edge.sourceHandle === "yes" || edge.sourceHandle === "a" || edge.sourceHandle === "default";
        const isRight = edge.sourceHandle === "no" || edge.sourceHandle === "b" || edge.sourceHandle === "timeout";
        if (isLeft) {
          x1 = source.position.x + offsetX - NODE_WIDTH / 4;
        } else if (isRight) {
          x1 = source.position.x + offsetX + NODE_WIDTH / 4;
        }
      }

      const y1 = source.position.y + offsetY + sourceH / 2;
      const targetH = target.type === "condition" ? CONDITION_HEIGHT : NODE_HEIGHT;
      const x2 = target.position.x + offsetX;
      const y2 = target.position.y + offsetY - targetH / 2;

      result.push({
        id: edge.id, x1, y1, x2, y2,
        midX: (x1 + x2) / 2,
        midY: (y1 + y2) / 2,
        dashed: edge.sourceHandle === "no" || edge.sourceHandle === "b" || edge.sourceHandle === "timeout",
      });
    }
    return result;
  }, [workflow, offsetX, offsetY]);

  return (
    <div className="flex h-full">
      {/* Canvas area */}
      <div
        ref={canvasRef}
        className={`relative flex-1 overflow-auto bg-[var(--muted)] ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        }}
        onMouseDown={handleCanvasMouseDown}
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
                onSelect={() => { setSelectedNodeId(node.id); setShowSettings(false); setShowTemplates(false); setContextMenu(null); }}
                onDragStart={(e) => handleNodeDragStart(node.id, e)}
                error={errorMap[node.id]}
                onDuplicate={node.type !== "trigger" && node.type !== "end" ? () => duplicateNode(node.id) : undefined}
                onContextMenu={(e) => {
                  setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
                  setSelectedNodeId(node.id);
                }}
              />
            ))}
          </div>
        </div>

        {/* Stats bar */}
        {nodeCount > 0 && (
          <StatsBar nodeCount={nodeCount} emailCount={emailCount} branchCount={branchCount} />
        )}

        {/* Canvas toolbar */}
        <CanvasToolbar
          onOrganize={handleOrganize}
          onFitView={handleFitView}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onSettings={() => { setShowSettings(!showSettings); setSelectedNodeId(null); setShowTemplates(false); }}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onTemplates={() => { setShowTemplates(!showTemplates); setSelectedNodeId(null); setShowSettings(false); }}
          errorCount={validationErrors.length}
        />

        {/* Minimap */}
        <Minimap
          key={minimapKey}
          nodes={workflow.nodes}
          edges={workflow.edges}
          canvasW={canvasW}
          canvasH={canvasH}
          offsetX={offsetX}
          offsetY={offsetY}
          zoom={zoom}
          containerRef={canvasRef}
        />
      </div>

      {/* Context menu */}
      {contextMenu && (() => {
        const ctxNode = workflow.nodes.find((n) => n.id === contextMenu.nodeId);
        if (!ctxNode) return null;
        return (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            node={ctxNode}
            onEdit={() => { setSelectedNodeId(contextMenu.nodeId); setContextMenu(null); }}
            onDuplicate={() => { duplicateNode(contextMenu.nodeId); setContextMenu(null); }}
            onDelete={() => { deleteNode(contextMenu.nodeId); setContextMenu(null); }}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}

      {/* Config panel */}
      {selectedNode && !showSettings && !showTemplates && (
        <div className="w-[320px] shrink-0">
          <NodeConfigPanel
            node={selectedNode}
            emails={emails}
            lists={lists}
            emailNodes={emailNodes}
            allNodes={workflow.nodes}
            onUpdate={updateNodeData}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelectedNodeId(null)}
          />
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="w-[320px] shrink-0">
          <SequenceSettingsPanel
            goals={workflow.goals || []}
            sendTimeWindow={workflow.sendTimeWindow || { enabled: false, startHour: 9, endHour: 17, timezone: "UTC", skipWeekends: false }}
            onUpdateGoals={(goals) => pushHistory({ ...workflow, goals })}
            onUpdateSendTime={(sendTimeWindow) => pushHistory({ ...workflow, sendTimeWindow })}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Templates panel */}
      {showTemplates && (
        <div className="w-[320px] shrink-0">
          <TemplatePicker
            onSelect={applyTemplate}
            onClose={() => setShowTemplates(false)}
          />
        </div>
      )}
    </div>
  );
}
