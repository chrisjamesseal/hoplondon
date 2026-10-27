/** Breaks a teach card into short paragraphs: blank lines first, then one per sentence */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n|\n/)
    .flatMap((chunk) => chunk.split(/(?<=[.!?]["”)]?)\s+(?=[A-Z0-9*"“(])/))
    .map((t) => t.trim())
    .filter(Boolean)
}
