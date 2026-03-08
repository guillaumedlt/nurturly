import { Node, mergeAttributes } from "@tiptap/core";

export interface SocialLink {
  platform: string;
  url: string;
}

export const SOCIAL_PLATFORMS = [
  { id: "twitter", label: "X / Twitter", icon: "𝕏" },
  { id: "linkedin", label: "LinkedIn", icon: "in" },
  { id: "instagram", label: "Instagram", icon: "📷" },
  { id: "facebook", label: "Facebook", icon: "f" },
  { id: "youtube", label: "YouTube", icon: "▶" },
  { id: "tiktok", label: "TikTok", icon: "♪" },
  { id: "github", label: "GitHub", icon: "⌨" },
  { id: "website", label: "Website", icon: "🌐" },
];

export const SocialBlock = Node.create({
  name: "socialBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      links: {
        default: [
          { platform: "twitter", url: "" },
          { platform: "linkedin", url: "" },
        ],
      },
      align: { default: "center" },
      iconStyle: { default: "filled" }, // filled | outline
    };
  },

  parseHTML() {
    return [{ tag: "div[data-social-block]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { align } = node.attrs;
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-social-block": "",
        style: `text-align: ${align}; padding: 16px 0;`,
      }),
      "Social Icons",
    ];
  },
});
