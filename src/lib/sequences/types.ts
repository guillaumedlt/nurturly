// ── Workflow Node Types ──

export type WorkflowNodeType =
  | "trigger"
  | "email"
  | "delay"
  | "condition"
  | "action"
  | "ab_split"
  | "wait_for_event"
  | "webhook"
  | "goto"
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

export interface ABSplitNodeData {
  splitA: number; // percentage for path A (0-100)
  splitB: number; // percentage for path B
  labelA?: string;
  labelB?: string;
}

export interface WaitForEventNodeData {
  eventType: "email_opened" | "email_clicked" | "link_clicked" | "tag_added" | "list_joined" | "reply_received";
  referenceNodeId?: string;
  referenceEmailName?: string;
  tagName?: string;
  listId?: string;
  listName?: string;
  linkUrl?: string;
  timeoutDuration: number;
  timeoutUnit: "hours" | "days" | "weeks";
}

export interface WebhookNodeData {
  url?: string;
  method: "GET" | "POST" | "PUT";
  headers?: string; // JSON string
  description?: string;
}

export interface GotoNodeData {
  targetNodeId?: string;
  targetNodeLabel?: string;
  maxLoops: number; // prevent infinite loops
}

export type WorkflowNodeData =
  | TriggerNodeData
  | EmailNodeData
  | DelayNodeData
  | ConditionNodeData
  | ActionNodeData
  | ABSplitNodeData
  | WaitForEventNodeData
  | WebhookNodeData
  | GotoNodeData
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
  sourceHandle?: "yes" | "no" | "default" | "a" | "b" | "timeout"; // for condition/split/wait branches
}

// ── Full Workflow Definition ──

export interface GoalCondition {
  type: "tag_added" | "list_joined" | "email_replied" | "link_clicked";
  tagName?: string;
  listId?: string;
  listName?: string;
  linkUrl?: string;
}

export interface SendTimeWindow {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string; // e.g. "Europe/Paris"
  skipWeekends: boolean;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  goals?: GoalCondition[];
  sendTimeWindow?: SendTimeWindow;
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
  ab_split: { label: "A/B Split", color: "#f97316" },
  wait_for_event: { label: "Wait for Event", color: "#06b6d4" },
  webhook: { label: "Webhook", color: "#64748b" },
  goto: { label: "Go to", color: "#a855f7" },
  end: { label: "End", color: "#6b7280" },
};

// ── Validation ──

export interface NodeValidationError {
  nodeId: string;
  message: string;
}

export function validateWorkflow(workflow: WorkflowDefinition): NodeValidationError[] {
  const errors: NodeValidationError[] = [];

  for (const node of workflow.nodes) {
    switch (node.type) {
      case "email": {
        const d = node.data as EmailNodeData;
        if (!d.emailId) errors.push({ nodeId: node.id, message: "No email template selected" });
        break;
      }
      case "delay": {
        const d = node.data as DelayNodeData;
        if (!d.duration || d.duration <= 0) errors.push({ nodeId: node.id, message: "Set a wait duration" });
        break;
      }
      case "condition": {
        const d = node.data as ConditionNodeData;
        const emailConditions = ["email_opened", "email_clicked", "email_not_opened", "email_not_clicked"];
        if (emailConditions.includes(d.conditionType) && !d.referenceNodeId)
          errors.push({ nodeId: node.id, message: "Select which email to check" });
        if (d.conditionType === "tag_has" && !d.tagName)
          errors.push({ nodeId: node.id, message: "Enter a tag name" });
        break;
      }
      case "action": {
        const d = node.data as ActionNodeData;
        if ((d.actionType === "add_tag" || d.actionType === "remove_tag") && !d.tagName)
          errors.push({ nodeId: node.id, message: "Enter a tag name" });
        if ((d.actionType === "move_to_list" || d.actionType === "remove_from_list") && !d.listId)
          errors.push({ nodeId: node.id, message: "Select an audience" });
        break;
      }
      case "wait_for_event": {
        const d = node.data as WaitForEventNodeData;
        if (!d.timeoutDuration || d.timeoutDuration <= 0)
          errors.push({ nodeId: node.id, message: "Set a timeout duration" });
        break;
      }
      case "webhook": {
        const d = node.data as WebhookNodeData;
        if (!d.url) errors.push({ nodeId: node.id, message: "Enter a webhook URL" });
        break;
      }
      case "goto": {
        const d = node.data as GotoNodeData;
        if (!d.targetNodeId) errors.push({ nodeId: node.id, message: "Select a target step" });
        break;
      }
      case "trigger": {
        const d = node.data as TriggerNodeData;
        if (d.triggerType === "list_add" && !d.listId)
          errors.push({ nodeId: node.id, message: "Select an audience" });
        break;
      }
    }
  }

  return errors;
}

