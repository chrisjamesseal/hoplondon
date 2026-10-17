import { describe, expect, it } from 'vitest'
import { generateOffline, keyTerms, toSections } from './offlineGen'
import { normalizeCourse } from './normalize'

const TEXT = `== Overview ==
A volcano is a rupture in the crust of a planet that allows hot lava and gases to escape. Volcanoes are generally found where tectonic plates are diverging or converging. The Pacific Ring of Fire has many volcanoes formed at converging plates. Mid-ocean ridges such as the Mid-Atlantic Ridge have volcanoes caused by diverging plates. Magma that reaches the surface is called lava once it erupts. Lava can flow for many kilometres before it cools into rock.

== Eruptions ==
Explosive eruptions happen when gas trapped in thick magma is released suddenly. Effusive eruptions produce runny lava that flows steadily from the vent. Mount Vesuvius destroyed Pompeii in an explosive eruption in 79 AD. Pyroclastic flows are fast currents of hot gas and volcanic matter. Volcanic ash from explosive eruptions can disrupt aircraft engines. Scientists who study volcanoes are called volcanologists. Volcanologists measure gas and ground movement to forecast eruptions. The Pacific Ring of Fire is home to most active volcanoes on Earth.

== References ==
Smith, J. Volcanoes and lava. Published by a university press in 2001 for students.
`

describe('toSections', () => {
  it('splits on headings and drops reference sections', () => {
    const s = toSections(TEXT)
    expect(s.map((x) => x.heading)).toEqual(['Overview', 'Eruptions'])
  })
})

describe('keyTerms', () => {
  it('finds repeated content words and proper nouns', () => {
    const terms = keyTerms(toSections(TEXT).flatMap((s) => s.sentences))
    expect(terms).toEqual(expect.arrayContaining(['lava', 'Pacific Ring of Fire']))
    expect(terms).not.toContain('that')
  })
})

describe('generateOffline', () => {
  it('produces a valid course with several exercise types', () => {
    const course = normalizeCourse(generateOffline('Volcanoes', TEXT), { kind: 'topic', label: 'Volcanoes' }, 'offline')
    const ex = course.units.flatMap((u) => u.lessons.flatMap((l) => l.exercises))
    expect(ex.length).toBeGreaterThanOrEqual(6)
    expect(new Set(ex.map((e) => e.type)).size).toBeGreaterThanOrEqual(3)
    for (const e of ex) if (e.type === 'cloze') expect(e.sentence).toContain('___')
  })

  it('refuses text that is too short', () => {
    expect(() => generateOffline('x', 'Too short.')).toThrow()
  })
})
