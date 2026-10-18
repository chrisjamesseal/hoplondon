import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobs } from '../jobs'
import { getApiKey, getModel, MODELS, setApiKey, setModel } from '../lib/claudeApi'

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
  /** Name shown on the progress banner */
  title: string
  /** Turns Claude's reply into a saved course and returns its id; throw to report a problem */
  finish: (text: string) => string
  label: string
}

/** Starts writing the course in the background with the learner's own API key */
export default function AutoGenerate({ prompt, ready, pdf, readWeb, title, finish, label }: Props) {
  const navigate = useNavigate()
  const start = useJobs((s) => s.start)
  const [key, setKey] = useState(getApiKey())
  const [draft, setDraft] = useState('')
  const [model, setModelState] = useState(getModel())
  const [error, setError] = useState('')

  function saveKey() {
    const k = draft.trim()
    if (!k.startsWith('sk-ant-')) return setError('That does not look like an Anthropic key. It starts with sk-ant-')
    setApiKey(k)
    setKey(k)
    setDraft('')
    setError('')
  }

  function run() {
    setError('')
    start(title, { key, prompt, pdf, readWeb }, finish)
    navigate('/courses')
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
      <div className="model-row" role="radiogroup" aria-label="Model">
        {MODELS.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={model === m.id}
            className={model === m.id ? 'active' : ''}
                        onClick={() => (setModel(m.id), setModelState(m.id))}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="tiny muted">{MODELS.find((m) => m.id === model)?.hint}</p>
      <button className="btn green wide" disabled={!ready} onClick={run}>
        {label}
      </button>
      <p className="tiny muted">It writes in the background, so you can leave this page and keep using Leap.</p>
      {error && <div className="error">😬 {error}</div>}
      {(
        <button className="link-btn tiny" onClick={() => (setApiKey(''), setKey(''))}>
          Remove saved API key
        </button>
      )}
    </div>
  )
}
