/** Short joining words stay lower case in the middle of a title (AP style) */
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'via', 'vs'])

/**
 * "Unit 1: the foundations of web sales" -> "Unit 1: The Foundations of Web Sales".
 * Words that already mix cases (PDF, ICP, iPhone) are left alone.
 */
export function titleCase(text: string): string {
  const parts = text.split(/(\s+)/)
  const wordIdx = parts.map((p, i) => (/\p{L}/u.test(p) ? i : -1)).filter((i) => i >= 0)
  const last = wordIdx[wordIdx.length - 1]
  let startOfClause = true
  return parts
    .map((part, i) => {
      if (!/\p{L}/u.test(part)) {
        // Numbers and symbols can end a clause too, as in "Unit 1:"
        if (part.trim()) startOfClause = /[:?!.]$/.test(part)
        return part
      }
      const lead = part.match(/^[^\p{L}\p{N}]*/u)![0]
      const core = part.slice(lead.length)
      const bare = core.replace(/[^\p{L}'’-]+$/u, '').toLowerCase()
      let out = part
      const mixed = /\p{Lu}/u.test(core.slice(1))
      if (!mixed) {
        if (!startOfClause && i !== last && SMALL.has(bare)) out = lead + core.toLowerCase()
        else out = lead + core.replace(/(^|-)(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase())
      }
      startOfClause = /[:?!.]$/.test(part)
      return out
    })
    .join('')
}

/**
 * "Unit 1: the foundations" -> { label: "Unit 1", name: "The Foundations" }.
 * Titles without a "Unit N" start come back whole, with no label.
 */
export function splitUnitTitle(title: string): { label: string | null; name: string } {
  const m = title.match(/^\s*(unit\s*\d+)\s*[:.\-–—]\s*(.+)$/i)
  if (!m) return { label: null, name: titleCase(title) }
  return { label: titleCase(m[1]), name: titleCase(m[2]) }
}
