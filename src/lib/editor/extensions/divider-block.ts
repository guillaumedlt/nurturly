import { Node, mergeAttributes } from "@tiptap/core";

export const DividerBlock = Node.create({
  name: "dividerBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      color: { default: "#e5e5e5" },
      thickness: { default: 1 },
      style: { default: "solid" }, // solid, dashed, dotted
      width: { default: 100 }, // percentage
    };
  },

  parseHTML() {
    return [{ tag: "div[data-divider-block]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { color, thickness, style, width } = node.attrs;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-divider-block": "",
        style: `text-align: center; padding: 12px 0;`,
      }),
      [
        "hr",
        {
          style: `border: none; border-top: ${thickness}px ${style} ${color}; width: ${width}%; margin: 0 auto;`,
        },
      ],
    ];
  },
});
