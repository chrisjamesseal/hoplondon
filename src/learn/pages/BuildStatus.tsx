import { LoaderCircle } from 'lucide-react'
import { useLearn } from '../store'
import { cancelDraft, finishDraft, runDraft } from '../jobs'
import type { Course, Draft } from '../types'

/** The saved job for a course that is still being written */
export function useBuilding(course: Course | undefined): Draft | undefined {
  return useLearn((s) => (course?.building ? (s.drafts ?? []).find((d) => d.id === course.building!.draftId) : undefined))
}

/** On a course card: a Writing or Paused badge, what is being written, and the controls */
export function BuildStatus({ course }: { course: Course }) {
  const d = useBuilding(course)
  if (!d) return null
  const writing = d.status === 'writing'
  return (
    <div className="build-status">
      <div className="draft-badge">
        {writing ? (
          <span className="pill blue-pill">
            <LoaderCircle size={12} strokeWidth={3} className="spin" aria-hidden /> Writing
          </span>
        ) : (
          <span className="pill muted-pill">Paused</span>
        )}
      </div>
      <p className="tiny muted draft-note">
        {writing ? `${d.activity ?? 'Writing'}. You can start learning now. New lessons appear as they finish.` : (d.note ?? 'Paused.')}
      </p>
      {!writing && (
        <button className="btn green wide archive-delete" onClick={() => runDraft(d.id)}>
          Continue writing
        </button>
      )}
      <button className="btn ghost wide archive-delete" onClick={() => (writing ? finishDraft(d.id) : cancelDraft(d.id))}>
        {writing ? 'Stop writing here' : 'Stop and keep what is written'}
      </button>
    </div>
  )
}

/** Shown where the path would end, when the learner has caught up with the writer */
export function WritingNext({ draft }: { draft: Draft }) {
  const writing = draft.status === 'writing'
  return (
    <div className="path-end writing-next">
      <strong>✍️ The next lesson is being written</strong>
      <span className="muted small">{writing ? `${draft.activity ?? 'Writing'}. It shows up here when it is ready.` : (draft.note ?? 'Writing is paused.')}</span>
      {!writing && (
        <button className="btn green wide" onClick={() => runDraft(draft.id)}>
          Continue writing
        </button>
      )}
    </div>
  )
}
