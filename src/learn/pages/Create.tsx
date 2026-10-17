import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLearn } from '../store'
import { Card, ProgressBar } from '../components'
import { linkToText, normaliseUrl, pdfToText, topicToText } from '../lib/extract'
import { generateOffline } from '../lib/offlineGen'
import { normalizeCourse } from '../lib/normalize'
import { buildPrompt, CLAUDE_URL, parseCourseJson, type PromptSource } from '../lib/claudePrompt'
import type { SourceKind } from '../types'

type Tab = 'pdf' | 'topic' | 'link'
type Method = 'claude' | 'quick'

const TABS: { id: Tab; icon: string; label: string; hint: string }[] = [
  { id: 'pdf', icon: '📄', label: 'Upload a PDF', hint: 'Notes, a textbook chapter, a report' },
  { id: 'topic', icon: '💭', label: 'Type a topic', hint: 'Anything you are curious about' },
  { id: 'link', icon: '🔗', label: 'Paste a link', hint: 'An article, blog post or wiki page' },
]

const IDEAS = ['Photosynthesis', 'The French Revolution', 'How vaccines work', 'Stoicism', 'Black holes', 'Wine tasting basics']

const TIPS = [
  'Short daily lessons beat long cramming sessions.',
  'Getting things wrong helps you remember them. Mistakes come back at the end!',
  'Keep your streak alive by finishing one lesson a day.',
  'A crown 👑 means you aced a lesson with no mistakes.',
  'Run out of hearts? Practice refills them.',
]

