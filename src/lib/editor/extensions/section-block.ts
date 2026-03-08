import { Node, mergeAttributes } from "@tiptap/core";

export const SectionBlock = Node.create({
  name: "sectionBlock",
  group: "block",
  content: "block+",
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      backgroundColor: { default: "#ffffff" },
      paddingTop: { default: 24 },
      paddingBottom: { default: 24 },
      paddingLeft: { default: 24 },
      paddingRight: { default: 24 },
      borderRadius: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-section-block]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { backgroundColor, paddingTop, paddingBottom, paddingLeft, paddingRight, borderRadius } = node.attrs;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-section-block": "",
        style: `background-color: ${backgroundColor}; padding: ${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px; border-radius: ${borderRadius}px;`,
      }),
      0,
    ];
  },
});
