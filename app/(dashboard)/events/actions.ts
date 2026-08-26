'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

type ElevatorStatus = '있음' | '없음' | '확인필요'

// ── 재고 차감 헬퍼 ─────────────────────────────────────────────────

type Supabase = Awaited<ReturnType<typeof createServerSupabaseClient>>

/**
 * is_consumable=true인 준비물을 unitId 기준 Map으로 반환.
 * 재고는 occupation_programs(프로그램) 단위로 관리되므로, unitId → 소속 program →
 * supply 순으로 역매핑한다. 같은 프로그램의 유닛(예: 초등/중고등)은 같은 supply를
 * 가리키게 되어 자연히 재고를 공유한다.
 */
async function fetchConsumableSupplyMap(
  supabase: Supabase,
  unitIds: string[]
): Promise<Map<string, { id: string; qty_per_person: number }>> {
  if (unitIds.length === 0) return new Map()

  const { data: units } = await supabase
    .from('occupation_program_unit')
    .select('id, occupation_programs_id')
    .in('id', unitIds)
  const programIds = [...new Set((units ?? []).map((u) => u.occupation_programs_id).filter(Boolean))] as string[]
  if (programIds.length === 0) return new Map()

  const { data: supplies } = await supabase
    .from('supplies')
    .select('id, occupation_programs_id, qty_per_person')
    .in('occupation_programs_id', programIds)
    .eq('is_consumable', true)
  const supplyByProgram = new Map(
    (supplies ?? []).map((s) => [s.occupation_programs_id, { id: s.id, qty_per_person: s.qty_per_person }])
  )

  const result = new Map<string, { id: string; qty_per_person: number }>()
  for (const u of units ?? []) {
    if (!u.occupation_programs_id) continue
    const supply = supplyByProgram.get(u.occupation_programs_id)
    if (supply) result.set(u.id, supply)
  }
  return result
}

type SupplyLogEntry = {
  supply_id: string
  stock_type: 'kit'
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
  id?: string | null
  occupation_program_unit_id: string
  start_time?: string | null
  end_time?: string | null
  classroom?: string | null
  instructor_waiting_room?: string | null
  target?: string | null
  lecture_fee?: number | null
  lecture_fee_after_tax?: number | null
  headcount?: number | null
  session_headcount?: number | null
  school_request_response?: string | null
  remarks?: string | null
  criminal_background_check?: string | null
  supplies_prepared?: boolean | null
}

export type MentorOptionForUnit = {
  id: string
  name: string
  score: number | null
  belongsToName: string | null
  schoolRequestNote: string | null
  lectureFeePayerName: string | null
  materialFeePayerName: string | null
}

export type EventProgramSelectData = {
  eventCategories: { id: string; name: string }[]
  fields: { id: string; name: string; event_category_ids: string[] }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; name: string; occupation_id: string | null }[]
  units: {
    id: string
    title: string
    occupation_programs_id: string | null
    school_level: string | null
    school_request_note: string | null
    final_product_available: boolean | null
    is_delivery_available: boolean | null
    mentor_material_cost: number | null
    dreampia_material_cost: number | null
    prep_by: string | null
  }[]
  mentorsByUnit: Record<string, MentorOptionForUnit[]>
}

const EVENT_DETAIL_COLUMNS =
  'id, name, institution_id, event_category_id, created_at, event_start_at, event_end_at, target_grade, instructor_waiting_room, admin_contact, has_elevator, floor_map_url, laptop_wifi_note, crime_check_method, crime_check_info, indoor_shoes_note, parking_note, student_rotation, notice, prep_note, memo, school_request_note, contact_name, contact_email, contact_phone, teacher_name, inflow_source, institution_type, sales_admin_id, budget, final_budget, estimate_file_url, transaction_statement_file_url, comm_admin_id, comm_content'

