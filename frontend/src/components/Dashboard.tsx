import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DashboardData, Student } from '../types'

const COLORS = ['#2563eb', '#e5e7eb']

export default function Dashboard({
  data,
  student,
}: {
  data: DashboardData
  student: Student
}) {
  const chartData = [
    { name: 'Completed', value: data.completed_units },
    { name: 'Remaining', value: data.remaining_units },
  ]

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">
            {data.completed_units} / {data.total_units}
          </div>
          <div className="stat-label">units completed ({data.percent_complete}%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.projected_graduation}</div>
          <div className="stat-label">
            projected graduation ({data.terms_remaining} terms left at{' '}
            {student.credits_per_term} units/term)
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.groups.filter((g) => g.remaining_units === 0).length} / {data.groups.length}</div>
          <div className="stat-label">requirement groups complete</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.recommended_electives.filter((e) => e.ready).length}</div>
          <div className="stat-label">recommended electives ready to take</div>
        </div>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Degree progress</h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number | string) => `${v} units`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="muted">
            {student.name} — {student.program}, Year {student.year} (demo profile,{' '}
            {student.current_term} complete).
          </p>
        </section>

        <section className="panel">
          <h2>Outstanding requirements</h2>
          <ul className="checklist">
            {data.groups.map((g) => (
              <li key={g.id} className={g.remaining_units === 0 ? 'done' : ''}>
                <strong>{g.name}</strong> — {g.completed_units}/{g.required_units}{' '}
                units
                {g.remaining_units > 0 && (
                  <span className="muted">
                    {' '}
                    · {g.remaining_units} left
                    {g.remaining_courses.length > 0 &&
                      `: ${g.remaining_courses.slice(0, 4).join(', ')}${g.remaining_courses.length > 4 ? '…' : ''}`}
                  </span>
                )}
                {g.remaining_units === 0 && <span> ✓</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <h2>
          Recommended technical electives
          {data.track ? ` — ${data.track.name}` : ''}
        </h2>
        {data.recommended_electives.length === 0 ? (
          <p className="muted">All recommended electives for this track are complete.</p>
        ) : (
          <ul className="checklist">
            {data.recommended_electives.map((e) => (
              <li key={e.code}>
                <strong>{e.code}</strong> — {e.title}{' '}
                <span className={e.ready ? 'ready' : 'blocked'}>
                  {e.ready
                    ? '· ready to take'
                    : `· needs: ${e.missing_prerequisites.join(', ')}`}
                </span>
                <div className="muted">{e.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
