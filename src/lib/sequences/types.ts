// ── Workflow Node Types ──

export type WorkflowNodeType =
  | "trigger"
  | "email"
  | "delay"
  | "condition"
  | "action"
  | "end";

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

// ── Node Data (config per type) ──

export interface TriggerNodeData {
  triggerType: "manual" | "list_add" | "tag_add";
  listId?: string;
  listName?: string;
}

export interface EmailNodeData {
  emailId?: string;
  emailName?: string;
  subject?: string;
}

export interface DelayNodeData {
  duration: number;
  unit: "minutes" | "hours" | "days" | "weeks";
}

export interface ConditionNodeData {
  conditionType: "email_opened" | "email_clicked" | "email_not_opened" | "email_not_clicked" | "tag_has" | "custom";
  referenceNodeId?: string; // which email node to check
  referenceEmailName?: string;
  tagName?: string;
}

export interface ActionNodeData {
  actionType: "add_tag" | "remove_tag" | "move_to_list" | "remove_from_list" | "mark_completed";
  tagName?: string;
  listId?: string;
  listName?: string;
}

export type WorkflowNodeData =
  | TriggerNodeData
  | EmailNodeData
  | DelayNodeData
  | ConditionNodeData
  | ActionNodeData
  | Record<string, never>; // for "end" type

// ── Node ──

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  position: WorkflowNodePosition;
  data: WorkflowNodeData;
}

// ── Edge ──

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: "yes" | "no" | "default"; // for condition branches
}

// ── Full Workflow Definition ──

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// ── Default workflow for new sequences ──

export function createDefaultWorkflow(): WorkflowDefinition {
  return {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 0, y: 60 },
        data: { triggerType: "manual" } as TriggerNodeData,
      },
      {
        id: "end-1",
        type: "end",
        position: { x: 0, y: 232 },
        data: {},
      },
    ],
    edges: [
      { id: "e-trigger-end", source: "trigger-1", target: "end-1" },
    ],
  };
}

// ── Node display info ──

export const NODE_META: Record<WorkflowNodeType, { label: string; color: string }> = {
  trigger: { label: "Trigger", color: "#22c55e" },
  email: { label: "Send Email", color: "#3b82f6" },
  delay: { label: "Wait", color: "#f59e0b" },
  condition: { label: "Condition", color: "#8b5cf6" },
  action: { label: "Action", color: "#ec4899" },
  end: { label: "End", color: "#6b7280" },
};
