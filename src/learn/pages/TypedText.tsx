import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

interface Ch {
  c: string
  em: boolean
}

/** Splits text with **key terms** into single characters that remember whether they are emphasised */
export function toChars(text: string): Ch[] {
  return text.split(/\*\*(.+?)\*\*/g).flatMap((seg, i) => [...seg].map((c) => ({ c, em: i % 2 === 1 })))
}

export const PARAGRAPH_PAUSE_MS = 900

/** How long to wait after each character: a beat at the end of a sentence, a little at a comma */
export function typingDelays(chars: Ch[], budgetMs = 6760, maxMs = 34, minMs = 9): number[] {
  const weight = (c: string) => (/[.!?]/.test(c) ? 9 : c === ',' || c === ';' || c === ':' ? 4 : 1)
  const total = chars.reduce((n, ch) => n + weight(ch.c), 0) || 1
  const base = Math.max(minMs, Math.min(maxMs, budgetMs / total))
  return chars.map((ch) => base * weight(ch.c))
}

/** A highlighted key term. Once it has been typed it is underlined, and tapping it shows what it means. */
function TermHint({ meaning, children }: { meaning: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [shift, setShift] = useState(0)
  const wrap = useRef<HTMLSpanElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  // Keep the bubble on screen when the word sits near an edge
  useLayoutEffect(() => {
    if (!open || !bubble.current) return setShift(0)
    const r = bubble.current.getBoundingClientRect()
    const pad = 12
    const dx = r.left - shift < pad ? pad - (r.left - shift) : r.right - shift > window.innerWidth - pad ? window.innerWidth - pad - (r.right - shift) : 0
    if (dx !== shift) setShift(dx)
  }, [open, shift])

  return (
    <span ref={wrap} className="hint-wrap">
      <button type="button" className={`hint-word term ${open ? 'open' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {children}
      </button>
      {open && (
        <span ref={bubble} className="hint-bubble term-bubble" role="tooltip" style={{ transform: `translateX(calc(-50% + ${shift}px))`, ['--arrow-shift' as string]: `${-shift}px` }}>
          {meaning}
        </span>
      )}
    </span>
  )
}

/**
 * Teaching text that types itself out one letter at a time. Key terms become
 * tappable once typed. `onDone` fires when the last letter is in, and `instant`
 * shows everything straight away (a card the learner has already read).
 */
export function TypedParas({
  paras,
  define,
  instant = false,
  onDone,
}: {
  paras: string[]
  /** What a key term means, or null when nothing in the course says */
  define?: (term: string) => string | null
  instant?: boolean
  onDone?: () => void
}) {
  const parts = useMemo(() => paras.map(toChars), [paras])
  const all = useMemo(() => parts.flat(), [parts])
  const delays = useMemo(() => {
    const d = typingDelays(all)
    // A real pause before each new paragraph, so a thought lands before the next one starts
    let at = 0
    parts.slice(0, -1).forEach((chars) => {
      at += chars.length
      d[at - 1] += PARAGRAPH_PAUSE_MS
    })
    return d
  }, [all, parts])
  const total = all.length
  const calm = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(calm || instant ? total : 0)

  useEffect(() => {
    if (n >= total) return
    const t = setTimeout(() => setN(n + 1), n === 0 ? 220 : delays[n - 1])
    return () => clearTimeout(t)
  }, [n, total, delays])

  const finished = n >= total
  useEffect(() => {
    if (finished) onDone?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished])

  let offset = 0
  return (
    <div className="typed">
      <span className="sr-only">{paras.map((p) => p.replace(/\*\*/g, '')).join(' ')}</span>
      {parts.map((chars, pi) => {
        const start = offset
        offset += chars.length
        const shown = Math.max(0, Math.min(chars.length, n - start))
        // Group runs of same-style characters so key terms keep their colour
        const runs: { em: boolean; from: number; to: number }[] = []
        chars.forEach((ch, i) => {
          const last = runs[runs.length - 1]
          if (last && last.em === ch.em) last.to = i + 1
          else runs.push({ em: ch.em, from: i, to: i + 1 })
        })
        return (
          <p key={pi} className="teach-para">
            {runs.map((r, ri) => {
              const kids = chars.slice(r.from, r.to).map((ch, k) => (
                <span key={k} className={`ch ${r.from + k < shown ? 'on' : ''}`} aria-hidden>
                  {ch.c}
                </span>
              ))
              if (!r.em) return <span key={ri}>{kids}</span>
              const term = chars.slice(r.from, r.to).map((c) => c.c).join('')
              const typed = shown >= r.to
              const meaning = define?.(term) ?? paras[pi].replace(/\*\*/g, '')
              return (
                <strong key={ri} className="em">
                  {typed ? <TermHint meaning={meaning}>{kids}</TermHint> : kids}
                </strong>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}
