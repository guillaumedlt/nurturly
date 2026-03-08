import { Node, mergeAttributes } from "@tiptap/core";

export const ColumnsBlock = Node.create({
  name: "columnsBlock",
  group: "block",
  content: "columnCell+",
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      columns: { default: 2 },
      gap: { default: 16 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-columns-block]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { columns, gap } = node.attrs;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-columns-block": "",
        style: `display: flex; gap: ${gap}px;`,
        "data-columns": columns,
      }),
      0,
    ];
  },
});

export const ColumnCell = Node.create({
  name: "columnCell",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      width: { default: null }, // null = equal width
    };
  },

  parseHTML() {
    return [{ tag: "div[data-column-cell]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-column-cell": "",
        style: "flex: 1; min-width: 0;",
      }),
      0,
    ];
  },
});