// ── Workflow Templates ──

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "welcome" | "nurture" | "reengagement" | "onboarding" | "sales";
  workflow: WorkflowDefinition;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "welcome-series",
    name: "Welcome Series",
    description: "3-email welcome sequence with engagement check",
    category: "welcome",
    workflow: {
      nodes: [
        { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { triggerType: "list_add" } as TriggerNodeData },
        { id: "e1", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Welcome Email" } as EmailNodeData },
        { id: "d1", type: "delay", position: { x: 0, y: 0 }, data: { duration: 2, unit: "days" } as DelayNodeData },
        { id: "e2", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Getting Started" } as EmailNodeData },
        { id: "d2", type: "delay", position: { x: 0, y: 0 }, data: { duration: 3, unit: "days" } as DelayNodeData },
        { id: "c1", type: "condition", position: { x: 0, y: 0 }, data: { conditionType: "email_opened", referenceEmailName: "Welcome Email" } as ConditionNodeData },
        { id: "e3", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Feature Highlight" } as EmailNodeData },
        { id: "e4", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Re-engagement" } as EmailNodeData },
        { id: "a1", type: "action", position: { x: 0, y: 0 }, data: { actionType: "add_tag", tagName: "engaged" } as ActionNodeData },
        { id: "end1", type: "end", position: { x: 0, y: 0 }, data: {} },
        { id: "end2", type: "end", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e-1", source: "t1", target: "e1" },
        { id: "e-2", source: "e1", target: "d1" },
        { id: "e-3", source: "d1", target: "e2" },
        { id: "e-4", source: "e2", target: "d2" },
        { id: "e-5", source: "d2", target: "c1" },
        { id: "e-6", source: "c1", target: "e3", sourceHandle: "yes" },
        { id: "e-7", source: "c1", target: "e4", sourceHandle: "no" },
        { id: "e-8", source: "e3", target: "a1" },
        { id: "e-9", source: "a1", target: "end1" },
        { id: "e-10", source: "e4", target: "end2" },
      ],
    },
  },
  {
    id: "re-engagement",
    name: "Re-engagement Campaign",
    description: "Win back inactive contacts with escalating offers",
    category: "reengagement",
    workflow: {
      nodes: [
        { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { triggerType: "tag_add" } as TriggerNodeData },
        { id: "e1", type: "email", position: { x: 0, y: 0 }, data: { emailName: "We miss you" } as EmailNodeData },
        { id: "w1", type: "wait_for_event", position: { x: 0, y: 0 }, data: { eventType: "email_opened", timeoutDuration: 3, timeoutUnit: "days" } as WaitForEventNodeData },
        { id: "a1", type: "action", position: { x: 0, y: 0 }, data: { actionType: "add_tag", tagName: "re-engaged" } as ActionNodeData },
        { id: "e2", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Special offer" } as EmailNodeData },
        { id: "w2", type: "wait_for_event", position: { x: 0, y: 0 }, data: { eventType: "email_clicked", timeoutDuration: 5, timeoutUnit: "days" } as WaitForEventNodeData },
        { id: "a2", type: "action", position: { x: 0, y: 0 }, data: { actionType: "add_tag", tagName: "re-engaged" } as ActionNodeData },
        { id: "e3", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Last chance" } as EmailNodeData },
        { id: "a3", type: "action", position: { x: 0, y: 0 }, data: { actionType: "add_tag", tagName: "churned" } as ActionNodeData },
        { id: "end1", type: "end", position: { x: 0, y: 0 }, data: {} },
        { id: "end2", type: "end", position: { x: 0, y: 0 }, data: {} },
        { id: "end3", type: "end", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e-1", source: "t1", target: "e1" },
        { id: "e-2", source: "e1", target: "w1" },
        { id: "e-3", source: "w1", target: "a1", sourceHandle: "default" },
        { id: "e-4", source: "w1", target: "e2", sourceHandle: "timeout" },
        { id: "e-5", source: "a1", target: "end1" },
        { id: "e-6", source: "e2", target: "w2" },
        { id: "e-7", source: "w2", target: "a2", sourceHandle: "default" },
        { id: "e-8", source: "w2", target: "e3", sourceHandle: "timeout" },
        { id: "e-9", source: "a2", target: "end2" },
        { id: "e-10", source: "e3", target: "a3" },
        { id: "e-11", source: "a3", target: "end3" },
      ],
    },
  },
  {
    id: "onboarding-drip",
    name: "Onboarding Drip",
    description: "Timed educational series over 2 weeks",
    category: "onboarding",
    workflow: {
      nodes: [
        { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { triggerType: "manual" } as TriggerNodeData },
        { id: "e1", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Day 1: Getting Started" } as EmailNodeData },
        { id: "d1", type: "delay", position: { x: 0, y: 0 }, data: { duration: 3, unit: "days" } as DelayNodeData },
        { id: "e2", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Day 3: Key Features" } as EmailNodeData },
        { id: "d2", type: "delay", position: { x: 0, y: 0 }, data: { duration: 4, unit: "days" } as DelayNodeData },
        { id: "e3", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Day 7: Tips & Tricks" } as EmailNodeData },
        { id: "d3", type: "delay", position: { x: 0, y: 0 }, data: { duration: 7, unit: "days" } as DelayNodeData },
        { id: "e4", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Day 14: Success Story" } as EmailNodeData },
        { id: "a1", type: "action", position: { x: 0, y: 0 }, data: { actionType: "add_tag", tagName: "onboarded" } as ActionNodeData },
        { id: "end1", type: "end", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e-1", source: "t1", target: "e1" },
        { id: "e-2", source: "e1", target: "d1" },
        { id: "e-3", source: "d1", target: "e2" },
        { id: "e-4", source: "e2", target: "d2" },
        { id: "e-5", source: "d2", target: "e3" },
        { id: "e-6", source: "e3", target: "d3" },
        { id: "e-7", source: "d3", target: "e4" },
        { id: "e-8", source: "e4", target: "a1" },
        { id: "e-9", source: "a1", target: "end1" },
      ],
    },
  },
  {
    id: "ab-test-subject",
    name: "A/B Subject Line Test",
    description: "Test two subject lines then follow up winners",
    category: "nurture",
    workflow: {
      nodes: [
        { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { triggerType: "manual" } as TriggerNodeData },
        { id: "ab1", type: "ab_split", position: { x: 0, y: 0 }, data: { splitA: 50, splitB: 50, labelA: "Subject A", labelB: "Subject B" } as ABSplitNodeData },
        { id: "e1", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Email — Subject A" } as EmailNodeData },
        { id: "e2", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Email — Subject B" } as EmailNodeData },
        { id: "d1", type: "delay", position: { x: 0, y: 0 }, data: { duration: 3, unit: "days" } as DelayNodeData },
        { id: "d2", type: "delay", position: { x: 0, y: 0 }, data: { duration: 3, unit: "days" } as DelayNodeData },
        { id: "e3", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Follow-up" } as EmailNodeData },
        { id: "e4", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Follow-up" } as EmailNodeData },
        { id: "end1", type: "end", position: { x: 0, y: 0 }, data: {} },
        { id: "end2", type: "end", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e-1", source: "t1", target: "ab1" },
        { id: "e-2", source: "ab1", target: "e1", sourceHandle: "a" },
        { id: "e-3", source: "ab1", target: "e2", sourceHandle: "b" },
        { id: "e-4", source: "e1", target: "d1" },
        { id: "e-5", source: "e2", target: "d2" },
        { id: "e-6", source: "d1", target: "e3" },
        { id: "e-7", source: "d2", target: "e4" },
        { id: "e-8", source: "e3", target: "end1" },
        { id: "e-9", source: "e4", target: "end2" },
      ],
    },
  },
  {
    id: "sales-nurture",
    name: "Sales Nurture Loop",
    description: "Nurture leads with re-engagement loop until conversion",
    category: "sales",
    workflow: {
      nodes: [
        { id: "t1", type: "trigger", position: { x: 0, y: 0 }, data: { triggerType: "list_add" } as TriggerNodeData },
        { id: "e1", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Introduction" } as EmailNodeData },
        { id: "d1", type: "delay", position: { x: 0, y: 0 }, data: { duration: 2, unit: "days" } as DelayNodeData },
        { id: "e2", type: "email", position: { x: 0, y: 0 }, data: { emailName: "Case Study" } as EmailNodeData },
        { id: "d2", type: "delay", position: { x: 0, y: 0 }, data: { duration: 3, unit: "days" } as DelayNodeData },
        { id: "c1", type: "condition", position: { x: 0, y: 0 }, data: { conditionType: "email_clicked", referenceEmailName: "Case Study" } as ConditionNodeData },
        { id: "wh1", type: "webhook", position: { x: 0, y: 0 }, data: { method: "POST", description: "Notify sales team" } as WebhookNodeData },
        { id: "e3", type: "email", position: { x: 0, y: 0 }, data: { emailName: "More Resources" } as EmailNodeData },
        { id: "g1", type: "goto", position: { x: 0, y: 0 }, data: { targetNodeId: "d1", targetNodeLabel: "Wait", maxLoops: 3 } as GotoNodeData },
        { id: "a1", type: "action", position: { x: 0, y: 0 }, data: { actionType: "add_tag", tagName: "hot-lead" } as ActionNodeData },
        { id: "end1", type: "end", position: { x: 0, y: 0 }, data: {} },
        { id: "end2", type: "end", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "e-1", source: "t1", target: "e1" },
        { id: "e-2", source: "e1", target: "d1" },
        { id: "e-3", source: "d1", target: "e2" },
        { id: "e-4", source: "e2", target: "d2" },
        { id: "e-5", source: "d2", target: "c1" },
        { id: "e-6", source: "c1", target: "wh1", sourceHandle: "yes" },
        { id: "e-7", source: "c1", target: "e3", sourceHandle: "no" },
        { id: "e-8", source: "wh1", target: "a1" },
        { id: "e-9", source: "a1", target: "end1" },
        { id: "e-10", source: "e3", target: "g1" },
        { id: "e-11", source: "g1", target: "end2" },
      ],
    },
  },
];
