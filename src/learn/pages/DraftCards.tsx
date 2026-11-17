import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useLearn } from '../store'
import { cancelDraft, finishDraft, runDraft } from '../jobs'
import { Card, ProgressBar } from '../components'
import { titleCase } from '../lib/titleCase'

/** A rough guess at how many units a course has, only used to fill the bar */
const EXPECTED_UNITS = 5

/** Courses still being written, shown as cards at the top of My Courses */
export default function DraftCards() {
  const drafts = useLearn((s) => s.drafts) ?? []
  const [confirmId, setConfirmId] = useState<string | null>(null)
  if (!drafts.length) return null
  return (
    <div className="course-list draft-list">
      {drafts.map((d) => {
        const n = d.units.length
        const writing = d.status === 'writing'
        const ratio = Math.min(0.92, (n + (writing ? 0.4 : 0)) / EXPECTED_UNITS)
        return (
          <Card key={d.id} className={`course-row draft ${writing ? 'writing' : ''}`}>
            <button className="course-row-main" onClick={() => !writing && runDraft(d.id)} aria-label={writing ? `${d.head?.title || d.title}, writing` : `Continue ${d.head?.title || d.title}`}>
              <span className="course-emoji">{d.head?.emoji || '✍️'}</span>
              <div className="grow">
                <strong>{titleCase(d.head?.title || d.title)}</strong>
                <div className="tiny muted">{n ? `${n} unit${n === 1 ? '' : 's'} written so far` : writing ? 'Getting started' : 'Nothing written yet'}</div>
                <div className="draft-badge">
                  {writing ? (
                    <span className="pill blue-pill">
                      <LoaderCircle size={12} strokeWidth={3} className="spin" aria-hidden /> Writing
                    </span>
                  ) : (
                    <span className="pill muted-pill">Paused</span>
                  )}
                </div>
                <ProgressBar value={ratio} color={writing ? 'blue' : 'amber'} height={10} label="Writing progress" />
              </div>
            </button>
            {d.note && !writing && <p className="tiny muted draft-note">{d.note}</p>}
            {writing && <p className="tiny muted draft-note">Saved as it goes. You can leave and come back.</p>}
            {!writing && (
              <button className="btn green wide archive-delete" onClick={() => runDraft(d.id)}>
                {n ? 'Continue writing' : 'Try again'}
              </button>
            )}
            {!writing && n > 0 && (
              <button className="btn ghost wide archive-delete" onClick={() => finishDraft(d.id)}>
                Use what is written
              </button>
            )}
            {confirmId === d.id ? (
              <div className="archive-confirm">
                <span className="small muted">Delete this unfinished course?</span>
                <button className="btn red wide" onClick={() => (cancelDraft(d.id), setConfirmId(null))}>
                  Delete
                </button>
                <button className="btn ghost wide" onClick={() => setConfirmId(null)}>
                  Keep it
                </button>
              </div>
            ) : (
              <button className="btn ghost wide danger-text archive-delete" onClick={() => setConfirmId(d.id)}>
                {writing ? 'Cancel' : 'Delete'}
              </button>
            )}
          </Card>
        )
      })}
    </div>
  )
}
