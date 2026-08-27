'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// ── A(행사 단위) — events 테이블에 그대로 유지 ──────────────────────────

type EventUpdateData = {
  contract_type?: string | null
  contract_method?: string | null
  admin_docs_delivered?: boolean | null // 행정서류전달여부 — 행정서류폴더와 같은 A(행사 단위) 취급
  comm_admin_id?: string | null
  sales_admin_id?: string | null
  budget?: number | null
  recruit_status?: string | null
  recruit_delivered?: boolean | null
  teacher_name?: string | null
  inflow_source?: string | null
  final_budget?: number | null
  contract_memo?: string | null
  admin_docs?: string | null
  estimate_file_url?: string | null
  estimate_delivered?: boolean | null
  payment_confirmed?: boolean | null
  report_sent?: boolean | null
}

export async function updateEventField(eventId: string, data: EventUpdateData) {
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('events').update(data as any).eq('id', eventId)
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}

// ── B(그룹 단위) / C(날짜 단위) — event_dates / event_groups ────────────
//
// C 필드와 B 필드의 "그룹 미지정 시 기본값"은 event_dates에 같이 들어있다.
// B 필드가 실제로 그룹에 속해있으면 event_groups 쪽을 수정해야 하므로,
// 호출하는 쪽(EventOperationsClient)에서 그 날짜의 group_id 유무로 두 액션을 나눠 부른다.

type EventDateUpdateData = {
  // C(날짜 단위)
  event_check_status?: number | null
  supplies_status?: string | null
  supplies_admin_id?: string | null
  group_chat_status?: string | null
  remarks?: string | null
  // B(그룹 단위) 기본값
  pre_notice_sent?: boolean | null
  institution_request_delivered?: boolean | null
  crime_check_notified?: boolean | null
  crime_check_delivered?: string | null
  photo_sent?: boolean | null
  contract_status?: string | null
}

type EventGroupUpdateData = {
  pre_notice_sent?: boolean | null
  institution_request_delivered?: boolean | null
  crime_check_notified?: boolean | null
  crime_check_delivered?: string | null
  photo_sent?: boolean | null
  contract_status?: string | null
}

// event_dates 행이 아직 없을 수 있어(예: 이 마이그레이션 이후 새로 생긴 날짜인데 아직
// 한 번도 안 건드려짐) upsert로 처리한다.
export async function updateEventDateField(eventId: string, date: string, data: EventDateUpdateData) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('event_dates')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ event_id: eventId, date, ...data } as any, { onConflict: 'event_id,date' })
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}

export async function updateEventDateFieldAdmins(eventId: string, date: string, adminIds: string[]) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('event_dates')
    .upsert({ event_id: eventId, date, field_admin_ids: adminIds }, { onConflict: 'event_id,date' })
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}

export async function updateEventGroupField(groupId: string, data: EventGroupUpdateData) {
  const supabase = await createServerSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('event_groups').update(data as any).eq('id', groupId)
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}

// 회보서등록알림은 "보냈음"으로 바꾸는 것만 가능한 단방향 버튼이라 값을 안 받는다.
// 그룹에 속한 날짜면 event_groups를, 아니면 event_dates를 갱신한다.
export async function updateEventDateCrimeCheckNotified(eventId: string, date: string) {
  const supabase = await createServerSupabaseClient()

  const { data: existing, error: findErr } = await supabase
    .from('event_dates')
    .select('id, group_id')
    .eq('event_id', eventId)
    .eq('date', date)
    .maybeSingle()
  if (findErr) throw new Error(findErr.message)

  if (existing?.group_id) {
    const { error } = await supabase
      .from('event_groups')
      .update({ crime_check_notified: true })
      .eq('id', existing.group_id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('event_dates')
      .upsert({ event_id: eventId, date, crime_check_notified: true }, { onConflict: 'event_id,date' })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/event-operations')
}

// 학년(event_rows.target)은 event_rows 테이블 컬럼이라 events/event_dates가 아니라
// 여기서 직접 갱신한다 — 그 날짜에 속한 모든 event_rows(교시)에 동일하게 적용.
export async function updateEventDateTargetGrade(eventId: string, date: string, target: string | null) {
  const supabase = await createServerSupabaseClient()
  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`
  const { error } = await supabase
    .from('event_rows')
    .update({ target })
    .eq('event_id', eventId)
    .gte('start_time', dayStart)
    .lte('start_time', dayEnd)
  if (error) throw new Error(error.message)
  revalidatePath('/event-operations')
}
