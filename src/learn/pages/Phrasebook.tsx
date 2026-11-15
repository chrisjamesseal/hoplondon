import { Link } from 'react-router-dom'
import { Volume2 } from 'lucide-react'
import { useActiveCourse, useLearn } from '../store'
import { phrasebookEntries } from '../lib/learned'
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

  const entries = phrasebookEntries(course, progress)

  return (
    <div className="phrasebook">
      <div className="cat-head">
        <Link to="/" className="icon-btn cat-back" aria-label="Back to home">
          ‹
        </Link>
        <h1>Phrasebook</h1>
      </div>
      <p className="muted">
        {course.emoji} {titleCase(course.title)}
      </p>

      <ul className="phrase-list">
        {entries.map(({ phrase: p, learned }) => (
          <li key={p.text} className={`phrase-row ${learned ? '' : 'faded'}`}>
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
    </div>
  )
}
