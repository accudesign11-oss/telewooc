/**
 * cleanDescription.ts
 * Converts .tlv-* CSS class-based HTML to pure inline-styled HTML
 * so WooCommerce renders beautiful descriptions without <style> tags.
 */

// ─── Class-to-Inline-Style Map ───
const TLV_CLASS_STYLES: Record<string, string> = {
  // Container
  "tlv-description": "direction:rtl; text-align:right; font-family:system-ui,-apple-system,sans-serif; color:#1e293b; line-height:1.6;",

  // Service cards grid
  "tlv-service-cards": "display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; direction:rtl; text-align:right;",
  "tlv-service-card": "flex:1; min-width:100px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.03);",
  "tlv-service-emoji": "font-size:22px; display:block; margin-bottom:4px;",

  // Feature grid
  "tlv-feature-grid": "display:flex; flex-wrap:wrap; gap:8px; margin:16px 0; direction:rtl; text-align:right;",
  "tlv-feature-card": "flex:1; min-width:100px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:10px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.03);",
  "tlv-feature-icon": "font-size:22px; display:block; margin-bottom:4px;",

  // Titles
  "tlv-main-title": "font-size:16px; font-weight:800; color:#0f172a; margin:18px 0 8px 0; border-right:4px solid #3b82f6; padding-right:8px; direction:rtl; text-align:right;",

  // Images
  "tlv-desc-img": "max-width:100%; height:auto; border-radius:8px; margin:12px auto; display:block;",

  // Marquee banner
  "tlv-marquee": "background:#eff6ff; color:#1d4ed8; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:700; text-align:center; margin-bottom:12px;",

  // Live help section
  "tlv-live-help": "background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px; text-align:center; margin-top:16px; direction:rtl;",

  // Fade-in section
  "tlv-fade-in": "direction:rtl; text-align:right;",
};

// Inline styles for bare HTML tags that have no style attribute
const TAG_FALLBACK_STYLES: Record<string, string> = {
  h2: "font-size:16px; font-weight:800; color:#0f172a; margin:18px 0 8px 0; border-right:4px solid #3b82f6; padding-right:8px; direction:rtl; text-align:right;",
  h3: "font-size:14px; font-weight:700; color:#1e293b; margin:12px 0 6px 0; direction:rtl; text-align:right;",
  p: "font-size:13px; line-height:1.7; color:#334155; margin-bottom:12px; direction:rtl; text-align:right;",
  table: "width:100%; border-collapse:collapse; margin:14px 0; font-size:12px; direction:rtl; text-align:right;",
  th: "background-color:#f1f5f9; border:1px solid #cbd5e1; padding:8px 10px; font-weight:700; color:#0f172a; text-align:right;",
  td: "border:1px solid #e2e8f0; padding:8px 10px; color:#334155; text-align:right;",
};

/**
 * Convert .tlv-* class-based HTML to inline-styled HTML and strip raw CSS.
 * This ensures WooCommerce renders descriptions with proper formatting
 * on every theme — no <style> tags, no external CSS, just inline styles.
 */
