import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// event-operations 화면과 my-tasks 순회 화면들(준비물/행사안내/사진전달/기관요청)이 공통으로
// 쓰는 "날짜별 B/C 값 조회" 로직. B(그룹 단위) 필드는 그 날짜가 그룹에 속해있으면 event_groups
// 값을, 아니면 event_dates 자체 값(기본값)을 쓴다 — 이 해석(resolve)을 한 곳에서만 하도록 모았다.

export type ResolvedEventDate = {
  eventId: string
  date: string
  groupId: string | null
  // C(날짜 단위)
  fieldAdminIds: string[]
  eventCheckStatus: number
  suppliesStatus: string | null
  suppliesAdminId: string | null
  groupChatStatus: string | null
  remarks: string | null
  // B(그룹 단위) — 그룹 있으면 event_groups, 없으면 event_dates 기본값
  preNoticeSent: boolean
  institutionRequestDelivered: boolean | null
  crimeCheckNotified: boolean | null
  crimeCheckDelivered: string | null
  photoSent: boolean | null
  contractStatus: string | null
}

export async function fetchResolvedEventDates(
  supabase: SupabaseClient<Database>,
  eventIds: string[]
): Promise<Map<string, ResolvedEventDate>> {
  if (eventIds.length === 0) return new Map()

  const { data: eventDates } = await supabase.from('event_dates').select('*').in('event_id', eventIds)
  const groupIds = [...new Set((eventDates ?? []).map((d) => d.group_id).filter(Boolean))] as string[]
  const { data: groups } = groupIds.length
    ? await supabase.from('event_groups').select('*').in('id', groupIds)
    : { data: [] }
  const groupMap = new Map((groups ?? []).map((g) => [g.id, g]))

  const result = new Map<string, ResolvedEventDate>()
  for (const ed of eventDates ?? []) {
    const group = ed.group_id ? groupMap.get(ed.group_id) : null
    const b = group ?? ed
    result.set(`${ed.event_id}|${ed.date}`, {
      eventId: ed.event_id,
      date: ed.date,
      groupId: ed.group_id,
      fieldAdminIds: ed.field_admin_ids ?? [],
      eventCheckStatus: ed.event_check_status,
      suppliesStatus: ed.supplies_status,
      suppliesAdminId: ed.supplies_admin_id,
      groupChatStatus: ed.group_chat_status,
      remarks: ed.remarks,
      preNoticeSent: b.pre_notice_sent,
      institutionRequestDelivered: b.institution_request_delivered,
      crimeCheckNotified: b.crime_check_notified,
      crimeCheckDelivered: b.crime_check_delivered,
      photoSent: b.photo_sent,
      contractStatus: b.contract_status,
    })
  }
  return result
}

// event_rows.start_time -> event_dates.date와 동일한 "YYYY-MM-DD" 키.
export function toDateKey(d: Date) {
  const pad2 = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
