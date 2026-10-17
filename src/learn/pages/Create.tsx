import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLearn } from '../store'
import { Card, ProgressBar } from '../components'
import { fileToBase64, linkToText, normaliseUrl, pdfToText, topicToText } from '../lib/extract'
import { generateOffline } from '../lib/offlineGen'
import { normalizeCourse } from '../lib/normalize'
import { generateWithClaude, type ClaudeSource } from '../lib/claudeGen'
import type { SourceKind } from '../types'

type Tab = 'pdf' | 'topic' | 'link'

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

// Rough size of a full course in characters, used to fill the progress bar while streaming
const EXPECTED_CHARS = 28_000
const MAX_PDF_BYTES = 25 * 1024 * 1024

export default function Create() {
  const { apiKey, addCourse } = useLearn()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('pdf')
  const [file, setFile] = useState<File | null>(null)
  const [topic, setTopic] = useState('')
  const [link, setLink] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState<{ step: string; progress: number } | null>(null)
  const [error, setError] = useState('')
  const [tip, setTip] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const smart = !!apiKey

  useEffect(() => {
    if (!busy) return
    const t = setInterval(() => setTip((n) => (n + 1) % TIPS.length), 4000)
    return () => clearInterval(t)
  }, [busy])

  const ready = tab === 'pdf' ? !!file : tab === 'topic' ? topic.trim().length > 1 : link.trim().length > 3

  async function build() {
    setError('')
    try {
      let label = ''
      let raw: unknown
      const kind: SourceKind = tab
      setBusy({ step: 'Reading your source…', progress: 0.05 })

      if (smart) {
        let src: ClaudeSource
        if (tab === 'pdf') {
          label = titleFromFile(file!.name)
          src = file!.size <= MAX_PDF_BYTES ? { kind: 'pdf', label, base64: await fileToBase64(file!) } : { kind: 'text', label, text: await pdfToText(file!) }
        } else if (tab === 'topic') {
          label = topic.trim()
          src = { kind: 'topic', topic: label }
        } else {
          const url = normaliseUrl(link)
          label = new URL(url).hostname
          try {
            const page = await linkToText(url)
            label = page.title || label
            src = { kind: 'text', label, text: page.text }
          } catch {
            // Let Claude fetch it server-side instead
            src = { kind: 'url', url }
          }
        }
        setBusy({ step: 'Claude is designing your lessons…', progress: 0.1 })
        raw = await generateWithClaude(apiKey, src, (chars) =>
          setBusy({ step: 'Claude is writing lessons…', progress: 0.1 + 0.85 * Math.min(1, chars / EXPECTED_CHARS) }),
        )
      } else {
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
        label = title
        setBusy({ step: 'Building lessons…', progress: 0.6 })
        await new Promise((r) => setTimeout(r, 400))
        raw = generateOffline(title, text)
      }

      setBusy({ step: 'Almost there…', progress: 0.98 })
      const course = normalizeCourse(raw, { kind, label }, smart ? 'claude' : 'offline')
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
        <p className="muted small">{Math.round(busy.progress * 100)}%{smart ? ' · this can take a minute or two' : ''}</p>
        <div className="tip">💡 {TIPS[tip]}</div>
      </Card>
    )
  }

  return (
    <div className="create">
      <h1>Learn anything</h1>
      <p className="muted">Give Leap something to read and it turns it into bite-sized lessons with quizzes, XP and streaks.</p>

      <div className={`mode ${smart ? 'smart' : ''}`}>
        {smart ? (
          <>
            <strong>✨ Claude mode</strong> Lessons are written by Claude.
          </>
        ) : (
          <>
            <strong>⚡ Basic mode</strong> Quick lessons built from the text itself.{' '}
            <Link to="/profile">Add a Claude API key</Link> for much smarter lessons.
          </>
        )}
      </div>

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
            onClick={() => inputRef.current?.click()}
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
              ref={inputRef}
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
              onKeyDown={(e) => e.key === 'Enter' && ready && build()}
              autoFocus
            />
            <div className="chips">
              {IDEAS.map((i) => (
                <button key={i} className="chip" onClick={() => setTopic(i)}>
                  {i}
                </button>
              ))}
            </div>
            {!smart && <p className="tiny muted">Basic mode uses the matching Wikipedia article.</p>}
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
              onKeyDown={(e) => e.key === 'Enter' && ready && build()}
              autoFocus
            />
            <p className="tiny muted">Works best with articles and wiki pages. Pages behind a login can't be read.</p>
          </div>
        )}

        {error && <div className="error">😬 {error}</div>}

        <button className="btn green wide" disabled={!ready} onClick={build}>
          Make my course
        </button>
      </Card>
    </div>
  )
}
