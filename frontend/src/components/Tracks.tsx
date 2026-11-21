import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Track } from '../types'

export default function Tracks({
  selectedTrack,
  onSelectTrack,
}: {
  selectedTrack: string
  onSelectTrack: (id: string) => void
}) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [detail, setDetail] = useState<Track | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.tracks().then(setTracks).catch((e) => setError(String(e)))
  }, [])

  useEffect(() => {
    if (!selectedTrack) {
      setDetail(null)
      return
    }
    api
      .track(selectedTrack)
      .then(setDetail)
      .catch((e) => setError(String(e)))
  }, [selectedTrack])

  return (
    <div>
      {error && <p className="error">{error}</p>}
      <div className="panel-grid">
        {tracks.map((t) => (
          <section
            key={t.id}
            className={`panel track-card ${selectedTrack === t.id ? 'selected' : ''}`}
            onClick={() => onSelectTrack(t.id)}
            role="button"
            tabIndex={0}
          >
            <h2>{t.name}</h2>
            <p className="muted">{t.description}</p>
            <p>
              <strong>{t.electives.length} recommended electives</strong>
            </p>
          </section>
        ))}
      </div>

      {detail && (
        <section className="panel">
          <h2>{detail.name} — electives ranked by relevance</h2>
          <ol className="ranked">
            {detail.electives.map((e, i) => (
              <li key={e.code}>
                <strong>
                  {i + 1}. {e.code} — {e.title}
                </strong>{' '}
                <span className={e.ready ? 'ready' : 'blocked'}>
                  {e.ready
                    ? '· ready to take'
                    : `· needs: ${(e.missing_prerequisites ?? []).join(', ')}`}
                </span>
                <div className="muted">{e.reason}</div>
                <div className="muted">
                  Prerequisites:{' '}
                  {(e.prerequisites ?? []).length === 0
                    ? 'None'
                    : (e.prerequisites ?? []).join(', ')}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  )
}
