/**
 * Converts Tiptap JSON to email-safe HTML with inline styles.
 * No CSS classes — email clients don't support them reliably.
 */

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: TiptapMark[];
}

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

const BASE_STYLES = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#1a1a1a",
};

function renderMarks(text: string, marks?: TiptapMark[]): string {
  if (!marks || marks.length === 0) return escapeHtml(text);

  let result = escapeHtml(text);

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `<strong>${result}</strong>`;
        break;
      case "italic":
        result = `<em>${result}</em>`;
        break;
      case "underline":
        result = `<u>${result}</u>`;
        break;
      case "strike":
        result = `<s>${result}</s>`;
        break;
      case "link":
        result = `<a href="${escapeAttr(mark.attrs?.href as string)}" style="color: #0a0a0a; text-decoration: underline;" target="_blank">${result}</a>`;
        break;
      case "textStyle": {
        const styles: string[] = [];
        if (mark.attrs?.color) styles.push(`color: ${mark.attrs.color}`);
        if (styles.length > 0) {
          result = `<span style="${styles.join("; ")}">${result}</span>`;
        }
        break;
      }
    }
  }

  return result;
}

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case "doc":
      return (node.content || []).map(renderNode).join("");

    case "paragraph": {
      const align = (node.attrs?.textAlign as string) || "left";
      const content = (node.content || []).map(renderNode).join("") || "&nbsp;";
      return `<p style="margin: 0 0 12px 0; ${BASE_STYLES.fontFamily ? `font-family: ${BASE_STYLES.fontFamily};` : ""} font-size: ${BASE_STYLES.fontSize}; line-height: ${BASE_STYLES.lineHeight}; color: ${BASE_STYLES.color}; text-align: ${align};">${content}</p>`;
    }

    case "heading": {
      const level = (node.attrs?.level as number) || 1;
      const align = (node.attrs?.textAlign as string) || "left";
      const sizes: Record<number, string> = { 1: "28px", 2: "22px", 3: "18px" };
      const content = (node.content || []).map(renderNode).join("");
      return `<h${level} style="margin: 0 0 12px 0; font-family: ${BASE_STYLES.fontFamily}; font-size: ${sizes[level] || "18px"}; font-weight: 600; line-height: 1.3; color: #0a0a0a; text-align: ${align};">${content}</h${level}>`;
    }

    case "text":
      return renderMarks(node.text || "", node.marks);

    case "hardBreak":
      return "<br />";

    case "horizontalRule":
      return `<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />`;

    case "blockquote": {
      const content = (node.content || []).map(renderNode).join("");
      return `<blockquote style="margin: 0 0 12px 0; padding: 12px 16px; border-left: 3px solid #d4d4d4; color: #525252; font-style: italic;">${content}</blockquote>`;
    }

    case "bulletList": {
      const items = (node.content || []).map(renderNode).join("");
      return `<ul style="margin: 0 0 12px 0; padding-left: 24px; font-family: ${BASE_STYLES.fontFamily}; font-size: ${BASE_STYLES.fontSize}; line-height: ${BASE_STYLES.lineHeight}; color: ${BASE_STYLES.color};">${items}</ul>`;
    }

    case "orderedList": {
      const items = (node.content || []).map(renderNode).join("");
      return `<ol style="margin: 0 0 12px 0; padding-left: 24px; font-family: ${BASE_STYLES.fontFamily}; font-size: ${BASE_STYLES.fontSize}; line-height: ${BASE_STYLES.lineHeight}; color: ${BASE_STYLES.color};">${items}</ol>`;
    }

    case "listItem": {
      const content = (node.content || []).map(renderNode).join("");
      return `<li style="margin: 0 0 4px 0;">${content}</li>`;
    }

    case "image": {
      const src = node.attrs?.src as string;
      const alt = (node.attrs?.alt as string) || "";
      return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" style="max-width: 100%; height: auto; display: block; margin: 12px 0; border-radius: 6px;" />`;
    }

    case "buttonBlock": {
      const text = (node.attrs?.text as string) || "Click here";
      const href = (node.attrs?.href as string) || "#";
      const align = (node.attrs?.align as string) || "center";
      // Table-based button for Outlook compatibility
      return `
<div style="text-align: ${align}; padding: 8px 0;">
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(href)}" style="height:40px;v-text-anchor:middle;width:200px;" arcsize="15%" strokecolor="#0a0a0a" fillcolor="#0a0a0a">
    <w:anchorlock/>
    <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">${escapeHtml(text)}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-->
  <a href="${escapeAttr(href)}" target="_blank" style="display: inline-block; padding: 10px 24px; background-color: #0a0a0a; color: #ffffff; text-decoration: none; border-radius: 6px; font-family: ${BASE_STYLES.fontFamily}; font-size: 14px; font-weight: 500;">
    ${escapeHtml(text)}
  </a>
  <!--<![endif]-->
</div>`;
    }

    case "spacerBlock": {
      const height = (node.attrs?.height as number) || 32;
      return `<div style="height: ${height}px; line-height: ${height}px; font-size: 1px;">&nbsp;</div>`;
    }

    case "variable": {
      const name = (node.attrs?.name as string) || "firstName";
      return `{{${name}}}`;
    }

    default:
      // Unknown node — render children if any
      return (node.content || []).map(renderNode).join("");
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function renderEmailHtml(
  doc: TiptapNode,
  options?: { subject?: string; preheaderText?: string }
): string {
  const body = renderNode(doc);
  const preheader = options?.preheaderText
    ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(options.preheaderText)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(options?.subject || "")}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 40px 32px;">
              ${body}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