export function cleanAndStyleDescription(html: string): string {
  if (!html || typeof html !== "string") return "";
  let s = html.trim();

  // 1. Strip all <style> and <script> tags
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");

  // 2. Strip raw CSS rule blocks (.tlv-* { ... } and @media { ... })
  s = s.replace(/\.tlv-[^{]+\{[^}]*\}/gi, "");
  s = s.replace(/@media[^{]+\{(?:[^{}]*|\{[^}]*\})*\}/gi, "");

  // 3. Strip preamble text before the first HTML tag if it contains CSS/code
  const firstTagIndex = s.search(/<[a-z1-6]/i);
  if (firstTagIndex > 0) {
    const preamble = s.substring(0, firstTagIndex);
    if (preamble.includes("{") || preamble.includes("tlv-") || preamble.includes("`") || /وصف|كود|html|المنتج|المثال|مخرج/i.test(preamble)) {
      s = s.substring(firstTagIndex);
    }
  }

  // 4. Strip markdown code fences
  s = s.replace(/```[a-z]*\n?/gi, "");
  s = s.replace(/```/g, "");

  // 5. Convert .tlv-* classes to inline styles
  // Match tags with class attributes containing tlv-* classes
  s = s.replace(/<([a-z][a-z0-9]*)\b([^>]*?)class\s*=\s*"([^"]*tlv-[^"]*)"([^>]*?)>/gi, (match, tag, before, classStr, after) => {
    const classes = classStr.split(/\s+/).filter(Boolean);
    const tlvClasses = classes.filter((c: string) => c.startsWith("tlv-"));
    const nonTlvClasses = classes.filter((c: string) => !c.startsWith("tlv-"));

    // Collect inline styles from matched tlv classes
    let collectedStyle = "";
    for (const cls of tlvClasses) {
      if (TLV_CLASS_STYLES[cls]) {
        collectedStyle += TLV_CLASS_STYLES[cls] + " ";
      }
    }

    // Check if tag already has a style attribute
    const existingStyleMatch = (before + after).match(/style\s*=\s*"([^"]*)"/i);
    if (existingStyleMatch) {
      collectedStyle = existingStyleMatch[1] + " " + collectedStyle;
      // Remove existing style attribute from before/after
      before = before.replace(/\s*style\s*=\s*"[^"]*"/i, "");
      after = after.replace(/\s*style\s*=\s*"[^"]*"/i, "");
    }

    // Rebuild class attribute without tlv-* classes
    const classAttr = nonTlvClasses.length > 0 ? ` class="${nonTlvClasses.join(" ")}"` : "";
    const styleAttr = collectedStyle.trim() ? ` style="${collectedStyle.trim()}"` : "";

    return `<${tag}${before}${classAttr}${styleAttr}${after}>`;
  });

  // Also handle single-quoted class attributes
  s = s.replace(/<([a-z][a-z0-9]*)\b([^>]*?)class\s*=\s*'([^']*tlv-[^']*)'([^>]*?)>/gi, (match, tag, before, classStr, after) => {
    const classes = classStr.split(/\s+/).filter(Boolean);
    const tlvClasses = classes.filter((c: string) => c.startsWith("tlv-"));
    const nonTlvClasses = classes.filter((c: string) => !c.startsWith("tlv-"));

    let collectedStyle = "";
    for (const cls of tlvClasses) {
      if (TLV_CLASS_STYLES[cls]) {
        collectedStyle += TLV_CLASS_STYLES[cls] + " ";
      }
    }

    const existingStyleMatch = (before + after).match(/style\s*=\s*'([^']*)'/i);
    if (existingStyleMatch) {
      collectedStyle = existingStyleMatch[1] + " " + collectedStyle;
      before = before.replace(/\s*style\s*=\s*'[^']*'/i, "");
      after = after.replace(/\s*style\s*=\s*'[^']*'/i, "");
    }

    const classAttr = nonTlvClasses.length > 0 ? ` class="${nonTlvClasses.join(" ")}"` : "";
    const styleAttr = collectedStyle.trim() ? ` style="${collectedStyle.trim()}"` : "";

    return `<${tag}${before}${classAttr}${styleAttr}${after}>`;
  });

  // 6. Inject fallback inline styles into bare HTML tags (no existing style attribute)
  for (const [tag, style] of Object.entries(TAG_FALLBACK_STYLES)) {
    const regex = new RegExp(`<${tag}(?![^>]*style=)`, "gi");
    s = s.replace(regex, `<${tag} style="${style}"`);
  }

  // 7. Remove any remaining on* event handlers
  s = s.replace(/\s+on[a-z]+\s*=\s*"(?:[^"\\]|\\.)*"/gi, "");
  s = s.replace(/\s+on[a-z]+\s*=\s*'(?:[^'\\]|\\.)*'/gi, "");

  return s.trim();
}

// Keep the old name as an alias for backward compatibility
export const stripCssFromHtml = cleanAndStyleDescription;
