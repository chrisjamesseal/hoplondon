import { describe, expect, it } from 'vitest'
import { titleCase } from './titleCase'

describe('titleCase', () => {
  it('capitalises words and keeps short joining words small', () => {
    expect(titleCase('the sales funnel and the buyer')).toBe('The Sales Funnel and the Buyer')
    expect(titleCase('German for travellers')).toBe('German for Travellers')
  })
  it('starts each clause with a capital', () => {
    expect(titleCase('Unit 1: the foundations')).toBe('Unit 1: The Foundations')
    expect(titleCase('Website sales: from lead to close')).toBe('Website Sales: From Lead to Close')
  })
  it('capitalises the last word even if it is short', () => {
    expect(titleCase('what to look out for')).toBe('What to Look Out For')
  })
  it('leaves acronyms and brand casing alone', () => {
    expect(titleCase('finding your ICP on an iPhone')).toBe('Finding Your ICP on an iPhone')
    expect(titleCase('🚀 GTA VI: what is new?')).toBe('🚀 GTA VI: What Is New?')
  })
  it('handles hyphens and apostrophes', () => {
    expect(titleCase("follow-up emails that don't annoy")).toBe("Follow-Up Emails That Don't Annoy")
  })
})
