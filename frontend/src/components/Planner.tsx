import { useState } from 'react'
import { api } from '../api'
import type { Course, ValidationResult } from '../types'

export interface PlanState {
  term: string
  courses: Course[]
}

const TERM_OPTIONS = ['Winter 2027', 'Summer 2027', 'Fall 2027']

export default function Planner({
  plan,
  setPlan,
  completed,
  onGenerateWithAssistant,
}: {
  plan: PlanState[]
  setPlan: (p: PlanState[]) => void
  completed: string[]
  onGenerateWithAssistant: () => Promise<void>
}) {
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [validating, setValidating] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const removeCourse = (term: string, code: string) => {
    setPlan(
      plan.map((t) =>
        t.term === term
          ? { ...t, courses: t.courses.filter((c) => c.code !== code) }
          : t,
      ),
    )
    setValidation(null)
  }

  const validate = async () => {
    setValidating(true)
    setError('')
    try {
      const res = await api.validatePlan(
        completed,
        plan.map((t) => ({ term: t.term, courses: t.courses.map((c) => c.code) })),
      )
      setValidation(res)
    } catch (e) {
      setError(String(e))
    } finally {
      setValidating(false)
    }
  }

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      await onGenerateWithAssistant()
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  const totalCredits = plan.reduce(
    (sum, t) => sum + t.courses.reduce((s, c) => s + c.credits, 0),
    0,
  )

  return (
    <div>
      <p className="muted">
        Build your next 3 semesters. Add courses from the Catalog tab, or let the
        assistant generate a plan. Validation checks prerequisites in term order —
        a course in a later term can rely on a prerequisite planned in an earlier term.
      </p>
      <div className="toolbar">
        <button onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : 'Generate plan with assistant'}
        </button>
        <button onClick={validate} disabled={validating}>
          {validating ? 'Checking…' : 'Validate prerequisites'}
        </button>
        <span className="muted">Total planned: {totalCredits} units</span>
      </div>
      {error && <p className="error">{error}</p>}
      {validation && (
        <p className={validation.valid ? 'ready' : 'blocked'}>
          {validation.valid
            ? `✓ Plan is valid — all prerequisites satisfied (${validation.total_credits} units).`
            : `✗ Plan has prerequisite problems — see the blocked courses below.`}
        </p>
      )}

      <div className="panel-grid">
        {plan.map((t, i) => {
          const termValidation = validation?.terms[i]
          return (
            <section key={t.term} className="panel">
              <h2>{t.term}</h2>
              <p className="muted">
                {t.courses.reduce((s, c) => s + c.credits, 0)} units ·{' '}
                {t.courses.length} course(s)
              </p>
              {t.courses.length === 0 && (
                <p className="muted">No courses yet — add some from the Catalog.</p>
              )}
              <ul className="checklist">
                {t.courses.map((c) => {
                  const v = termValidation?.courses.find((vc) => vc.code === c.code)
                  return (
                    <li key={c.code}>
                      <strong>{c.code}</strong> — {c.title}
                      {v && !v.ready && (
                        <span className="blocked">
                          {' '}
                          · blocked, needs: {v.missing_prerequisites.join(', ')}
                        </span>
                      )}
                      {v && v.ready && <span className="ready"> ✓</span>}
                      <button
                        className="link-button"
                        onClick={() => removeCourse(t.term, c.code)}
                      >
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
      <p className="muted">
        Term order matters: Winter 2027 → Summer 2027 → Fall 2027. Use the term
        dropdown in the Catalog filters to see what is offered each term.
      </p>
      <div style={{ display: 'none' }}>{TERM_OPTIONS.join(',')}</div>
    </div>
  )
}
