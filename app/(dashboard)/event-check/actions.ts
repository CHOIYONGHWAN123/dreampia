'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

// ── 폼 참조 데이터 ─────────────────────────────────────────────────

export interface ProgramCategoryOption {
  id: string
  school_level: string | null
  experience_type: string
}

export interface OccupationProgramUnitOption {
  id: string
  title: string
  program_category_id: string | null
  occupation_programs_id: string | null
}

export interface OccupationProgramOption {
  id: string
  name: string
  occupation_id: string | null
}

export interface OccupationOption {
  id: string
  name: string
}

export interface EventCheckFormData {
  programCategories: ProgramCategoryOption[]
  units: OccupationProgramUnitOption[]
  programs: OccupationProgramOption[]
  occupations: OccupationOption[]
}

export async function getEventCheckFormData(): Promise<EventCheckFormData> {
  const supabase = await createServerSupabaseClient()

  const [categoriesRes, unitsRes, programsRes, occupationsRes] = await Promise.all([
    supabase.from('program_categories').select('id, school_level, experience_type').order('sort_order'),
    supabase
      .from('occupation_program_unit')
      .select('id, title, program_category_id, occupation_programs_id')
      .order('title'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase.from('occupations').select('id, name').order('name'),
  ])

  return {
    programCategories: categoriesRes.data ?? [],
    units: unitsRes.data ?? [],
    programs: programsRes.data ?? [],
    occupations: occupationsRes.data ?? [],
  }
}

// ── 가용 멘토 계산 ─────────────────────────────────────────────────

export interface CheckMentorAvailabilityInput {
  occupationProgramUnitId: string
  area: string
  date: string // 'YYYY-MM-DD'
  startTime: string // 'HH:mm'
  endTime: string // 'HH:mm'
  requiredCount: number
  excludeEventRowId?: string
}

export interface MentorSummary {
  id: string
  name: string
}

export interface CheckMentorAvailabilityResult {
  availableCount: number
  requiredCount: number
  canProceed: boolean
  availableMentors: MentorSummary[]
  unavailableMentors: MentorSummary[]
}

const BUFFER_HOURS = 1

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatTimestamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function addHours(timestamp: string, hours: number): string {
  const d = new Date(timestamp)
  d.setHours(d.getHours() + hours)
  return formatTimestamp(d)
}

export async function checkMentorAvailability(
  input: CheckMentorAvailabilityInput
): Promise<CheckMentorAvailabilityResult> {
  const supabase = await createServerSupabaseClient()

  const requestedStart = `${input.date}T${input.startTime}:00`
  const requestedEnd = `${input.date}T${input.endTime}:00`
  const bufferedStart = addHours(requestedStart, -BUFFER_HOURS)
  const bufferedEnd = addHours(requestedEnd, BUFFER_HOURS)

  // 1. 선택한 프로그램 유닛을 등록한 멘토
  const { data: mopData } = await supabase
    .from('mentor_occupation_programs')
    .select('mentor_id')
    .eq('occupation_program_unit_id', input.occupationProgramUnitId)

  const registeredMentorIds = [...new Set((mopData ?? []).map((m) => m.mentor_id))]

  if (registeredMentorIds.length === 0) {
    return { availableCount: 0, requiredCount: input.requiredCount, canProceed: false, availableMentors: [], unavailableMentors: [] }
  }

  // 2. 활동 가능 + 인증됨 + 해당 지역 커버하는 멘토
  const { data: mentorsData } = await supabase
    .from('mentors')
    .select('id, name')
    .in('id', registeredMentorIds)
    .eq('is_available', true)
    .eq('is_authenticated', true)
    .contains('available_areas', [input.area])

  const candidates = mentorsData ?? []

  if (candidates.length === 0) {
    return { availableCount: 0, requiredCount: input.requiredCount, canProceed: false, availableMentors: [], unavailableMentors: [] }
  }

  // 3. 요청 시간(±1시간 버퍼)과 겹치는 기존 일정이 있는 멘토
  const candidateIds = candidates.map((m) => m.id)
  let conflictQuery = supabase
    .from('event_rows')
    .select('mentor_id')
    .in('mentor_id', candidateIds)
    .lt('start_time', bufferedEnd)
    .gt('end_time', bufferedStart)

  if (input.excludeEventRowId) {
    conflictQuery = conflictQuery.neq('id', input.excludeEventRowId)
  }

  const { data: conflictRows } = await conflictQuery
  const conflictedMentorIds = new Set((conflictRows ?? []).map((r) => r.mentor_id).filter(Boolean) as string[])

  const availableMentors = candidates.filter((m) => !conflictedMentorIds.has(m.id))
  const unavailableMentors = candidates.filter((m) => conflictedMentorIds.has(m.id))

  return {
    availableCount: availableMentors.length,
    requiredCount: input.requiredCount,
    canProceed: availableMentors.length >= input.requiredCount,
    availableMentors,
    unavailableMentors,
  }
}
