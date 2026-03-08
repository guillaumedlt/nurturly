import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  category?: string;
  command: (props: { editor: any; range: any }) => void;
}

export const SlashCommandPluginKey = new PluginKey("slashCommand");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        pluginKey: SlashCommandPluginKey,
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export interface SlashCommandOptions {
  onImageInsert?: (editor: any, range: any) => void;
}

export function getSlashCommandItems(options?: SlashCommandOptions): SlashCommandItem[] {
  return [
    // --- Text ---
    {
      title: "Heading 1",
      description: "Large section heading",
      icon: "heading1",
      category: "Text",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: "heading2",
      category: "Text",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: "heading3",
      category: "Text",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "Bullet List",
      description: "Unordered list of items",
      icon: "list",
      category: "Text",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Ordered List",
      description: "Numbered list of items",
      icon: "listOrdered",
      category: "Text",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Quote",
      description: "Block quote",
      icon: "quote",
      category: "Text",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    // --- Media ---
    {
      title: "Image",
      description: "Insert an image from URL",
      icon: "image",
      category: "Media",
      command: ({ editor, range }) => {
        if (options?.onImageInsert) {
          options.onImageInsert(editor, range);
        } else {
          const url = window.prompt("Image URL:");
          if (url) {
            editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
          }
        }
      },
    },
    {
      title: "Button",
      description: "Call-to-action button with colors",
      icon: "button",
      category: "Media",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
          .insertContent({ type: "buttonBlock", attrs: { text: "Click here", href: "#", bgColor: "#0a0a0a", textColor: "#ffffff" } })
          .run();
      },
    },
    {
      title: "Social Icons",
      description: "Social media links",
      icon: "social",
      category: "Media",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
          .insertContent({
            type: "socialBlock",
            attrs: {
              links: [
                { platform: "twitter", url: "" },
                { platform: "linkedin", url: "" },
              ],
            },
          })
          .run();
      },
    },
    // --- Layout ---
    {
      title: "Section",
      description: "Container with background color",
      icon: "section",
      category: "Layout",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
          .insertContent({
            type: "sectionBlock",
            attrs: { backgroundColor: "#f5f5f5", paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 },
            content: [{ type: "paragraph" }],
          })
          .run();
      },
    },
    {
      title: "Block",
      description: "Horizontal block layout (1–4 columns)",
      icon: "columns2",
      category: "Layout",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
          .insertContent({
            type: "columnsBlock",
            attrs: { columns: 2, gap: 16 },
            content: [
              { type: "columnCell", content: [{ type: "paragraph" }] },
              { type: "columnCell", content: [{ type: "paragraph" }] },
            ],
          })
          .run();
      },
    },
    {
      title: "Divider",
      description: "Customizable line separator",
      icon: "divider",
      category: "Layout",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
          .insertContent({ type: "dividerBlock" })
          .run();
      },
    },
    {
      title: "Spacer",
      description: "Empty vertical space",
      icon: "spacer",
      category: "Layout",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
          .insertContent({ type: "spacerBlock", attrs: { height: 32 } })
          .run();
      },
    },
    // --- Dynamic ---
    {
      title: "Variable",
      description: "Insert a dynamic variable",
      icon: "variable",
      category: "Dynamic",
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range)
          .insertContent({ type: "variable", attrs: { name: "firstName" } })
          .run();
      },
    },
  ];
}