export type EventDetailData = {
  id: string
  name: string
  institution_id: string | null
  event_category_id: string | null
  created_at: string
  event_start_at: string | null
  event_end_at: string | null
  target_grade: string | null
  instructor_waiting_room: string | null
  admin_contact: string | null
  has_elevator: ElevatorStatus
  floor_map_url: string | null
  laptop_wifi_note: string | null
  crime_check_method: string | null
  crime_check_info: string | null
  indoor_shoes_note: string | null
  parking_note: string | null
  student_rotation: string | null
  notice: string | null
  prep_note: string | null
  memo: string | null
  school_request_note: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  teacher_name: string | null
  inflow_source: string | null
  institution_type: string | null
  sales_admin_id: string | null
  budget: number | null
  final_budget: number | null
  estimate_file_url: string | null
  transaction_statement_file_url: string | null
  comm_admin_id: string | null
  comm_content: string | null
}

export type EventScheduleRow = {
  label: string
  start_time: string
  end_time: string
}

export type EventRowDetailData = {
  id: string
  occupation_program_unit_id: string | null
  start_time: string | null
  end_time: string | null
  classroom: string | null
  instructor_waiting_room: string | null
  target: string | null
  lecture_fee: number | null
  headcount: number | null
  session_headcount: number | null
  mentor_id: string | null
  school_request_response: string | null
  remarks: string | null
  attendance: boolean | null
  criminal_background_check: string | null
  supplies_prepared: boolean
}

export type EventRowPhoto = { id: string; url: string }

export async function getEventDetail(id: string): Promise<{
  event: EventDetailData
  schedules: EventScheduleRow[]
  eventRows: EventRowDetailData[]
  photosByRow: Record<string, EventRowPhoto[]>
} | null> {
  const supabase = await createServerSupabaseClient()
  const [{ data: event }, { data: schedules }, { data: eventRows }] = await Promise.all([
    supabase.from('events').select(EVENT_DETAIL_COLUMNS).eq('id', id).single(),
    supabase.from('event_schedules').select('label, start_time, end_time').eq('event_id', id).order('sort_order'),
    supabase
      .from('event_rows')
      .select(
        'id, occupation_program_unit_id, start_time, end_time, classroom, instructor_waiting_room, target, lecture_fee, headcount, session_headcount, mentor_id, school_request_response, remarks, attendance, criminal_background_check, supplies_prepared'
      )
      .eq('event_id', id)
      .order('start_time', { ascending: true, nullsFirst: false }),
  ])
  if (!event) return null

  const rowIds = (eventRows ?? []).map((r) => r.id)
  const { data: photos } = rowIds.length > 0
    ? await supabase.from('event_photos').select('id, event_rows_id, url').in('event_rows_id', rowIds)
    : { data: [] as { id: string; event_rows_id: string; url: string }[] }

  const photosByRow: Record<string, EventRowPhoto[]> = {}
  for (const p of photos ?? []) {
    const list = photosByRow[p.event_rows_id] ?? []
    list.push({ id: p.id, url: p.url })
    photosByRow[p.event_rows_id] = list
  }

  return { event, schedules: schedules ?? [], eventRows: eventRows ?? [], photosByRow }
}

