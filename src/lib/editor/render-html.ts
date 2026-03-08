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

const SOCIAL_ICONS: Record<string, { label: string; color: string }> = {
  twitter: { label: "𝕏", color: "#000000" },
  linkedin: { label: "in", color: "#0A66C2" },
  instagram: { label: "IG", color: "#E4405F" },
  facebook: { label: "f", color: "#1877F2" },
  youtube: { label: "▶", color: "#FF0000" },
  tiktok: { label: "♪", color: "#000000" },
  github: { label: "GH", color: "#181717" },
  website: { label: "🌐", color: "#525252" },
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
        if (mark.attrs?.fontSize) styles.push(`font-size: ${mark.attrs.fontSize}`);
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
      return `<p style="margin: 0 0 12px 0; font-family: ${BASE_STYLES.fontFamily}; font-size: ${BASE_STYLES.fontSize}; line-height: ${BASE_STYLES.lineHeight}; color: ${BASE_STYLES.color}; text-align: ${align};">${content}</p>`;
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
      const bgColor = (node.attrs?.bgColor as string) || "#0a0a0a";
      const textColor = (node.attrs?.textColor as string) || "#ffffff";
      const borderRadius = (node.attrs?.borderRadius as number) || 6;
      const size = (node.attrs?.size as string) || "md";
      const padding = size === "sm" ? "8px 16px" : size === "lg" ? "14px 32px" : "10px 24px";
      const fontSize = size === "sm" ? "12px" : size === "lg" ? "16px" : "14px";
      const border = bgColor === "#ffffff" ? "border: 1px solid #e5e5e5;" : "";

      return `
<div style="text-align: ${align}; padding: 8px 0;">
  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(href)}" style="height:40px;v-text-anchor:middle;width:200px;" arcsize="${Math.round((borderRadius / 40) * 100)}%" strokecolor="${bgColor}" fillcolor="${bgColor}">
    <w:anchorlock/>
    <center style="color:${textColor};font-family:sans-serif;font-size:${fontSize};font-weight:bold;">${escapeHtml(text)}</center>
  </v:roundrect>
  <![endif]-->
  <!--[if !mso]><!-->
  <a href="${escapeAttr(href)}" target="_blank" style="display: inline-block; padding: ${padding}; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: ${borderRadius}px; font-family: ${BASE_STYLES.fontFamily}; font-size: ${fontSize}; font-weight: 500; ${border}">
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

    case "sectionBlock": {
      const bg = (node.attrs?.backgroundColor as string) || "#ffffff";
      const pt = (node.attrs?.paddingTop as number) || 24;
      const pb = (node.attrs?.paddingBottom as number) || 24;
      const pl = (node.attrs?.paddingLeft as number) || 24;
      const pr = (node.attrs?.paddingRight as number) || 24;
      const br = (node.attrs?.borderRadius as number) || 0;
      const content = (node.content || []).map(renderNode).join("");
      return `<div style="background-color: ${bg}; padding: ${pt}px ${pr}px ${pb}px ${pl}px; border-radius: ${br}px; margin: 0 0 12px 0;">${content}</div>`;
    }

    case "columnsBlock": {
      const gap = (node.attrs?.gap as number) || 16;
      const cells = node.content || [];
      const cellWidth = Math.floor(100 / cells.length);

      let html = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 0 0 12px 0;"><tr>`;
      cells.forEach((cell, i) => {
        const content = renderNode(cell);
        const paddingLeft = i > 0 ? `padding-left: ${gap / 2}px;` : "";
        const paddingRight = i < cells.length - 1 ? `padding-right: ${gap / 2}px;` : "";
        html += `<td style="width: ${cellWidth}%; vertical-align: top; ${paddingLeft} ${paddingRight}">${content}</td>`;
      });
      html += `</tr></table>`;
      return html;
    }

    case "columnCell": {
      return (node.content || []).map(renderNode).join("");
    }

    case "dividerBlock": {
      const color = (node.attrs?.color as string) || "#e5e5e5";
      const thickness = (node.attrs?.thickness as number) || 1;
      const style = (node.attrs?.style as string) || "solid";
      const width = (node.attrs?.width as number) || 100;
      return `<div style="padding: 12px 0; text-align: center;"><hr style="border: none; border-top: ${thickness}px ${style} ${color}; width: ${width}%; margin: 0 auto;" /></div>`;
    }

    case "socialBlock": {
      const links = (node.attrs?.links as Array<{ platform: string; url: string }>) || [];
      const align = (node.attrs?.align as string) || "center";
      const iconStyle = (node.attrs?.iconStyle as string) || "filled";

      let html = `<div style="text-align: ${align}; padding: 16px 0;">`;
      links.forEach((link, i) => {
        const info = SOCIAL_ICONS[link.platform] || { label: "?", color: "#525252" };
        const url = link.url || "#";
        const margin = i > 0 ? "margin-left: 8px;" : "";

        if (iconStyle === "filled") {
          html += `<a href="${escapeAttr(url)}" target="_blank" style="display: inline-block; width: 36px; height: 36px; line-height: 36px; text-align: center; background-color: ${info.color}; color: #ffffff; border-radius: 50%; text-decoration: none; font-size: 14px; font-weight: bold; font-family: sans-serif; ${margin}">${info.label}</a>`;
        } else {
          html += `<a href="${escapeAttr(url)}" target="_blank" style="display: inline-block; width: 34px; height: 34px; line-height: 32px; text-align: center; border: 2px solid ${info.color}; color: ${info.color}; border-radius: 50%; text-decoration: none; font-size: 14px; font-weight: bold; font-family: sans-serif; ${margin}">${info.label}</a>`;
        }
      });
      html += `</div>`;
      return html;
    }

    default:
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
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .email-content { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  ${preheader}
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" class="email-container" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td class="email-content" style="padding: 40px 32px;">
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
