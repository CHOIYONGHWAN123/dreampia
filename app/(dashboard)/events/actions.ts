'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// ── 재고 차감 헬퍼 ─────────────────────────────────────────────────

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

/** is_consumable=true인 준비물을 unitId 기준 Map으로 반환 */
async function fetchConsumableSupplyMap(
  supabase: Supabase,
  unitIds: string[]
): Promise<Map<string, { id: string; qty_per_person: number }>> {
  if (unitIds.length === 0) return new Map()
  const { data } = await supabase
    .from('supplies')
    .select('id, occupation_program_unit_id, qty_per_person')
    .in('occupation_program_unit_id', unitIds)
    .eq('is_consumable', true)
  return new Map(
    (data ?? []).map((s) => [
      s.occupation_program_unit_id,
      { id: s.id, qty_per_person: s.qty_per_person },
    ])
  )
}

type SupplyLogEntry = {
  supply_id: string
  stock_type: 'total'
  delta: number
  reason: string
  event_row_id: string
}

async function insertSupplyLogs(supabase: Supabase, logs: SupplyLogEntry[]) {
  if (logs.length === 0) return
  const { error } = await supabase.from('supply_logs').insert(logs)
  if (error) throw new Error(error.message)
}

// ──────────────────────────────────────────────────────────────────

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
  mentor_id?: string | null
}

export type MentorOptionForUnit = {
  id: string
  name: string
  score: number | null
  belongsToName: string | null
}

export type EventProgramSelectData = {
  fields: { id: string; name: string }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; name: string; occupation_id: string | null }[]
  units: { id: string; title: string; occupation_programs_id: string | null }[]
  mentorsByUnit: Record<string, MentorOptionForUnit[]>
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
  mentor_id: string | null
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
        'occupation_program_unit_id, start_time, end_time, classroom, instructor_waiting_room, lecture_fee, headcount, session_headcount, mentor_id'
      )
      .eq('event_id', id),
  ])
  if (!event) return null
  return { event, schedules: schedules ?? [], eventRows: eventRows ?? [] }
}

