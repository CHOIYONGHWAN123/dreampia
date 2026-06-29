'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

type ScheduleInput = {
  label: string
  start_time: string
  end_time: string
  sort_order: number
}

type EventRowInput = {
  occupation_program_unit_id: string
  start_time?: string | null
  end_time?: string | null
  classroom?: string | null
  instructor_waiting_room?: string | null
  lecture_fee?: number | null
  lecture_fee_after_tax?: number | null
  headcount?: number | null
  session_headcount?: number | null
}

export type EventProgramSelectData = {
  fields: { id: string; name: string }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; name: string; occupation_id: string | null }[]
  units: { id: string; title: string; occupation_programs_id: string | null }[]
}

const EVENT_DETAIL_COLUMNS =
  'id, name, campaign_id, institution_id, created_at, event_start_at, event_end_at, target_grade, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note, student_rotation, notice, prep_note, memo, contact_name, contact_email, contact_phone, inflow_source, institution_type, sales_admin_id, budget, estimate_file_url, comm_admin_id'

export type EventDetailData = {
  id: string
  name: string
  campaign_id: string | null
  institution_id: string | null
  created_at: string
  event_start_at: string | null
  event_end_at: string | null
  target_grade: string | null
  laptop_wifi_note: string | null
  crime_check_method: string | null
  crime_check_info: string | null
  indoor_shoes_note: string | null
  parking_note: string | null
  student_rotation: string | null
  notice: string | null
  prep_note: string | null
  memo: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  inflow_source: string | null
  institution_type: string | null
  sales_admin_id: string | null
  budget: number | null
  estimate_file_url: string | null
  comm_admin_id: string | null
}

export type EventScheduleRow = {
  label: string
  start_time: string
  end_time: string
}

export type EventRowDetailData = {
  occupation_program_unit_id: string | null
  start_time: string | null
  end_time: string | null
  classroom: string | null
  instructor_waiting_room: string | null
  lecture_fee: number | null
  headcount: number | null
  session_headcount: number | null
}

export async function getEventDetail(id: string): Promise<{
  event: EventDetailData
  schedules: EventScheduleRow[]
  eventRows: EventRowDetailData[]
} | null> {
  const supabase = await createServerSupabaseClient()
  const [{ data: event }, { data: schedules }, { data: eventRows }] = await Promise.all([
    supabase.from('events').select(EVENT_DETAIL_COLUMNS).eq('id', id).single(),
    supabase.from('event_schedules').select('label, start_time, end_time').eq('event_id', id).order('sort_order'),
    supabase
      .from('event_rows')
      .select(
        'occupation_program_unit_id, start_time, end_time, classroom, instructor_waiting_room, lecture_fee, headcount, session_headcount'
      )
      .eq('event_id', id),
  ])
  if (!event) return null
  return { event, schedules: schedules ?? [], eventRows: eventRows ?? [] }
}

export async function getEventProgramSelectData(): Promise<EventProgramSelectData> {
  const supabase = await createServerSupabaseClient()
  const [fieldsRes, occsRes, progsRes, unitsRes] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase.from('occupation_program_unit').select('id, title, occupation_programs_id').order('title'),
  ])
  return {
    fields: fieldsRes.data ?? [],
    occupations: (occsRes.data ?? []) as { id: string; name: string; field_id: string | null }[],
    programs: (progsRes.data ?? []) as { id: string; name: string; occupation_id: string | null }[],
    units: unitsRes.data ?? [],
  }
}

