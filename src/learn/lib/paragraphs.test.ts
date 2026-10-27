import { describe, expect, it } from 'vitest'
import { splitParagraphs } from './paragraphs'

describe('splitParagraphs', () => {
  it('puts each sentence in its own paragraph', () => {
    expect(
      splitParagraphs('A **format invariant** is the part that stays stable. A **rotating variable** is what changes, e.g. the setting.'),
    ).toEqual(['A **format invariant** is the part that stays stable.', 'A **rotating variable** is what changes, e.g. the setting.'])
  })
  it('keeps blank lines and ignores empties', () => {
    expect(splitParagraphs('One.\n\nTwo!  \n')).toEqual(['One.', 'Two!'])
  })
  it('does not split on decimals or lowercase continuations', () => {
    expect(splitParagraphs('It costs 3.5 pounds. ok then')).toEqual(['It costs 3.5 pounds. ok then'])
  })
})