export async function getEventProgramSelectData(): Promise<EventProgramSelectData> {
  const supabase = await createServerSupabaseClient()
  const [fieldsRes, occsRes, progsRes, unitsRes, mopRes, mentorsRes] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase.from('occupation_program_unit').select('id, title, occupation_programs_id').order('title'),
    supabase.from('mentor_occupation_programs').select('mentor_id, occupation_program_unit_id'),
    supabase.from('mentors').select('id, name, score, belongs_to'),
  ])

  const mentorMap = new Map((mentorsRes.data ?? []).map((m) => [m.id, m]))
  const mentorsByUnit: Record<string, MentorOptionForUnit[]> = {}
  for (const row of mopRes.data ?? []) {
    if (!row.occupation_program_unit_id || !row.mentor_id) continue
    const mentor = mentorMap.get(row.mentor_id)
    if (!mentor) continue
    const list = mentorsByUnit[row.occupation_program_unit_id] ?? []
    list.push({
      id: mentor.id,
      name: mentor.name,
      score: mentor.score,
      belongsToName: mentor.belongs_to ? mentorMap.get(mentor.belongs_to)?.name ?? null : null,
    })
    mentorsByUnit[row.occupation_program_unit_id] = list
  }

  return {
    fields: fieldsRes.data ?? [],
    occupations: (occsRes.data ?? []) as { id: string; name: string; field_id: string | null }[],
    programs: (progsRes.data ?? []) as { id: string; name: string; occupation_id: string | null }[],
    units: unitsRes.data ?? [],
    mentorsByUnit,
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
    // event_rows 삽입 후 ID를 받아 supply_logs에 event_row_id로 기록
    const { data: insertedRows, error: rowsErr } = await supabase
      .from('event_rows')
      .insert(
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
          mentor_id: r.mentor_id || null,
        }))
      )
      .select('id, occupation_program_unit_id')
    if (rowsErr) throw new Error(rowsErr.message)

    // unitId → event_row_id 맵
    const eventRowIdByUnit = new Map(
      (insertedRows ?? []).map((r) => [r.occupation_program_unit_id, r.id])
    )

    // is_consumable 준비물 재고 차감 (headcount × qty_per_person)
    const unitIds = data.eventRows.map((r) => r.occupation_program_unit_id)
    const supplyMap = await fetchConsumableSupplyMap(supabase, unitIds)
    const supplyLogs: SupplyLogEntry[] = []
    for (const r of data.eventRows) {
      if (!r.headcount || r.headcount <= 0) continue
      const supply = supplyMap.get(r.occupation_program_unit_id)
      if (!supply) continue
      const eventRowId = eventRowIdByUnit.get(r.occupation_program_unit_id)
      if (!eventRowId) continue
      supplyLogs.push({
        supply_id: supply.id,
        stock_type: 'total',
        delta: -(r.headcount * supply.qty_per_person),
        reason: '행사 재고 차감',
        event_row_id: eventRowId,
      })
    }
    await insertSupplyLogs(supabase, supplyLogs)
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

  // event_rows는 attendance 등 폼 외부에서 채워지는 값이 있으므로 통째로 갈아엎지 않고
  // occupation_program_unit_id 기준으로 매칭해 갱신하고, 폼에서 제거된 유닛만 삭제한다.
  const { data: existingRows, error: existingErr } = await supabase
    .from('event_rows')
    .select('id, occupation_program_unit_id, headcount')
    .eq('event_id', id)
  if (existingErr) throw new Error(existingErr.message)

  const existingByUnit = new Map(
    (existingRows ?? []).map((r) => [r.occupation_program_unit_id, { id: r.id, headcount: r.headcount }])
  )
  const incomingUnitIds = new Set((data.eventRows ?? []).map((r) => r.occupation_program_unit_id))

  const rowsToDelete = (existingRows ?? []).filter((r) => !incomingUnitIds.has(r.occupation_program_unit_id))
  const idsToDelete = rowsToDelete.map((r) => r.id)
  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase.from('event_rows').delete().in('id', idsToDelete)
    if (delErr) throw new Error(delErr.message)
  }

  // 재고 조정에 필요한 전체 unitId 목록으로 is_consumable 준비물 조회
  const allUnitIds = [
    ...(data.eventRows ?? []).map((r) => r.occupation_program_unit_id),
    ...rowsToDelete.map((r) => r.occupation_program_unit_id),
  ]
  const supplyMap = await fetchConsumableSupplyMap(supabase, [...new Set(allUnitIds)])
  const supplyLogs: SupplyLogEntry[] = []

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
      mentor_id: r.mentor_id || null,
    }
    const existing = existingByUnit.get(r.occupation_program_unit_id)
    if (existing) {
      const { error: updErr } = await supabase.from('event_rows').update(fields).eq('id', existing.id)
      if (updErr) throw new Error(updErr.message)

      // headcount 변화분만큼 조정
      const supply = supplyMap.get(r.occupation_program_unit_id)
      if (supply) {
        const diff = (r.headcount ?? 0) - (existing.headcount ?? 0)
        if (diff !== 0) {
          supplyLogs.push({
            supply_id: supply.id,
            stock_type: 'total',
            delta: -(diff * supply.qty_per_person),
            reason: diff > 0 ? '행사 인원 증가 재고 차감' : '행사 인원 감소 재고 복원',
            event_row_id: existing.id,
          })
        }
      }
    } else {
      const { data: newRow, error: insErr } = await supabase
        .from('event_rows')
        .insert({ event_id: id, occupation_program_unit_id: r.occupation_program_unit_id, ...fields })
        .select('id')
        .single()
      if (insErr) throw new Error(insErr.message)

      // 신규 추가 유닛 전량 차감
      const supply = supplyMap.get(r.occupation_program_unit_id)
      if (supply && (r.headcount ?? 0) > 0 && newRow) {
        supplyLogs.push({
          supply_id: supply.id,
          stock_type: 'total',
          delta: -(r.headcount! * supply.qty_per_person),
          reason: '행사 재고 차감',
          event_row_id: newRow.id,
        })
      }
    }
  }

  // 제거된 유닛 재고 복원 (event_row가 삭제되면 event_row_id FK는 on delete set null)
  for (const removed of rowsToDelete) {
    const supply = supplyMap.get(removed.occupation_program_unit_id)
    if (supply && (removed.headcount ?? 0) > 0) {
      supplyLogs.push({
        supply_id: supply.id,
        stock_type: 'total',
        delta: +(removed.headcount! * supply.qty_per_person),
        reason: '행사 프로그램 제거 재고 복원',
        event_row_id: removed.id,
      })
    }
  }

  await insertSupplyLogs(supabase, supplyLogs)

  revalidatePath('/institutions')
  revalidatePath(`/events/${id}`)
}

export async function deleteEvent(id: string) {
  const supabase = await createServerSupabaseClient()

  // 삭제 전 event_rows 조회 → 차감됐던 재고 복원
  const { data: rows } = await supabase
    .from('event_rows')
    .select('id, occupation_program_unit_id, headcount')
    .eq('event_id', id)

  if (rows && rows.length > 0) {
    const unitIds = rows.map((r) => r.occupation_program_unit_id).filter(Boolean) as string[]
    const supplyMap = await fetchConsumableSupplyMap(supabase, unitIds)
    const supplyLogs: SupplyLogEntry[] = []

    for (const r of rows) {
      if (!r.occupation_program_unit_id || (r.headcount ?? 0) <= 0) continue
      const supply = supplyMap.get(r.occupation_program_unit_id)
      if (!supply) continue
      supplyLogs.push({
        supply_id: supply.id,
        stock_type: 'total',
        delta: +(r.headcount! * supply.qty_per_person),
        reason: '행사 삭제 재고 복원',
        event_row_id: r.id,
      })
    }
    await insertSupplyLogs(supabase, supplyLogs)
  }

  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/institutions')
}
