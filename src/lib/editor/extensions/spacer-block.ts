import { Node, mergeAttributes } from "@tiptap/core";

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
    return [{ tag: "div[data-spacer-block]" }];
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
});
