import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export const ButtonBlock = Node.create({
  name: "buttonBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      text: { default: "Click here" },
      href: { default: "#" },
      align: { default: "center" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-button-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const align = node.attrs.align || "center";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-button-block": "",
        style: `text-align: ${align}; padding: 8px 0;`,
      }),
      [
        "a",
        {
          href: node.attrs.href,
          style:
            "display: inline-block; padding: 10px 24px; background: #0a0a0a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;",
        },
        node.attrs.text,
      ],
    ];
  },

  addNodeView() {
    const { ButtonBlockView } = require("@/components/editor/button-block-view");
    return ReactNodeViewRenderer(ButtonBlockView);
  },
});
