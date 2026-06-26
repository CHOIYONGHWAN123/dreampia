'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

type ScheduleInput = {
  label: string
  start_time: string
  end_time: string
  sort_order: number
}

export type EventProgramSelectData = {
  fields: { id: string; name: string }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; name: string; occupation_id: string | null }[]
  units: { id: string; title: string; occupation_programs_id: string | null }[]
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
  occupationProgramUnitIds?: string[]
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

  if (data.occupationProgramUnitIds && data.occupationProgramUnitIds.length > 0) {
    const { error: rowsErr } = await supabase.from('event_rows').insert(
      data.occupationProgramUnitIds.map((unitId) => ({
        event_id: event.id,
        occupation_program_unit_id: unitId,
      }))
    )
    if (rowsErr) throw new Error(rowsErr.message)
  }

  revalidatePath('/institutions')
  return event.id
}
