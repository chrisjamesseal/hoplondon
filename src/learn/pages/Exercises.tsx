import { useMemo, useState } from 'react'
import type { ClozeExercise, MatchExercise, McqExercise, TrueFalseExercise } from '../types'
import { shuffle } from '../lib/gamify'
import { BLANK } from '../lib/normalize'

interface ChoiceProps<E> {
  ex: E
  value: number | null
  onChange: (v: number | null) => void
  locked: boolean
  /** Index of the correct option, passed once the answer has been checked */
  reveal?: number
}

const mark = (i: number, value: number | null, reveal?: number) =>
  reveal === undefined ? (value === i ? 'selected' : '') : i === reveal ? 'is-right' : value === i ? 'is-wrong' : ''

export function Mcq({ ex, value, onChange, locked, reveal }: ChoiceProps<McqExercise>) {
  const [lead, ...rest] = ex.prompt.split('\n\n')
  return (
    <div className="ex">
      <h2 className="ex-title">{rest.length ? lead : 'Choose the right answer'}</h2>
      <p className="ex-prompt">{rest.length ? <Gap text={rest.join('\n\n')} /> : ex.prompt}</p>
      <div className="choices">
        {ex.options.map((o, i) => (
          <button key={i} className={`choice ${mark(i, value, reveal)}`} disabled={locked} onClick={() => onChange(i)}>
            <span className="choice-key">{i + 1}</span>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TrueFalse({ ex, value, onChange, locked, reveal }: ChoiceProps<TrueFalseExercise>) {
  return (
    <div className="ex">
      <h2 className="ex-title">True or false?</h2>
      <p className="ex-prompt statement">{ex.statement}</p>
      <div className="tf">
        {['True', 'False'].map((label, i) => (
          <button key={label} className={`choice tf-btn ${mark(i, value, reveal)}`} disabled={locked} onClick={() => onChange(i)}>
            <span className="tf-icon">{i === 0 ? '👍' : '👎'}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function clozeTiles(ex: ClozeExercise): string[] {
  return shuffle([ex.answer, ...ex.distractors])
}

export function Cloze({ ex, tiles, value, onChange, locked }: ChoiceProps<ClozeExercise> & { tiles: string[] }) {
  const [before, after] = ex.sentence.split(BLANK)
  return (
    <div className="ex">
      <h2 className="ex-title">Fill in the gap</h2>
      <p className="ex-prompt cloze-sentence">
        {before}
        <button className={`gap ${value !== null ? 'filled' : ''}`} disabled={locked || value === null} onClick={() => onChange(null)}>
          {value !== null ? tiles[value] : ' '}
        </button>
        {after}
      </p>
      <div className="tiles">
        {tiles.map((t, i) => (
          <button key={i} className={`tile ${value === i ? 'used' : ''}`} disabled={locked || value === i} onClick={() => onChange(i)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Matching pairs: tap one on each side; a pair locks in green when right */
export function Match({ ex, onDone, onTap }: { ex: MatchExercise; onDone: (mistakes: number) => void; onTap: (ok: boolean) => void }) {
  const lefts = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ text: p.left, id: i }))), [ex])
  const rights = useMemo(() => shuffle(ex.pairs.map((p, i) => ({ text: p.right, id: i }))), [ex])
  const [pick, setPick] = useState<{ side: 'l' | 'r'; id: number } | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<{ l: number; r: number } | null>(null)
  const [mistakes, setMistakes] = useState(0)

  const tap = (side: 'l' | 'r', id: number) => {
    if (matched.has(id)) return
    if (!pick || pick.side === side) return setPick({ side, id })
    const l = side === 'l' ? id : pick.id
    const r = side === 'r' ? id : pick.id
    setPick(null)
    if (l === r) {
      const next = new Set(matched).add(l)
      setMatched(next)
      onTap(true)
      if (next.size === ex.pairs.length) setTimeout(() => onDone(mistakes), 250)
    } else {
      setMistakes((m) => m + 1)
      setWrong({ l, r })
      onTap(false)
      setTimeout(() => setWrong(null), 500)
    }
  }

  const cls = (side: 'l' | 'r', id: number) =>
    [
      'match-item',
      matched.has(id) ? 'matched' : '',
      pick?.side === side && pick.id === id ? 'selected' : '',
      wrong && wrong[side] === id ? 'wrong' : '',
    ].join(' ')

  return (
    <div className="ex">
      <h2 className="ex-title">{ex.prompt}</h2>
      <div className="match">
        <div className="match-col">
          {lefts.map((x) => (
            <button key={x.id} className={cls('l', x.id)} disabled={matched.has(x.id)} onClick={() => tap('l', x.id)}>
              {x.text}
            </button>
          ))}
        </div>
        <div className="match-col">
          {rights.map((x) => (
            <button key={x.id} className={cls('r', x.id)} disabled={matched.has(x.id)} onClick={() => tap('r', x.id)}>
              {x.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Gap({ text }: { text: string }) {
  const parts = text.split(BLANK)
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <span className="gap static">{' '}</span>}
        </span>
      ))}
    </>
  )
}
