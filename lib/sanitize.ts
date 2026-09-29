import "server-only";
import sanitizeHtml from "sanitize-html";

/** Employer-supplied HTML (detail_data.employer.about) → safe subset. */
export function sanitizeAbout(html: string | null | undefined) {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "u", "a", "h3", "h4", "span"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
      h1: "h4", h2: "h4", h3: "h4",
    },
  }).trim();
}
