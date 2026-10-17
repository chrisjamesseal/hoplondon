const KEYWORDS: [RegExp, string][] = [
  [/stock|share|invest|market|trade|price|money|fund|bank|dividend|profit/i, '📈'],
  [/risk|danger|loss|lose/i, '⚠️'],
  [/sun|star|planet|space|moon|orbit/i, '🪐'],
  [/language|word|grammar|speak|verb|noun/i, '💬'],
  [/math|number|add|sum|equation|algebra/i, '🧮'],
  [/code|program|software|computer|data/i, '💻'],
  [/body|heart|health|brain|medical|bone/i, '🫀'],
  [/plant|tree|garden|leaf|flower|food|cook/i, '🌿'],
  [/animal|bird|fish|bee|insect|dog|cat/i, '🐾'],
  [/history|war|ancient|empire|king|century/i, '🏛️'],
  [/music|song|note|rhythm|chord/i, '🎵'],
  [/art|paint|draw|colour|color|design/i, '🎨'],
  [/earth|climate|weather|rain|ocean|water|volcano/i, '🌍'],
  [/law|rule|legal|right|government|vote/i, '⚖️'],
]

const SPARE = ['💡', '🧭', '🚀', '🔑', '🧩', '🎯', '🌟', '📚']

/** Uses the course's own emoji when it has one, otherwise picks one from the title */
export function pickEmoji(own: string | undefined, title: string, index = 0): string {
  if (own) return own
  const hit = KEYWORDS.find(([re]) => re.test(title))
  return hit ? hit[1] : SPARE[index % SPARE.length]
}
