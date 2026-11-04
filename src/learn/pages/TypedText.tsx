import { useEffect, useMemo, useState } from 'react'

interface Ch {
  c: string
  em: boolean
}

/** Splits text with **key terms** into single characters that remember whether they are emphasised */
export function toChars(text: string): Ch[] {
  return text.split(/\*\*(.+?)\*\*/g).flatMap((seg, i) => [...seg].map((c) => ({ c, em: i % 2 === 1 })))
}

/** How long to wait after each character: a beat at the end of a sentence, a little at a comma */
export function typingDelays(chars: Ch[], budgetMs = 6760, maxMs = 34, minMs = 9): number[] {
  const weight = (c: string) => (/[.!?]/.test(c) ? 9 : c === ',' || c === ';' || c === ':' ? 4 : 1)
  const total = chars.reduce((n, ch) => n + weight(ch.c), 0) || 1
  const base = Math.max(minMs, Math.min(maxMs, budgetMs / total))
  return chars.map((ch) => base * weight(ch.c))
}

/** Teaching text that types itself out one letter at a time. Tap it to show the rest straight away. */
export function TypedParas({ paras }: { paras: string[] }) {
  const parts = useMemo(() => paras.map(toChars), [paras])
  const all = useMemo(() => parts.flat(), [parts])
  const delays = useMemo(() => typingDelays(all), [all])
  const total = all.length
  const calm = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const [n, setN] = useState(calm ? total : 0)

  useEffect(() => {
    if (n >= total) return
    const t = setTimeout(() => setN(n + 1), n === 0 ? 220 : delays[n - 1])
    return () => clearTimeout(t)
  }, [n, total, delays])

  let offset = 0
  return (
    <div className="typed" onClick={() => setN(total)}>
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
          <p key={pi} className="teach-para" aria-hidden>
            {runs.map((r, ri) => {
              const kids = chars.slice(r.from, r.to).map((ch, k) => (
                <span key={k} className={`ch ${r.from + k < shown ? 'on' : ''}`}>
                  {ch.c}
                </span>
              ))
              return r.em ? (
                <strong key={ri} className="em">
                  {kids}
                </strong>
              ) : (
                <span key={ri}>{kids}</span>
              )
            })}
          </p>
        )
      })}
    </div>
  )
}
