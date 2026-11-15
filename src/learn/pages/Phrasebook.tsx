import { Link } from 'react-router-dom'
import { Volume2 } from 'lucide-react'
import { useActiveCourse, useLearn } from '../store'
import { learnedPhrases } from '../lib/learned'
import { canSpeak, speak } from '../lib/speech'
import { Card } from '../components'
import { titleCase } from '../lib/titleCase'

/** Every phrase learned so far in a language course, one card per row with its audio button on the right */
export default function Phrasebook() {
  const course = useActiveCourse()
  const progress = useLearn((s) => s.progress)

  if (!course || !course.lang) {
    return (
      <Card className="empty">
        <h2>No Phrasebook Here</h2>
        <p className="muted">The phrasebook is for language courses.</p>
        <Link to="/courses" className="btn green">
          My courses
        </Link>
      </Card>
    )
  }

  const phrases = learnedPhrases(course, progress)
  const total = new Set(course.units.flatMap((u) => u.lessons.flatMap((l) => (l.phrases ?? []).map((p) => p.text)))).size

  return (
    <div className="phrasebook">
      <div className="cat-head">
        <Link to="/" className="icon-btn cat-back" aria-label="Back to home">
          ‹
        </Link>
        <h1>Phrasebook</h1>
      </div>
      <p className="muted">
        {course.emoji} {titleCase(course.title)} · {phrases.length} of {total} phrases learned
      </p>

      {phrases.length === 0 ? (
        <Card className="empty">
          <h2>Nothing Here Yet</h2>
          <p className="muted">Finish a lesson and the phrases you learned will appear here.</p>
          <Link to="/path" className="btn green">
            Open the path
          </Link>
        </Card>
      ) : (
        <ul className="phrase-list">
          {phrases.map((p) => (
            <li key={p.text} className="phrase-row">
              <div className="pr-text">
                <strong className="pr-phrase">{p.text}</strong>
                {p.say && <span className="pr-say">{p.say}</span>}
                <span className="pr-mean">{p.meaning}</span>
              </div>
              {canSpeak() && (
                <button type="button" className="pr-audio" onClick={() => speak(p.text, course.lang)} aria-label={`Hear ${p.text}`}>
                  <Volume2 size={24} strokeWidth={2.25} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