/** "my_biology-notes.pdf" -> "My biology notes" */
function titleFromFile(name: string): string {
  const t = name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function Create() {
  const { addCourse } = useLearn()
  const navigate = useNavigate()
  const [method, setMethod] = useState<Method>('claude')
  const [tab, setTab] = useState<Tab>('topic')
  const [file, setFile] = useState<File | null>(null)
  const [topic, setTopic] = useState('')
  const [link, setLink] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState<{ step: string; progress: number } | null>(null)
  const [error, setError] = useState('')
  const [tip, setTip] = useState(0)
  const [copied, setCopied] = useState<'ok' | 'manual' | null>(null)
  const [pasted, setPasted] = useState('')
  const [importError, setImportError] = useState('')
  const pdfRef = useRef<HTMLInputElement>(null)
  const jsonRef = useRef<HTMLInputElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 4000)
    return () => clearInterval(t)
  }, [busy])

  useEffect(() => setCopied(null), [tab, topic, link, file])

  const ready = tab === 'pdf' ? !!file : tab === 'topic' ? topic.trim().length > 1 : link.trim().length > 3
  // A PDF is attached in Claude itself, so the prompt doesn't need the file chosen here
  const promptReady = tab === 'pdf' || ready

  function promptSource(): PromptSource {
    if (tab === 'topic') return { kind: 'topic', topic: topic.trim() }
    if (tab === 'link') return { kind: 'link', url: normaliseUrl(link) }
    return { kind: 'pdf', fileName: file?.name }
  }

  function sourceLabel(): { kind: SourceKind; label: string } {
    if (tab === 'topic' && topic.trim()) return { kind: 'topic', label: topic.trim() }
    if (tab === 'link' && link.trim()) {
      try {
        return { kind: 'link', label: new URL(normaliseUrl(link)).hostname }
      } catch {
        // fall through
      }
    }
    if (tab === 'pdf' && file) return { kind: 'pdf', label: titleFromFile(file.name) }
    return { kind: 'topic', label: 'Claude course' }
  }

  async function copyPrompt() {
    setError('')
    let prompt: string
    try {
      prompt = buildPrompt(promptSource())
    } catch (e) {
      return setError(e instanceof Error ? e.message : 'Check the link and try again.')
    }
    const ok = await copyText(prompt)
    setCopied(ok ? 'ok' : 'manual')
    if (!ok) setTimeout(() => promptRef.current?.select(), 50)
  }

  function importCourse(text: string) {
    setImportError('')
    try {
      const course = normalizeCourse(parseCourseJson(text), sourceLabel(), 'claude')
      addCourse(course)
      navigate('/')
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Couldn't read that course file.")
    }
  }

  async function buildQuick() {
    setError('')
    try {
      setBusy({ step: 'Reading your source…', progress: 0.1 })
      let title: string
      let text: string
      if (tab === 'pdf') {
        title = titleFromFile(file!.name)
        text = await pdfToText(file!)
      } else if (tab === 'topic') {
        ;({ title, text } = await topicToText(topic.trim()))
      } else {
        ;({ title, text } = await linkToText(link))
      }
      setBusy({ step: 'Building lessons…', progress: 0.6 })
      await new Promise((r) => setTimeout(r, 400))
      const course = normalizeCourse(generateOffline(title, text), { kind: tab, label: title }, 'offline')
      addCourse(course)
      navigate('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(null)
    }
  }

  if (busy) {
    return (
      <Card className="building">
        <div className="building-mascot">🐸</div>
        <h2>{busy.step}</h2>
        <ProgressBar value={busy.progress} label="Building course" />
        <p className="muted small">{Math.round(busy.progress * 100)}%</p>
        <div className="tip">💡 {TIPS[tip]}</div>
      </Card>
    )
  }

  const prompt = promptReady ? (() => { try { return buildPrompt(promptSource()) } catch { return '' } })() : ''

  return (
    <div className="create">
      <h1>Learn anything</h1>
      <p className="muted">Pick what to learn, then choose how Leap makes the lessons.</p>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
            <span className="tab-hint">{t.hint}</span>
          </button>
        ))}
      </div>

      <Card>
        {tab === 'pdf' && (
          <div
            className={`drop ${drag ? 'drag' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => pdfRef.current?.click()}
            onDragOver={(e) => (e.preventDefault(), setDrag(true))}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              const f = e.dataTransfer.files[0]
              if (f) setFile(f)
            }}
          >
            <input
              ref={pdfRef}
              id="pdf-file"
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) setFile(f)
              }}
            />
            <div className="big-emoji">{file ? '✅' : '📄'}</div>
            {file ? (
              <>
                <strong>{file.name}</strong>
                <span className="muted small">{(file.size / 1024 / 1024).toFixed(1)} MB · tap to change</span>
              </>
            ) : (
              <>
                <strong>Drop a PDF here</strong>
                <span className="muted small">or tap to choose one</span>
              </>
            )}
          </div>
        )}

        {tab === 'topic' && (
          <div className="field">
            <label htmlFor="topic">What do you want to learn?</label>
            <input
              id="topic"
              className="input"
              placeholder="e.g. How the stock market works"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <div className="chips">
              {IDEAS.map((i) => (
                <button key={i} className="chip" onClick={() => setTopic(i)}>
                  {i}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'link' && (
          <div className="field">
            <label htmlFor="link">Paste a web address</label>
            <input
              id="link"
              className="input"
              inputMode="url"
              placeholder="https://en.wikipedia.org/wiki/Honey_bee"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        )}

        <div className="method" role="radiogroup" aria-label="How to make lessons">
          <button role="radio" aria-checked={method === 'claude'} className={`method-opt ${method === 'claude' ? 'active' : ''}`} onClick={() => setMethod('claude')}>
            <strong>✨ With Claude</strong>
            <span>Best lessons. Takes a minute in the Claude app.</span>
          </button>
          <button role="radio" aria-checked={method === 'quick'} className={`method-opt ${method === 'quick' ? 'active' : ''}`} onClick={() => setMethod('quick')}>
            <strong>⚡ Quick</strong>
            <span>Instant, simpler quizzes built from the text.</span>
          </button>
        </div>

        {error && <div className="error">😬 {error}</div>}

        {method === 'quick' ? (
          <>
            {tab === 'topic' && <p className="tiny muted">Quick mode uses the matching Wikipedia article.</p>}
            <button className="btn green wide" disabled={!ready} onClick={buildQuick}>
              Make my course
            </button>
          </>
        ) : (
          <ol className="steps">
            <li className="step">
              <span className="step-num">1</span>
              <div className="grow">
                <strong>Copy the prompt into Claude</strong>
                {tab === 'pdf' && <p className="tiny muted">Attach your PDF in Claude too.</p>}
                <div className="step-actions">
                  {/* A real link so phones don't block the new tab; Claude opens with the prompt filled in */}
                  <a
                    className={`btn blue ${prompt ? '' : 'is-disabled'}`}
                    href={prompt ? `${CLAUDE_URL}?q=${encodeURIComponent(prompt)}` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!prompt}
                    onClick={() => prompt && copyPrompt()}
                  >
                    Open in Claude
                  </a>
                  <button className="btn ghost" disabled={!promptReady} onClick={copyPrompt}>
                    {copied === 'ok' ? '✓ Copied' : 'Copy prompt'}
                  </button>
                </div>
                {copied === 'manual' && <p className="tiny muted">Couldn't copy automatically. Select the prompt below and copy it.</p>}
                {prompt && (
                  <details className="prompt-box" open={copied === 'manual'}>
                    <summary>See the prompt</summary>
                    <textarea id="prompt-text" ref={promptRef} readOnly value={prompt} rows={8} onFocus={(e) => e.currentTarget.select()} />
                  </details>
                )}
              </div>
            </li>
            <li className="step">
              <span className="step-num">2</span>
              <div className="grow">
                <strong>Claude makes leap-course.json</strong>
                <p className="tiny muted">Download the file, or copy the JSON Claude replies with.</p>
              </div>
            </li>
            <li className="step">
              <span className="step-num">3</span>
              <div className="grow">
                <strong>Bring it back here</strong>
                <input
                  ref={jsonRef}
                  id="json-file"
                  type="file"
                  accept="application/json,.json,text/plain"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) importCourse(await f.text())
                  }}
                />
                <button className="btn green wide" onClick={() => jsonRef.current?.click()}>
                  Upload course file
                </button>
                <label htmlFor="json-paste" className="tiny muted or-label">
                  or paste it
                </label>
                <textarea
                  id="json-paste"
                  className="input json-paste"
                  placeholder='{"title": "…", "units": […]}'
                  rows={3}
                  value={pasted}
                  onChange={(e) => (setPasted(e.target.value), setImportError(''))}
                />
                {importError && <div className="error">😬 {importError}</div>}
                {pasted.trim() && (
                  <button className="btn green wide" onClick={() => importCourse(pasted)}>
                    Import course
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
