import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLearn } from '../store'
import { Card } from '../components'
import { buildRewritePrompt, CLAUDE_URL, levelName, parseCourseJson } from '../lib/claudePrompt'
import { normalizeCourse } from '../lib/normalize'
import { titleCase } from '../lib/titleCase'
import AutoGenerate, { ModeSwitch, type Mode } from './AutoGenerate'
import { getApiKey } from '../lib/claudeApi'

const MAX_LINK_PROMPT = 6000

export default function RewriteCourse() {
  const { courseId } = useParams()
  const { courses, replaceLevel } = useLearn()
  const navigate = useNavigate()
  const course = courses.find((c) => c.id === courseId)
  const levels = useMemo(() => [...new Set((course?.units ?? []).map((u) => u.level ?? 1))].sort((a, b) => a - b), [course])
  const [level, setLevel] = useState(levels[0] ?? 1)
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<Mode>(getApiKey() ? 'auto' : 'manual')
  const [copied, setCopied] = useState<'ok' | 'manual' | null>(null)
  const [pasted, setPasted] = useState('')
  const [error, setError] = useState('')
  const promptRef = useRef<HTMLTextAreaElement>(null)

  if (!course) {
    return (
      <Card className="empty">
        <div className="big-emoji">🤔</div>
        <h2>Course Not Found</h2>
        <Link to="/courses" className="btn green">
          Back to courses
        </Link>
      </Card>
    )
  }

  const ready = notes.trim().length > 3
  const prompt = ready ? buildRewritePrompt(course, level, notes) : ''

  function apply(text: string): string {
    const fresh = normalizeCourse(parseCourseJson(text), course!.source, 'claude')
    replaceLevel(course!.id, level, fresh.units)
    return course!.id
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied('ok')
    } catch {
      setCopied('manual')
      setTimeout(() => promptRef.current?.select(), 50)
    }
  }

  function importNow(text: string, quiet = false) {
    setError('')
    try {
      apply(text)
      navigate('/path')
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Couldn't read that reply.")
    }
  }

  async function paste() {
    try {
      importNow(await navigator.clipboard.readText())
    } catch {
      setError('Tap the box below and paste it there.')
    }
  }

  return (
    <div className="create">
      <div className="cat-head">
        <Link to="/" className="icon-btn cat-back" aria-label="Back">
          ‹
        </Link>
        <h1>Rewrite Course</h1>
      </div>
      <p className="muted">
        Tell Claude what to fix in {course.emoji} {titleCase(course.title)}. Your progress is kept.
      </p>

      <Card>
        {levels.length > 1 && (
          <div className="field">
            <label>Which level?</label>
            <div className="model-row" role="radiogroup" aria-label="Level" style={{ gridTemplateColumns: `repeat(${Math.min(levels.length, 3)}, 1fr)` }}>
              {levels.map((l) => (
                <button key={l} role="radio" aria-checked={level === l} className={level === l ? 'active' : ''} onClick={() => setLevel(l)}>
                  {levelName(l)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="rewrite-notes">What needs improving?</label>
          <textarea
            id="rewrite-notes"
            className="input json-paste"
            rows={5}
            placeholder="e.g. The multiple choice answers are too obvious, and unit 2 needs more real examples"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === 'auto' ? (
          <AutoGenerate
            prompt={prompt}
            ready={ready}
            label="Rewrite course"
            title={`${levelName(level)} level of ${titleCase(course.title)}`}
            finish={apply}
          />
        ) : (
          <ol className="steps">
            <li className="step">
              <span className="step-num">1</span>
              <div className="grow">
                <strong>Copy the Prompt into Claude</strong>
                <div className="step-actions">
                  <a
                    className={`btn blue ${prompt ? '' : 'is-disabled'}`}
                    href={prompt ? (prompt.length > MAX_LINK_PROMPT ? CLAUDE_URL : `${CLAUDE_URL}?q=${encodeURIComponent(prompt)}`) : undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!prompt}
                    onClick={() => prompt && copyPrompt()}
                  >
                    Open in Claude
                  </a>
                  <button className="btn ghost" disabled={!prompt} onClick={copyPrompt}>
                    {copied === 'ok' ? '✓ Copied' : 'Copy prompt'}
                  </button>
                </div>
                {prompt.length > MAX_LINK_PROMPT && <p className="tiny muted">This prompt is long, so Claude opens empty. Tapping Open in Claude copies it first: just paste it in.</p>}
                {copied === 'manual' && <p className="tiny muted">Couldn't copy automatically. Select the prompt below and copy it.</p>}
                {prompt && (
                  <details className="prompt-box" open={copied === 'manual'}>
                    <summary>See the prompt</summary>
                    <textarea ref={promptRef} readOnly value={prompt} rows={8} onFocus={(e) => e.currentTarget.select()} />
                  </details>
                )}
              </div>
            </li>
            <li className="step">
              <span className="step-num">2</span>
              <div className="grow">
                <strong>Claude Replies with the Rewrite</strong>
                <p className="tiny muted">Tap the copy button on Claude's reply.</p>
              </div>
            </li>
            <li className="step">
              <span className="step-num">3</span>
              <div className="grow">
                <strong>Bring It Back Here</strong>
                <button className="btn green wide" onClick={paste}>
                  Paste and replace
                </button>
                <label htmlFor="rewrite-paste" className="tiny muted or-label">
                  or paste it here
                </label>
                <textarea
                  id="rewrite-paste"
                  className="input json-paste"
                  placeholder='{"title": "…", "units": […]}'
                  rows={3}
                  value={pasted}
                  onPaste={(e) => importNow(e.clipboardData.getData('text'), true)}
                  onChange={(e) => (setPasted(e.target.value), setError(''))}
                />
                {error && <div className="error">😬 {error}</div>}
                {pasted.trim() && (
                  <button className="btn green wide" onClick={() => importNow(pasted)}>
                    Replace level
                  </button>
                )}
              </div>
            </li>
          </ol>
        )}
      </Card>
    </div>
  )
}
