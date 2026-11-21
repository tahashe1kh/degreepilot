export interface Course {
  code: string
  title: string
  credits: number
  prerequisites: string[]
  terms: string[]
  category: string
  tracks: string[]
  description: string
}

export interface RequirementGroup {
  id: string
  name: string
  description: string
  required_units: number
  completed_units: number
  completed_courses: string[]
  remaining_courses: string[]
  remaining_units: number
}

export interface RecommendedElective {
  code: string
  title: string
  reason: string
  ready: boolean
  missing_prerequisites: string[]
}

export interface Track {
  id: string
  name: string
  description: string
  electives: TrackElective[]
}

export interface TrackElective {
  code: string
  reason: string
  title?: string
  credits?: number
  prerequisites?: string[]
  ready?: boolean
  missing_prerequisites?: string[]
}

export interface Student {
  name: string
  program: string
  year: number
  current_term: string
  completed: string[]
  career_goal: string | null
  credits_per_term: number
  note: string
}

export interface DashboardData {
  completed_units: number
  total_units: number
  percent_complete: number
  groups: RequirementGroup[]
  projected_graduation: string
  terms_remaining: number
  remaining_units: number
  track: Track | null
  recommended_electives: RecommendedElective[]
}

export interface PlanTerm {
  term: string
  courses: { code: string; title: string; credits: number; category: string }[]
  credits: number
}

export interface AssistantResponse {
  intent: string
  answer: string
  data: Record<string, unknown>
  suggested_questions: string[]
}

export interface PlannedCourse {
  code: string
  title: string
  credits: number
  ready: boolean
  missing_prerequisites: string[]
}

export interface ValidationResult {
  terms: { term: string; courses: PlannedCourse[]; credits: number }[]
  valid: boolean
  total_credits: number
}