export async function getEventProgramSelectData(): Promise<EventProgramSelectData> {
  const supabase = await createServerSupabaseClient()
  const [eventCategoriesRes, fieldsRes, fieldEcRes, occsRes, progsRes, unitsRes, mopRes, mentorsRes] = await Promise.all([
    supabase.from('event_categories').select('id, name').order('sort_order'),
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('field_event_categories').select('field_id, event_category_id'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase
      .from('occupation_programs')
      .select('id, name, occupation_id, mentor_material_cost, dreampia_material_cost, prep_by')
      .order('name'),
    supabase
      .from('occupation_program_unit')
      .select(
        'id, title, occupation_programs_id, school_level, school_request_note, final_product_available, is_delivery_available'
      )
      .order('title'),
    supabase
      .from('mentor_occupation_programs')
      .select('mentor_id, occupation_program_unit_id, school_request_note, lecture_fee_payer_id, material_fee_payer_id'),
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
      schoolRequestNote: row.school_request_note,
      lectureFeePayerName: row.lecture_fee_payer_id ? mentorMap.get(row.lecture_fee_payer_id)?.name ?? null : null,
      materialFeePayerName: row.material_fee_payer_id ? mentorMap.get(row.material_fee_payer_id)?.name ?? null : null,
    })
    mentorsByUnit[row.occupation_program_unit_id] = list
  }

  const eventCategoryIdsByField = new Map<string, string[]>()
  for (const l of fieldEcRes.data ?? []) {
    const list = eventCategoryIdsByField.get(l.field_id) ?? []
    list.push(l.event_category_id)
    eventCategoryIdsByField.set(l.field_id, list)
  }

  // 재료비/준비주체는 프로그램(occupation_programs) 단위로 관리되므로, 유닛에는 소속
  // 프로그램의 값을 그대로 병합해서 내려준다 (units[].mentor_material_cost/
  // dreampia_material_cost/prep_by 출력 형태는 유지).
  const programCostMap = new Map(
    (progsRes.data ?? []).map((p) => [
      p.id,
      { mentor: p.mentor_material_cost, dreampia: p.dreampia_material_cost, prepBy: p.prep_by },
    ])
  )

  return {
    eventCategories: eventCategoriesRes.data ?? [],
    fields: (fieldsRes.data ?? []).map((f) => ({ ...f, event_category_ids: eventCategoryIdsByField.get(f.id) ?? [] })),
    occupations: (occsRes.data ?? []) as { id: string; name: string; field_id: string | null }[],
    programs: (progsRes.data ?? []) as { id: string; name: string; occupation_id: string | null }[],
    units: (unitsRes.data ?? []).map((u) => {
      const cost = u.occupation_programs_id ? programCostMap.get(u.occupation_programs_id) : undefined
      return {
        ...u,
        mentor_material_cost: cost?.mentor ?? null,
        dreampia_material_cost: cost?.dreampia ?? null,
        prep_by: cost?.prepBy ?? null,
      }
    }),
    mentorsByUnit,
  }
}

