import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

export const SpacerBlock = Node.create({
  name: "spacerBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      height: { default: 32 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-spacer-block]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-spacer-block": "",
        style: `height: ${node.attrs.height}px;`,
      }),
    ];
  },

  addNodeView() {
    const { SpacerBlockView } = require("@/components/editor/spacer-block-view");
    return ReactNodeViewRenderer(SpacerBlockView);
  },
});
