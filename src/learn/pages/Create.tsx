import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLearn } from '../store'
import { Card } from '../components'
import { buildLanguageCourse, languageLabel, LANGUAGES } from '../lib/phrasebook'
import { cleanTranscript, isYouTubeUrl, MAX_TRANSCRIPT_CHARS, normaliseUrl } from '../lib/extract'
import { normalizeCourse } from '../lib/normalize'
import { buildPrompt, CLAUDE_URL, parseCourseJson, type PromptSource } from '../lib/claudePrompt'
import type { SourceKind } from '../types'

type Tab = 'pdf' | 'topic' | 'link' | 'language'

const TABS: { id: Tab; icon: string; label: string; hint: string }[] = [
  { id: 'pdf', icon: '📄', label: 'Upload a PDF', hint: 'Notes, a textbook chapter, a report' },
  { id: 'topic', icon: '💭', label: 'Type a Topic', hint: 'Anything you are curious about' },
  { id: 'link', icon: '🔗', label: 'Paste a Link', hint: 'An article, blog post or wiki page' },
  { id: 'language', icon: '🗣️', label: 'Travel Phrases', hint: 'Hello, thanks, directions and more' },
]

/** Prompts longer than this are too big to carry in a web address, so Claude opens empty and the copied prompt is pasted in */
const MAX_LINK_PROMPT = 6000

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
  const { addCourse, courses, setActiveCourse } = useLearn()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('topic')
  const [file, setFile] = useState<File | null>(null)
  const [topic, setTopic] = useState('')
  const [link, setLink] = useState('')
  const [transcript, setTranscript] = useState('')
  const [langId, setLangId] = useState('')
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'ok' | 'manual' | null>(null)
  const [pasted, setPasted] = useState('')
  const [importError, setImportError] = useState('')
  const pdfRef = useRef<HTMLInputElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => setCopied(null), [tab, topic, link, file, langId, transcript])

  const isVideo = tab === 'link' && isYouTubeUrl(link)
  const cleaned = cleanTranscript(transcript)
  const words = cleaned ? cleaned.split(' ').length : 0
  const tooLong = cleaned.length > MAX_TRANSCRIPT_CHARS
  // Claude can't watch a video, so a YouTube link needs its transcript before the prompt is worth sending
  const videoReady = isVideo && words >= 30 && !tooLong
  const ready = tab === 'pdf' ? !!file : tab === 'topic' ? topic.trim().length > 1 : tab === 'language' ? !!langId : isVideo ? videoReady : link.trim().length > 3
  // A PDF is attached in Claude itself, so the prompt doesn't need the file chosen here
  const promptReady = tab === 'pdf' || ready

  function promptSource(): PromptSource {
    if (tab === 'topic') return { kind: 'topic', topic: topic.trim() }
    if (tab === 'link') return { kind: 'link', url: normaliseUrl(link), transcript: isVideo ? cleaned : undefined }
    return { kind: 'pdf', fileName: file?.name }
  }

  function sourceLabel(): { kind: SourceKind; label: string } {
    if (tab === 'topic' && topic.trim()) return { kind: 'topic', label: topic.trim() }
    if (isVideo) return { kind: 'link', label: 'YouTube Video' }
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

  function startLanguage() {
    const lang = LANGUAGES.find((l) => l.id === langId)
    if (!lang) return
    // Already made it? Just switch to it instead of making a copy
    const have = courses.find((c) => c.source.kind === 'language' && c.source.label === languageLabel(lang))
    if (have) setActiveCourse(have.id)
    else addCourse(buildLanguageCourse(lang))
    navigate('/')
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

  function importCourse(text: string, quiet = false) {
    setImportError('')
    try {
      const course = normalizeCourse(parseCourseJson(text), sourceLabel(), 'claude')
      addCourse(course)
      navigate('/')
    } catch (e) {
      if (!quiet) setImportError(e instanceof Error ? e.message : "Couldn't read that course file.")
    }
  }

  async function pasteFromClipboard() {
    try {
      importCourse(await navigator.clipboard.readText())
    } catch {
      setImportError('Tap the box below and paste it there.')
    }
  }

  const prompt = promptReady ? (() => { try { return buildPrompt(promptSource()) } catch { return '' } })() : ''

  return (
    <div className="create">
      <h1>Learn Anything</h1>
      <p className="muted">Pick what to learn. Claude builds the lessons, or grab a ready made phrase course.</p>

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
                <strong>Drop a PDF Here</strong>
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
          </div>
        )}

        {tab === 'language' && (
          <div className="field">
            <label>Which language are you visiting?</label>
            <div className="lang-grid" role="radiogroup" aria-label="Language">
              {LANGUAGES.map((l) => (
                <button key={l.id} role="radio" aria-checked={langId === l.id} className={`lang-opt ${langId === l.id ? 'active' : ''}`} onClick={() => setLangId(l.id)}>
                  <span className="lang-flag">{l.flag}</span>
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
            <p className="tiny muted">10 must know phrases with audio: hello, thanks, prices, toilets and more. Ready instantly.</p>
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
            {isVideo && (
              <div className="video-box">
                <p className="video-note">
                  ▶️ <strong>YouTube Video</strong>. Claude can't watch videos, so it needs the transcript to teach what's actually said.
                </p>
                <ol className="video-steps tiny muted">
                  <li>Open the video and expand the description.</li>
                  <li>Tap Show Transcript.</li>
                  <li>Select the text, copy it and paste it below.</li>
                </ol>
                <label htmlFor="transcript">Transcript</label>
                <textarea
                  id="transcript"
                  className="input json-paste"
                  rows={4}
                  placeholder="Paste the transcript here"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                {words > 0 && !tooLong && <p className="tiny muted">{words.toLocaleString()} words{words < 30 ? ' (paste a bit more)' : ''}</p>}
                {tooLong && <p className="tiny danger-text">That's very long. Paste a section of up to about {Math.round(MAX_TRANSCRIPT_CHARS / 6000) * 1000} words and make a course from each part.</p>}
                <p className="tiny muted">No transcript? Use the Topic tab and type what the video is about.</p>
              </div>
            )}
          </div>
        )}

        {error && <div className="error">😬 {error}</div>}

        {tab === 'language' ? (
          <button className="btn green wide" disabled={!langId} onClick={startLanguage}>
            Start course
          </button>
        ) : (
        <ol className="steps">
            <li className="step">
              <span className="step-num">1</span>
              <div className="grow">
                <strong>Copy the Prompt into Claude</strong>
                {tab === 'pdf' && <p className="tiny muted">Attach your PDF in Claude too.</p>}
                <div className="step-actions">
                  {/* A real link so phones don't block the new tab; Claude opens with the prompt filled in */}
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
                  <button className="btn ghost" disabled={!promptReady} onClick={copyPrompt}>
                    {copied === 'ok' ? '✓ Copied' : 'Copy prompt'}
                  </button>
                </div>
                {prompt.length > MAX_LINK_PROMPT && copied !== 'manual' && (
                  <p className="tiny muted">This prompt is long, so Claude opens empty. Tapping Open in Claude copies it first: just paste it in.</p>
                )}
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
                <strong>Claude Replies with the Course</strong>
                <p className="tiny muted">Tap the copy button on Claude's reply.</p>
              </div>
            </li>
            <li className="step">
              <span className="step-num">3</span>
              <div className="grow">
                <strong>Bring It Back Here</strong>
                <button className="btn green wide" onClick={pasteFromClipboard}>
                  Paste and import
                </button>
                <label htmlFor="json-paste" className="tiny muted or-label">
                  or paste it here
                </label>
                <textarea
                  id="json-paste"
                  className="input json-paste"
                  placeholder='{"title": "…", "units": […]}'
                  rows={3}
                  value={pasted}
                  onPaste={(e) => importCourse(e.clipboardData.getData('text'), true)}
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
