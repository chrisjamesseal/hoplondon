import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLearn } from '../store'
import { Card } from '../components'
import { buildFollowOnPrompt, CLAUDE_URL, parseCourseJson } from '../lib/claudePrompt'
import { normalizeCourse } from '../lib/normalize'
import { titleCase } from '../lib/titleCase'

/** Prompts longer than this can't ride in a web address, so Claude opens empty and the copied prompt is pasted in */
const MAX_LINK_PROMPT = 6000

export default function ExtendCourse() {
  const { courseId } = useParams()
  const { courses, extendCourse } = useLearn()
  const navigate = useNavigate()
  const course = courses.find((c) => c.id === courseId)
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

  const level = (course.level ?? 1) + 1
  const prompt = buildFollowOnPrompt(course)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied('ok')
    } catch {
      setCopied('manual')
      setTimeout(() => promptRef.current?.select(), 50)
    }
  }

  function importUnits(text: string, quiet = false) {
    setError('')
    try {
      const fresh = normalizeCourse(parseCourseJson(text), course!.source, 'claude')
      extendCourse(course!.id, fresh.units)
      navigate('/path')
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Couldn't read that reply.")
    }
  }

  async function pasteFromClipboard() {
    try {
      importUnits(await navigator.clipboard.readText())
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
        <h1>Level {level}</h1>
      </div>
      <p className="muted">
        A harder follow on to {course.emoji} {titleCase(course.title)}. The new units are added to the end of the same course, so your progress carries on.
      </p>

      <Card>
        <ol className="steps">
          <li className="step">
            <span className="step-num">1</span>
            <div className="grow">
              <strong>Copy the Prompt into Claude</strong>
              <div className="step-actions">
                <a
                  className="btn blue"
                  href={prompt.length > MAX_LINK_PROMPT ? CLAUDE_URL : `${CLAUDE_URL}?q=${encodeURIComponent(prompt)}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={copyPrompt}
                >
                  Open in Claude
                </a>
                <button className="btn ghost" onClick={copyPrompt}>
                  {copied === 'ok' ? '✓ Copied' : 'Copy prompt'}
                </button>
              </div>
              {prompt.length > MAX_LINK_PROMPT && <p className="tiny muted">This prompt is long, so Claude opens empty. Tapping Open in Claude copies it first: just paste it in.</p>}
              {copied === 'manual' && <p className="tiny muted">Couldn't copy automatically. Select the prompt below and copy it.</p>}
              <details className="prompt-box" open={copied === 'manual'}>
                <summary>See the prompt</summary>
                <textarea ref={promptRef} readOnly value={prompt} rows={8} onFocus={(e) => e.currentTarget.select()} />
              </details>
            </div>
          </li>
          <li className="step">
            <span className="step-num">2</span>
            <div className="grow">
              <strong>Claude Replies with the New Units</strong>
              <p className="tiny muted">Tap the copy button on Claude's reply.</p>
            </div>
          </li>
          <li className="step">
            <span className="step-num">3</span>
            <div className="grow">
              <strong>Bring It Back Here</strong>
              <button className="btn green wide" onClick={pasteFromClipboard}>
                Paste and add
              </button>
              <label htmlFor="extend-paste" className="tiny muted or-label">
                or paste it here
              </label>
              <textarea
                id="extend-paste"
                className="input json-paste"
                placeholder='{"title": "…", "units": […]}'
                rows={3}
                value={pasted}
                onPaste={(e) => importUnits(e.clipboardData.getData('text'), true)}
                onChange={(e) => (setPasted(e.target.value), setError(''))}
              />
              {error && <div className="error">😬 {error}</div>}
              {pasted.trim() && (
                <button className="btn green wide" onClick={() => importUnits(pasted)}>
                  Add to course
                </button>
              )}
            </div>
          </li>
        </ol>
      </Card>
    </div>
  )
}
