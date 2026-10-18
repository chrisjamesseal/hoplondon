import { useEffect, useRef, useState } from 'react'
import { generateText, getApiKey, setApiKey } from '../lib/claudeApi'

export type Mode = 'auto' | 'manual'

/** Picks auto or by hand; auto is the starting choice once a key has been saved */
export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="mode-switch" role="tablist">
      <button role="tab" aria-selected={mode === 'auto'} className={mode === 'auto' ? 'active' : ''} onClick={() => onChange('auto')}>
        ⚡ Auto
      </button>
      <button role="tab" aria-selected={mode === 'manual'} className={mode === 'manual' ? 'active' : ''} onClick={() => onChange('manual')}>
        ✋ Manual
      </button>
    </div>
  )
}

interface Props {
  prompt: string
  /** False until the form above has what Claude needs */
  ready: boolean
  pdf?: File | null
  readWeb?: boolean
  /** Called with Claude's full reply; throw to show a message */
  onDone: (text: string) => void
  label: string
}

/** Writes the course straight from Claude using the learner's own API key */
export default function AutoGenerate({ prompt, ready, pdf, readWeb, onDone, label }: Props) {
  const [key, setKey] = useState(getApiKey())
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [chars, setChars] = useState(0)
  const [error, setError] = useState('')
  const abort = useRef<AbortController | null>(null)
  useEffect(() => () => abort.current?.abort(), [])

  function saveKey() {
    const k = draft.trim()
    if (!k.startsWith('sk-ant-')) return setError('That does not look like an Anthropic key. It starts with sk-ant-')
    setApiKey(k)
    setKey(k)
    setDraft('')
    setError('')
  }

  async function run() {
    setError('')
    setBusy(true)
    setChars(0)
    abort.current = new AbortController()
    try {
      const text = await generateText({ key, prompt, pdf, readWeb, onProgress: setChars, signal: abort.current.signal })
      onDone(text)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (!key) {
    return (
      <div className="auto-box">
        <strong>Add Your Claude API Key</strong>
        <p className="tiny muted">Leap writes the course for you. The key stays on this device and only goes to Anthropic. Usage is billed to your own account.</p>
        <input
          className="input"
          type="password"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="sk-ant-..."
          value={draft}
          onChange={(e) => (setDraft(e.target.value), setError(''))}
        />
        {error && <div className="error">😬 {error}</div>}
        <button className="btn green wide" disabled={!draft.trim()} onClick={saveKey}>
          Save key
        </button>
      </div>
    )
  }

  return (
    <div className="auto-box">
      <button className="btn green wide" disabled={!ready || busy} onClick={run}>
        {busy ? 'Writing...' : label}
      </button>
      {busy && (
        <>
          <p className="tiny muted">Claude is writing your course. This usually takes a minute or two. {chars > 0 ? `${Math.round(chars / 1000)}k characters so far.` : ''}</p>
          <button className="btn ghost wide" onClick={() => abort.current?.abort()}>
            Cancel
          </button>
        </>
      )}
      {error && <div className="error">😬 {error}</div>}
      {!busy && (
        <button className="link-btn tiny" onClick={() => (setApiKey(''), setKey(''))}>
          Remove saved API key
        </button>
      )}
    </div>
  )
}
