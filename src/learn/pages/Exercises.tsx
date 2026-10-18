import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ClozeExercise, MatchExercise, McqExercise, TrueFalseExercise, TypeExercise } from '../types'
import { shuffle } from '../lib/gamify'
import { BLANK } from '../lib/normalize'
import { canSpeak, speak } from '../lib/speech'
import { RichText } from './RichText'
import { titleCase } from '../lib/titleCase'

export function SpeakButton({ text, lang, big = false }: { text: string; lang?: string; big?: boolean }) {
  if (!canSpeak()) return null
  return (
    <button type="button" className={`speak-btn ${big ? 'big' : ''}`} onClick={() => speak(text, lang)} aria-label={`Hear ${text}`}>
      🔊
    </button>
  )
}

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

export function Mcq({ ex, value, onChange, locked, reveal, lang, ruledOut }: ChoiceProps<McqExercise> & { lang?: string; ruledOut?: Set<number> }) {
  const [lead, ...rest] = ex.prompt.split('\n\n')
  return (
    <div className={`ex ${ex.audio && canSpeak() ? 'has-dock' : ''}`}>
      <h2 className="ex-title">{rest.length ? titleCase(lead) : 'Choose the Right Answer'}</h2>
      <p className="ex-prompt">{rest.length ? <Gap text={rest.join('\n\n')} /> : <RichText text={ex.prompt} />}</p>
      <div className="choices">
        {ex.options.map((o, i) => (
          <button key={i} className={`choice ${mark(i, value, reveal)} ${ruledOut?.has(i) ? 'ruled-out' : ''}`} disabled={locked || ruledOut?.has(i)} onClick={() => onChange(i)}>
            <span className="choice-key">{i + 1}</span>
            {o}
          </button>
        ))}
      </div>
      {/* Sits just above the bottom bar, where a thumb can reach it */}
      {/* Rendered on the page body so the question's entrance animation can't move it */}
      {ex.audio &&
        canSpeak() &&
        !locked &&
        createPortal(
          <button type="button" className="listen-btn dock" onClick={() => speak(ex.audio!, lang)}>
            <span aria-hidden>🔊</span> Tap to listen
          </button>,
          document.body,
        )}
    </div>
  )
}

export function TrueFalse({ ex, value, onChange, locked, reveal }: ChoiceProps<TrueFalseExercise>) {
  return (
    <div className="ex">
      <h2 className="ex-title">True or False?</h2>
      <p className="ex-prompt statement">
        <RichText text={ex.statement} />
      </p>
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

export function Cloze({ ex, tiles, value, onChange, locked, ruledOut }: ChoiceProps<ClozeExercise> & { tiles: string[]; ruledOut?: Set<number> }) {
  const [before, after] = ex.sentence.split(BLANK)
  return (
    <div className="ex">
      <h2 className="ex-title">Fill in the Gap</h2>
      <p className="ex-prompt cloze-sentence">
        <RichText text={before} />
        <button className={`gap ${value !== null ? 'filled' : ''}`} disabled={locked || value === null} onClick={() => onChange(null)}>
          {value !== null ? tiles[value] : ' '}
        </button>
        <RichText text={after ?? ''} />
      </p>
      <div className="tiles">
        {tiles.map((t, i) => (
          <button key={i} className={`tile ${value === i ? 'used' : ''} ${ruledOut?.has(i) ? 'ruled-out' : ''}`} disabled={locked || value === i || ruledOut?.has(i)} onClick={() => onChange(i)}>
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
      <h2 className="ex-title">{titleCase(ex.prompt)}</h2>
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
          <RichText text={p} />
          {i < parts.length - 1 && <span className="gap static">{' '}</span>}
        </span>
      ))}
    </>
  )
}

/** A written answer. The first letters are given, the learner types the rest. */
export function Typed({
  ex,
  letters,
  value,
  onChange,
  locked,
  right,
}: {
  ex: TypeExercise
  /** How many opening letters are shown: one to start, more as hints are used */
  letters: number
  value: string
  onChange: (v: string) => void
  locked: boolean
  /** Set once checked, to colour the box */
  right?: boolean
}) {
  const given = ex.answer.slice(0, letters)
  const inputRef = useRef<HTMLInputElement>(null)
  // Open the keyboard straight away for each new written question, without scrolling the page
  useEffect(() => {
    if (locked) return
    const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50)
    return () => clearTimeout(t)
  }, [ex, locked])
  const [lead, ...rest] = ex.prompt.split('\n\n')
  return (
    <div className="ex">
      <h2 className="ex-title">{rest.length ? titleCase(lead) : 'Write the Answer'}</h2>
      <p className="ex-prompt">
        <RichText text={rest.length ? rest.join('\n\n') : ex.prompt} />
      </p>
      <div className={`type-row ${right === undefined ? '' : right ? 'is-right' : 'is-wrong'}`}>
        <span className="type-given">{given}</span>
        <input
          ref={inputRef}
          className="type-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          autoFocus
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Type the rest"
          aria-label="Your answer"
        />
      </div>
    </div>
  )
}
