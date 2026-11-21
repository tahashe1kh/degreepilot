import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import type { Course, DashboardData, Student } from './types'
import Dashboard from './components/Dashboard'
import Catalog from './components/Catalog'
import Planner, { type PlanState } from './components/Planner'
import Tracks from './components/Tracks'
import Assistant from './components/Assistant'

type Tab = 'dashboard' | 'catalog' | 'planner' | 'tracks' | 'assistant'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'catalog', label: 'Course Catalog' },
  { id: 'planner', label: 'Semester Planner' },
  { id: 'tracks', label: 'Career Tracks' },
  { id: 'assistant', label: 'Academic Assistant' },
]

const EMPTY_PLAN: PlanState[] = [
  { term: 'Winter 2027', courses: [] },
  { term: 'Summer 2027', courses: [] },
  { term: 'Fall 2027', courses: [] },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [student, setStudent] = useState<Student | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [trackId, setTrackId] = useState('')
  const [plan, setPlan] = useState<PlanState[]>(EMPTY_PLAN)
  const [catalogByCode, setCatalogByCode] = useState<Record<string, Course>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.student(), api.courses()])
      .then(([s, courses]) => {
        setStudent(s)
        setTrackId(s.career_goal ?? 'software-engineering')
        const map: Record<string, Course> = {}
        for (const c of courses) map[c.code] = c
        setCatalogByCode(map)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!student) return
    api
      .dashboard(trackId)
      .then(setDashboard)
      .catch((e) => setError(String(e)))
  }, [student, trackId])

  const planCodes = useMemo(
    () => new Set(plan.flatMap((t) => t.courses.map((c) => c.code))),
    [plan],
  )

  const addToPlan = (course: Course) => {
    setPlan((prev) => {
      const next = prev.map((t) => ({ ...t, courses: [...t.courses] }))
      const target = next.find((t) => t.courses.length < 5) ?? next[0]
      if (!target.courses.some((c) => c.code === course.code)) {
        target.courses.push(course)
      }
      return next
    })
  }

  const generateWithAssistant = async () => {
    if (!student) return
    const res = await api.askAssistant(
      'Generate my semester plan for the next 3 semesters',
      student.completed,
      trackId,
    )
    const rawPlan = (res.data as { plan?: { term: string; courses: { code: string }[] }[] }).plan
    if (!rawPlan) throw new Error('Assistant did not return a plan')
    setPlan(
      rawPlan.map((t) => ({
        term: t.term,
        courses: t.courses
          .map((c) => catalogByCode[c.code])
          .filter((c): c is Course => Boolean(c)),
      })),
    )
    setTab('planner')
  }

  if (loading) return <div className="app"><p>Loading DegreePilot…</p></div>
  if (error && !student)
    return (
      <div className="app">
        <h1>DegreePilot</h1>
        <p className="error">
          Could not reach the backend at http://localhost:8000 — start it first:{' '}
          <code>cd backend && .venv/bin/uvicorn main:app --port 8000</code>
          <br />
          {error}
        </p>
      </div>
    )
  if (!student || !dashboard) return <div className="app"><p>Loading…</p></div>

  return (
    <div className="app">
      <header>
        <h1>DegreePilot</h1>
        <p className="subtitle">
          AI-powered academic planning — {student.program} · {student.name} (demo
          profile) · {student.completed.length} courses completed
        </p>
        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {error && <p className="error">{error}</p>}

      <main>
        {tab === 'dashboard' && <Dashboard data={dashboard} student={student} />}
        {tab === 'catalog' && (
          <Catalog
            completed={student.completed}
            onAddToPlan={addToPlan}
            planCodes={planCodes}
          />
        )}
        {tab === 'planner' && (
          <Planner
            plan={plan}
            setPlan={setPlan}
            completed={student.completed}
            onGenerateWithAssistant={generateWithAssistant}
          />
        )}
        {tab === 'tracks' && (
          <Tracks selectedTrack={trackId} onSelectTrack={setTrackId} />
        )}
        {tab === 'assistant' && (
          <Assistant completed={student.completed} trackId={trackId} />
        )}
      </main>

      <footer className="muted">
        DegreePilot models the University of Ottawa Honours BSc in Computer Science
        (120 units). Data is a model, not official program text — verify against the
        official calendar before enrolling. The assistant is a deterministic,
        rules/data-driven engine; no language model or API key is involved.
      </footer>
    </div>
  )
}
