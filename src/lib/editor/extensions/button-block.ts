import { Node, mergeAttributes } from "@tiptap/core";

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
      bgColor: { default: "#0a0a0a" },
      textColor: { default: "#ffffff" },
      borderRadius: { default: 6 },
      size: { default: "md" }, // sm, md, lg
    };
  },

  parseHTML() {
    return [{ tag: "div[data-button-block]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { align, bgColor, textColor, borderRadius, size } = node.attrs;
    const padding = size === "sm" ? "8px 16px" : size === "lg" ? "14px 32px" : "10px 24px";
    const fontSize = size === "sm" ? "12px" : size === "lg" ? "16px" : "14px";
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
          style: `display: inline-block; padding: ${padding}; background: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: ${borderRadius}px; font-size: ${fontSize}; font-weight: 500;`,
        },
        node.attrs.text,
      ],
    ];
  },
});
