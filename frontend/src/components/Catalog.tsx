import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Course, Track } from '../types'

const CATEGORIES = [
  { value: '', label: 'All categories' },
  { value: 'core', label: 'Core' },
  { value: 'math', label: 'Math' },
  { value: 'science', label: 'Science' },
  { value: 'cs-elective', label: 'CS elective' },
  { value: 'free-elective', label: 'Free elective' },
]

const TERMS = ['', 'Fall', 'Winter', 'Summer']

export default function Catalog({
  completed,
  onAddToPlan,
  planCodes,
}: {
  completed: string[]
  onAddToPlan: (course: Course) => void
  planCodes: Set<string>
}) {
  const [courses, setCourses] = useState<Course[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [track, setTrack] = useState('')
  const [term, setTerm] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.tracks().then(setTracks).catch(() => setTracks([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .courses({ search, category, track, term })
        .then(setCourses)
        .catch((e) => setError(String(e)))
    }, 200)
    return () => clearTimeout(t)
  }, [search, category, track, term])

  return (
    <div>
      <div className="filters">
        <input
          type="search"
          placeholder="Search by code or title (e.g. CSI 3105)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select value={track} onChange={(e) => setTrack(e.target.value)}>
          <option value="">All tracks</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={term} onChange={(e) => setTerm(e.target.value)}>
          <option value="">Any term</option>
          {TERMS.filter(Boolean).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      <p className="muted">{courses.length} course(s) found</p>

      <div className="course-grid">
        {courses.map((c) => {
          const isDone = completed.includes(c.code)
          const inPlan = planCodes.has(c.code)
          const missing = c.prerequisites.filter((p) => !completed.includes(p))
          return (
            <article key={c.code} className="course-card">
              <div className="course-head">
                <strong>{c.code}</strong>
                <span className="badge">{c.category}</span>
              </div>
              <h3>{c.title}</h3>
              <p className="muted">{c.description}</p>
              <p>
                <span className="muted">Credits:</span> {c.credits} ·{' '}
                <span className="muted">Offered:</span> {c.terms.join(', ')}
              </p>
              <p>
                <span className="muted">Prerequisites:</span>{' '}
                {c.prerequisites.length === 0
                  ? 'None'
                  : c.prerequisites.join(', ')}
              </p>
              {isDone ? (
                <span className="ready">✓ Completed</span>
              ) : missing.length > 0 ? (
                <span className="blocked">
                  Blocked — needs: {missing.join(', ')}
                </span>
              ) : (
                <span className="ready">Ready to take</span>
              )}
              <div style={{ marginTop: 8 }}>
                <button
                  disabled={isDone || inPlan}
                  onClick={() => onAddToPlan(c)}
                >
                  {inPlan ? 'In plan' : 'Add to plan'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
