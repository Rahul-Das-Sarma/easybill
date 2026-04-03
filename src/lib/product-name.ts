/** Single canonical form in the database (trimmed, lower case). */
export function normalizeProductNameForStorage(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Presentation: capitalize each whitespace-separated segment (handles hyphenated
 * tokens like "co-op" → "Co-op" when stored as "co-op").
 */
export function formatProductNameForDisplay(stored: string): string {
  const s = stored.trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map((part) => {
      if (!part) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}
