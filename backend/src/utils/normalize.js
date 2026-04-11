export function normalize(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ");
}