export async function createEvent(data: {
  reception_date?: string
  name: string
  campaign_id?: string | null
  institution_id?: string | null
  event_start_at?: string | null
  event_end_at?: string | null
  target_grade?: string | null
  laptop_wifi_note?: string | null
  crime_check_method?: string | null
  crime_check_info?: string | null
  indoor_shoes_note?: string | null
  parking_note?: string | null
  student_rotation?: string | null
  notice?: string | null
  prep_note?: string | null
  memo?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  inflow_source?: string | null
  institution_type?: string | null
  sales_admin_id?: string | null
  budget?: number | null
  estimate_file_url?: string
  comm_admin_id?: string | null
  schedules?: ScheduleInput[]
  eventRows?: EventRowInput[]
}) {
  const supabase = await createServerSupabaseClient()

  const payload: Record<string, unknown> = {
    name: data.name,
    campaign_id: data.campaign_id || null,
    institution_id: data.institution_id || null,
    event_start_at: data.event_start_at || null,
    event_end_at: data.event_end_at || null,
    target_grade: data.target_grade || null,
    laptop_wifi_note: data.laptop_wifi_note || null,
    crime_check_method: data.crime_check_method || null,
    crime_check_info: data.crime_check_info || null,
    indoor_shoes_note: data.indoor_shoes_note || null,
    parking_note: data.parking_note || null,
    student_rotation: data.student_rotation || null,
    notice: data.notice || null,
    prep_note: data.prep_note || null,
    memo: data.memo || null,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    inflow_source: data.inflow_source || null,
    institution_type: data.institution_type || null,
    sales_admin_id: data.sales_admin_id || null,
    budget: data.budget ?? null,
    estimate_file_url: data.estimate_file_url || null,
    comm_admin_id: data.comm_admin_id || null,
    event_check_status: 1,
    recruit_status: '섭외대기',
  }

  if (data.reception_date) {
    payload.created_at = new Date(data.reception_date).toISOString()
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  if (data.schedules && data.schedules.length > 0) {
    const valid = data.schedules.filter((s) => s.start_time && s.end_time)
    if (valid.length > 0) {
      const { error: schedErr } = await supabase.from('event_schedules').insert(
        valid.map((s) => ({
          event_id: event.id,
          label: s.label,
          start_time: s.start_time,
          end_time: s.end_time,
          sort_order: s.sort_order,
        }))
      )
      if (schedErr) throw new Error(schedErr.message)
    }
  }

  if (data.eventRows && data.eventRows.length > 0) {
    const { error: rowsErr } = await supabase.from('event_rows').insert(
      data.eventRows.map((r) => ({
        event_id: event.id,
        occupation_program_unit_id: r.occupation_program_unit_id,
        start_time: r.start_time || null,
        end_time: r.end_time || null,
        classroom: r.classroom || null,
        instructor_waiting_room: r.instructor_waiting_room || null,
        lecture_fee: r.lecture_fee ?? null,
        lecture_fee_after_tax: r.lecture_fee_after_tax ?? null,
        headcount: r.headcount ?? null,
        session_headcount: r.session_headcount ?? null,
      }))
    )
    if (rowsErr) throw new Error(rowsErr.message)
  }

  revalidatePath('/institutions')
  return event.id
}

export async function updateEvent(
  id: string,
  data: {
    reception_date?: string
    name: string
    campaign_id?: string | null
    institution_id?: string | null
    event_start_at?: string | null
    event_end_at?: string | null
    target_grade?: string | null
    laptop_wifi_note?: string | null
    crime_check_method?: string | null
    crime_check_info?: string | null
    indoor_shoes_note?: string | null
    parking_note?: string | null
    student_rotation?: string | null
    notice?: string | null
    prep_note?: string | null
    memo?: string | null
    contact_name?: string | null
    contact_email?: string | null
    contact_phone?: string | null
    inflow_source?: string | null
    institution_type?: string | null
    sales_admin_id?: string | null
    budget?: number | null
    estimate_file_url?: string
    comm_admin_id?: string | null
    schedules?: ScheduleInput[]
    eventRows?: EventRowInput[]
  }
) {
  const supabase = await createServerSupabaseClient()

  const payload: Record<string, unknown> = {
    name: data.name,
    campaign_id: data.campaign_id || null,
    institution_id: data.institution_id || null,
    event_start_at: data.event_start_at || null,
    event_end_at: data.event_end_at || null,
    target_grade: data.target_grade || null,
    laptop_wifi_note: data.laptop_wifi_note || null,
    crime_check_method: data.crime_check_method || null,
    crime_check_info: data.crime_check_info || null,
    indoor_shoes_note: data.indoor_shoes_note || null,
    parking_note: data.parking_note || null,
    student_rotation: data.student_rotation || null,
    notice: data.notice || null,
    prep_note: data.prep_note || null,
    memo: data.memo || null,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    inflow_source: data.inflow_source || null,
    institution_type: data.institution_type || null,
    sales_admin_id: data.sales_admin_id || null,
    budget: data.budget ?? null,
    estimate_file_url: data.estimate_file_url || null,
    comm_admin_id: data.comm_admin_id || null,
  }

  if (data.reception_date) {
    payload.created_at = new Date(data.reception_date).toISOString()
  }

  const { error } = await supabase.from('events').update(payload).eq('id', id)
  if (error) throw new Error(error.message)

  // 시정표는 통째로 교체 (다른 테이블에서 참조하지 않음)
  const { error: schedDelErr } = await supabase.from('event_schedules').delete().eq('event_id', id)
  if (schedDelErr) throw new Error(schedDelErr.message)

  const validSchedules = (data.schedules ?? []).filter((s) => s.start_time && s.end_time)
  if (validSchedules.length > 0) {
    const { error: schedErr } = await supabase.from('event_schedules').insert(
      validSchedules.map((s) => ({
        event_id: id,
        label: s.label,
        start_time: s.start_time,
        end_time: s.end_time,
        sort_order: s.sort_order,
      }))
    )
    if (schedErr) throw new Error(schedErr.message)
  }

  // event_rows는 mentor_id/attendance 등 폼 외부에서 채워지는 값이 있으므로
  // occupation_program_unit_id 기준으로 매칭해 갱신하고, 폼에서 제거된 유닛만 삭제한다.
  const { data: existingRows, error: existingErr } = await supabase
    .from('event_rows')
    .select('id, occupation_program_unit_id')
    .eq('event_id', id)
  if (existingErr) throw new Error(existingErr.message)

  const existingByUnit = new Map(
    (existingRows ?? []).map((r) => [r.occupation_program_unit_id, r.id])
  )
  const incomingUnitIds = new Set((data.eventRows ?? []).map((r) => r.occupation_program_unit_id))

  const idsToDelete = (existingRows ?? [])
    .filter((r) => !incomingUnitIds.has(r.occupation_program_unit_id))
    .map((r) => r.id)
  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase.from('event_rows').delete().in('id', idsToDelete)
    if (delErr) throw new Error(delErr.message)
  }

  for (const r of data.eventRows ?? []) {
    const fields = {
      start_time: r.start_time || null,
      end_time: r.end_time || null,
      classroom: r.classroom || null,
      instructor_waiting_room: r.instructor_waiting_room || null,
      lecture_fee: r.lecture_fee ?? null,
      lecture_fee_after_tax: r.lecture_fee_after_tax ?? null,
      headcount: r.headcount ?? null,
      session_headcount: r.session_headcount ?? null,
    }
    const existingId = existingByUnit.get(r.occupation_program_unit_id)
    if (existingId) {
      const { error: updErr } = await supabase.from('event_rows').update(fields).eq('id', existingId)
      if (updErr) throw new Error(updErr.message)
    } else {
      const { error: insErr } = await supabase
        .from('event_rows')
        .insert({ event_id: id, occupation_program_unit_id: r.occupation_program_unit_id, ...fields })
      if (insErr) throw new Error(insErr.message)
    }
  }

  revalidatePath('/institutions')
  revalidatePath(`/events/${id}`)
}