export async function createEvent(data: {
  reception_date?: string
  name: string
  institution_id?: string | null
  event_category_id?: string | null
  event_start_at?: string | null
  event_end_at?: string | null
  target_grade?: string | null
  instructor_waiting_room?: string | null
  admin_contact?: string | null
  has_elevator?: ElevatorStatus | null
  floor_map_url?: string
  laptop_wifi_note?: string | null
  crime_check_method?: string | null
  crime_check_info?: string | null
  indoor_shoes_note?: string | null
  parking_note?: string | null
  student_rotation?: string | null
  notice?: string | null
  prep_note?: string | null
  memo?: string | null
  school_request_note?: string | null
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  teacher_name?: string | null
  inflow_source?: string | null
  institution_type?: string | null
  sales_admin_id?: string | null
  budget?: number | null
  final_budget?: number | null
  estimate_file_url?: string
  transaction_statement_file_url?: string
  comm_admin_id?: string | null
  comm_content?: string | null
  schedules?: ScheduleInput[]
  eventRows?: EventRowInput[]
}) {
  const supabase = await createServerSupabaseClient()

  const payload: Record<string, unknown> = {
    name: data.name,
    institution_id: data.institution_id || null,
    event_category_id: data.event_category_id || null,
    event_start_at: data.event_start_at || null,
    event_end_at: data.event_end_at || null,
    target_grade: data.target_grade || null,
    instructor_waiting_room: data.instructor_waiting_room || null,
    admin_contact: data.admin_contact || null,
    has_elevator: data.has_elevator ?? '확인필요',
    floor_map_url: data.floor_map_url || null,
    laptop_wifi_note: data.laptop_wifi_note || null,
    crime_check_method: data.crime_check_method || null,
    crime_check_info: data.crime_check_info || null,
    indoor_shoes_note: data.indoor_shoes_note || null,
    parking_note: data.parking_note || null,
    student_rotation: data.student_rotation || null,
    notice: data.notice || null,
    prep_note: data.prep_note || null,
    memo: data.memo || null,
    school_request_note: data.school_request_note || null,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    teacher_name: data.teacher_name || null,
    inflow_source: data.inflow_source || null,
    institution_type: data.institution_type || null,
    sales_admin_id: data.sales_admin_id || null,
    budget: data.budget ?? null,
    final_budget: data.final_budget ?? null,
    estimate_file_url: data.estimate_file_url || null,
    transaction_statement_file_url: data.transaction_statement_file_url || null,
    comm_admin_id: data.comm_admin_id || null,
    comm_content: data.comm_content || null,
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
    // (동일 프로그램 유닛이 여러 행으로 들어올 수 있으므로 unitId가 아닌 입력 순서로 매칭한다)
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
          target: r.target || null,
          lecture_fee: r.lecture_fee ?? null,
          lecture_fee_after_tax: r.lecture_fee_after_tax ?? null,
          headcount: r.headcount ?? null,
          session_headcount: r.session_headcount ?? null,
          school_request_response: r.school_request_response || null,
          remarks: r.remarks || null,
          criminal_background_check: r.criminal_background_check || null,
          supplies_prepared: r.supplies_prepared ?? false,
        }))
      )
      .select('id')
    if (rowsErr) throw new Error(rowsErr.message)

    // is_consumable 준비물 재고 차감 (headcount × qty_per_person)
    const unitIds = data.eventRows.map((r) => r.occupation_program_unit_id)
    const supplyMap = await fetchConsumableSupplyMap(supabase, unitIds)
    const supplyLogs: SupplyLogEntry[] = []
    data.eventRows.forEach((r, i) => {
      if (!r.headcount || r.headcount <= 0) return
      const supply = supplyMap.get(r.occupation_program_unit_id)
      if (!supply) return
      const eventRowId = insertedRows?.[i]?.id
      if (!eventRowId) return
      supplyLogs.push({
        supply_id: supply.id,
        stock_type: 'kit',
        delta: -(r.headcount * supply.qty_per_person),
        reason: '행사 재고 차감',
        event_row_id: eventRowId,
      })
    })
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
    institution_id?: string | null
    event_category_id?: string | null
    event_start_at?: string | null
    event_end_at?: string | null
    target_grade?: string | null
    instructor_waiting_room?: string | null
    admin_contact?: string | null
    has_elevator?: ElevatorStatus | null
    floor_map_url?: string
    laptop_wifi_note?: string | null
    crime_check_method?: string | null
    crime_check_info?: string | null
    indoor_shoes_note?: string | null
    parking_note?: string | null
    student_rotation?: string | null
    notice?: string | null
    prep_note?: string | null
    memo?: string | null
    school_request_note?: string | null
    contact_name?: string | null
    contact_email?: string | null
    contact_phone?: string | null
    teacher_name?: string | null
    inflow_source?: string | null
    institution_type?: string | null
    sales_admin_id?: string | null
    budget?: number | null
    final_budget?: number | null
    estimate_file_url?: string
    transaction_statement_file_url?: string
    comm_admin_id?: string | null
    comm_content?: string | null
    schedules?: ScheduleInput[]
    eventRows?: EventRowInput[]
  }
) {
  const supabase = await createServerSupabaseClient()

  const payload: Record<string, unknown> = {
    name: data.name,
    institution_id: data.institution_id || null,
    event_category_id: data.event_category_id || null,
    event_start_at: data.event_start_at || null,
    event_end_at: data.event_end_at || null,
    target_grade: data.target_grade || null,
    instructor_waiting_room: data.instructor_waiting_room || null,
    admin_contact: data.admin_contact || null,
    has_elevator: data.has_elevator ?? '확인필요',
    floor_map_url: data.floor_map_url || null,
    laptop_wifi_note: data.laptop_wifi_note || null,
    crime_check_method: data.crime_check_method || null,
    crime_check_info: data.crime_check_info || null,
    indoor_shoes_note: data.indoor_shoes_note || null,
    parking_note: data.parking_note || null,
    student_rotation: data.student_rotation || null,
    notice: data.notice || null,
    prep_note: data.prep_note || null,
    memo: data.memo || null,
    school_request_note: data.school_request_note || null,
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    contact_phone: data.contact_phone || null,
    teacher_name: data.teacher_name || null,
    inflow_source: data.inflow_source || null,
    institution_type: data.institution_type || null,
    sales_admin_id: data.sales_admin_id || null,
    budget: data.budget ?? null,
    final_budget: data.final_budget ?? null,
    estimate_file_url: data.estimate_file_url || null,
    transaction_statement_file_url: data.transaction_statement_file_url || null,
    comm_admin_id: data.comm_admin_id || null,
    comm_content: data.comm_content || null,
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
  // event_row id 기준으로 매칭해 갱신한다 (동일 프로그램 유닛이 여러 행으로 존재할 수 있으므로
  // occupation_program_unit_id가 아닌 행 고유 id로 매칭해야 한다). 폼에서 제거된 행만 삭제한다.
  const { data: existingRows, error: existingErr } = await supabase
    .from('event_rows')
    .select('id, occupation_program_unit_id, headcount')
    .eq('event_id', id)
  if (existingErr) throw new Error(existingErr.message)

  const existingById = new Map((existingRows ?? []).map((r) => [r.id, r]))
  const incomingIds = new Set((data.eventRows ?? []).map((r) => r.id).filter(Boolean) as string[])

  const rowsToDelete = (existingRows ?? []).filter((r) => !incomingIds.has(r.id))
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
    // criminal_background_check(회보서)는 attendance와 마찬가지로 멘토 앱에서 폼 외부에
    // 채워질 수 있는 값이라, 여기 통째로 갱신되는 fields에는 넣지 않는다 — 관리자가 폼을 여는
    // 사이 멘토가 올린 최신 파일을 관리자의 오래된 로컬 상태로 덮어쓰는 것을 방지하기 위함.
    // 관리자가 대신 업로드하는 경우는 updateEventRowCriminalBackgroundCheck로 즉시 반영한다.
    const fields = {
      start_time: r.start_time || null,
      end_time: r.end_time || null,
      classroom: r.classroom || null,
      instructor_waiting_room: r.instructor_waiting_room || null,
      target: r.target || null,
      lecture_fee: r.lecture_fee ?? null,
      lecture_fee_after_tax: r.lecture_fee_after_tax ?? null,
      headcount: r.headcount ?? null,
      session_headcount: r.session_headcount ?? null,
      school_request_response: r.school_request_response || null,
      remarks: r.remarks || null,
      supplies_prepared: r.supplies_prepared ?? false,
    }
    const existing = r.id ? existingById.get(r.id) : undefined
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
            stock_type: 'kit',
            delta: -(diff * supply.qty_per_person),
            reason: diff > 0 ? '행사 인원 증가 재고 차감' : '행사 인원 감소 재고 복원',
            event_row_id: existing.id,
          })
        }
      }
    } else {
      const { data: newRow, error: insErr } = await supabase
        .from('event_rows')
        .insert({
          event_id: id,
          occupation_program_unit_id: r.occupation_program_unit_id,
          ...fields,
          criminal_background_check: r.criminal_background_check || null,
        })
        .select('id')
        .single()
      if (insErr) throw new Error(insErr.message)

      // 신규 추가 유닛 전량 차감
      const supply = supplyMap.get(r.occupation_program_unit_id)
      if (supply && (r.headcount ?? 0) > 0 && newRow) {
        supplyLogs.push({
          supply_id: supply.id,
          stock_type: 'kit',
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
        stock_type: 'kit',
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

// 회보서(criminal_background_check)는 멘토가 직접 앱에서 올리는 것이 기본이지만,
// 멘토가 자기서비스로 못 올리는 경우 관리자가 대신 올릴 수 있어야 한다. updateEvent의
// 통짜 저장 흐름에 끼워 넣으면 다른 관리자가 폼을 여는 사이 멘토가 올린 최신 파일을
// 오래된 로컬 상태로 덮어쓸 위험이 있어, 별도 액션으로 즉시 반영한다.
export async function updateEventRowCriminalBackgroundCheck(
  eventRowId: string,
  url: string | null
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('event_rows')
    .update({ criminal_background_check: url })
    .eq('id', eventRowId)
  if (error) throw new Error(error.message)
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
        stock_type: 'kit',
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
