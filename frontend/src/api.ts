import type {
  AssistantResponse,
  Course,
  DashboardData,
  Student,
  Track,
  ValidationResult,
} from './types'

const API_BASE =
  (import.meta as unknown as { env: Record<string, string | undefined> }).env
    .VITE_API_URL || 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  health: () => get<{ status: string; courses: number }>('/api/health'),
  courses: (params: { search?: string; category?: string; track?: string; term?: string } = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    ).toString()
    return get<Course[]>(`/api/courses${q ? `?${q}` : ''}`)
  },
  requirements: () => get('/api/requirements'),
  tracks: () => get<Track[]>('/api/tracks'),
  track: (id: string) => get<Track>(`/api/tracks/${id}`),
  student: () => get<Student>('/api/student'),
  dashboard: (trackId?: string) =>
    get<DashboardData>(`/api/dashboard${trackId ? `?track_id=${trackId}` : ''}`),
  validatePlan: (completed: string[], planned: { term: string; courses: string[] }[]) =>
    post<ValidationResult>('/api/plan/validate', { completed, planned }),
  askAssistant: (message: string, completed: string[], trackId?: string) =>
    post<AssistantResponse>('/api/assistant', {
      message,
      completed,
      track_id: trackId ?? null,
    }),
}
