import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { Course } from '../types'

/** Word meanings for the current course, so foreign words can be tapped for a hint */
export const GlossContext = createContext<Map<string, string> | null>(null)

const normKey = (s: string) => s.toLowerCase().replace(/[¿¡?!.,;:"“”()]/g, '').trim()

export function buildGlossary(course?: Course): Map<string, string> {
  const map = new Map<string, string>()
  for (const u of course?.units ?? [])
    for (const l of u.lessons)
      for (const p of l.phrases ?? []) for (const w of p.words ?? []) if (w.w && w.m) map.set(normKey(w.w), w.m)
  return map
}

function HintWord({ word, meaning }: { word: string; meaning: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <span ref={ref} className="hint-wrap">
      <button type="button" className={`hint-word ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {word}
      </button>
      {open && (
        <span className="hint-bubble" role="tooltip">
          {meaning}
        </span>
      )}
    </span>
  )
}

const WORD = /([\p{L}\p{M}][\p{L}\p{M}'’-]*)/u

/** Underlines words the course has meanings for; tries 3, 2 then 1 word matches */
function Glossed({ text, gloss }: { text: string; gloss: Map<string, string> }) {
  const parts = text.split(WORD)
  const out: React.ReactNode[] = []
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (i % 2 === 0) {
      if (part) out.push(part)
      continue
    }
    let matched = false
    for (const span of [3, 2]) {
      const end = i + (span - 1) * 2
      if (end >= parts.length) continue
      const gapsAreSpaces = Array.from({ length: span - 1 }, (_, k) => parts[i + 1 + k * 2]).every((g) => /^\s+$/.test(g))
      if (!gapsAreSpaces) continue
      const phrase = parts.slice(i, end + 1).join('')
      const m = gloss.get(normKey(phrase))
      if (m) {
        out.push(<HintWord key={i} word={phrase} meaning={m} />)
        i = end
        matched = true
        break
      }
    }
    if (matched) continue
    const m = gloss.get(normKey(part))
    out.push(m ? <HintWord key={i} word={part} meaning={m} /> : part)
  }
  return <>{out}</>
}

/** Renders **key terms** in the accent colour, and foreign words as tappable hints */
export function RichText({ text, hints = true }: { text: string; hints?: boolean }) {
  const gloss = useContext(GlossContext)
  const useGloss = hints && gloss && gloss.size > 0
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((seg, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="em">
            {seg}
          </strong>
        ) : useGloss ? (
          <Glossed key={i} text={seg} gloss={gloss!} />
        ) : (
          seg
        ),
      )}
    </>
  )
}

/** Plain text with the emphasis markers removed, for places that can't show styling */
export const plainText = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1')
