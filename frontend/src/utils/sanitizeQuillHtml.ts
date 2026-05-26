/**
 * Cleans Quill-generated HTML from common AI-paste artifacts:
 *  1. Invisible Unicode characters (zero-width spaces, soft hyphens, BOM, etc.)
 *  2. Quill cursor sentinel spans (<span class="ql-cursor">)
 *  3. Bare <span> elements with no class/style that wrap individual characters
 *     (these create mid-word break opportunities when pasted from AI tools)
 *  4. Truly empty inline elements
 *
 * Safe to call on both body and body_en fields; does not alter semantic content.
 */
export function sanitizeQuillHtml(html: string): string {
  if (!html) return html;

  // --- 1. Strip invisible break-opportunity characters ---
  let clean = html.replace(/[\u200B\u200C\u200D\u00AD\uFEFF]/g, "");

  // --- 2. Remove Quill editor cursor sentinels ---
  clean = clean.replace(
    /<span[^>]*class="ql-cursor"[^>]*>[\s\S]*?<\/span>/g,
    "",
  );

  // DOM is required for steps 3-4; fall back to string-only result in SSR
  if (typeof document === "undefined") return clean;

  const div = document.createElement("div");
  div.innerHTML = clean;

  // --- 3. Unwrap bare <span> elements (no class, no style, no attributes) ---
  // Quill never emits unstyled <span> elements itself; they come from pasted
  // content (e.g. AI tools) and split words across element boundaries, which
  // can trigger line-break opportunities inside words.
  div.querySelectorAll("span").forEach((span) => {
    if (span.hasAttributes()) return; // keep styled / classed spans
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span);
    }
    parent.removeChild(span);
  });

  // --- 4. Remove empty inline elements left behind ---
  div.querySelectorAll("strong, em, u, s, b, i, span, a").forEach((el) => {
    if (!el.innerHTML.trim()) el.remove();
  });

  return div.innerHTML;
}
