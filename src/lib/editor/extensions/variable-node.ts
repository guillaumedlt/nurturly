import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

// Lazy import — the React view will be set after component is loaded
let VariableView: ReturnType<typeof ReactNodeViewRenderer> | null = null;

export const VariableNode = Node.create({
  name: "variable",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      name: {
        default: "firstName",
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-variable": node.attrs.name,
        style:
          "background: #f0f0f0; border-radius: 4px; padding: 1px 6px; font-size: 12px; font-family: monospace; color: #525252; white-space: nowrap;",
      }),
      `{{${node.attrs.name}}}`,
    ];
  },

  addNodeView() {
    // Dynamic import to avoid SSR issues
    const { VariableNodeView } = require("@/components/editor/variable-node-view");
    return ReactNodeViewRenderer(VariableNodeView);
  },
});

export const AVAILABLE_VARIABLES = [
  { name: "firstName", label: "First Name" },
  { name: "lastName", label: "Last Name" },
  { name: "email", label: "Email" },
  { name: "company", label: "Company" },
  { name: "unsubscribeUrl", label: "Unsubscribe URL" },
];
