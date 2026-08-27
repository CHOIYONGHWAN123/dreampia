import { createServerSupabaseClient, getCurrentAdmin } from '@/lib/supabase-server'
import { fetchResolvedEventDates, toDateKey } from '@/lib/event-dates'
import { PreNoticeClient, type PreNoticeRow } from '@/components/features/my-tasks/PreNoticeClient'

export default async function PreNoticePage() {
  const supabase = await createServerSupabaseClient()
  const { id: adminId, isSuper } = await getCurrentAdmin()

  // 영업담당자 또는 소통담당자로 지정된 행사만 표시(슈퍼관리자는 전체 조회).
  // 행사안내(pre_notice_sent)는 이제 날짜별(event_dates, 그룹 있으면 event_groups) 값이라
  // events에서 직접 필터링하지 않고, 아래에서 날짜별로 펼친 뒤 필터링한다.
  let eventsQuery = supabase
    .from('events')
    .select('id, institution_id, sales_admin_id, comm_admin_id, event_start_at, event_end_at')
  if (!isSuper) {
    eventsQuery = eventsQuery.or(`sales_admin_id.eq.${adminId},comm_admin_id.eq.${adminId}`)
  }
  const { data: events } = await eventsQuery.order('event_start_at', { ascending: false, nullsFirst: false })

  if (!events || events.length === 0) {
    return <PreNoticeClient rows={[]} />
  }

  const eventIds = events.map((e) => e.id)

  const [institutionsRes, adminsRes, eventRowsRes, resolvedDates] = await Promise.all([
    supabase
      .from('institutions')
      .select('id, name')
      .eq('is_deleted', false)
      .in('id', events.map((e) => e.institution_id).filter(Boolean) as string[]),
    supabase.from('admins').select('id, name'),
    supabase.from('event_rows').select('event_id, start_time, end_time').in('event_id', eventIds).not('start_time', 'is', null),
    fetchResolvedEventDates(supabase, eventIds),
  ])

  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i.name]))
  const adminMap = new Map((adminsRes.data ?? []).map((a) => [a.id, a.name]))

  // 행사별 실제 수업일(날짜 단위, 중복 제거) — event-operations와 동일한 방식.
  const datesByEvent = new Map<string, { dateKey: string; dayStart: string | null; dayEnd: string | null }[]>()
  for (const r of eventRowsRes.data ?? []) {
    if (!r.start_time) continue
    const dateKey = toDateKey(new Date(r.start_time))
    const list = datesByEvent.get(r.event_id) ?? []
    const entry = list.find((e) => e.dateKey === dateKey)
    if (!entry) list.push({ dateKey, dayStart: r.start_time, dayEnd: r.end_time })
    else {
      if (r.start_time < (entry.dayStart ?? r.start_time)) entry.dayStart = r.start_time
      if (r.end_time && (!entry.dayEnd || r.end_time > entry.dayEnd)) entry.dayEnd = r.end_time
    }
    datesByEvent.set(r.event_id, list)
  }

  const rows: PreNoticeRow[] = []
  for (const e of events) {
    if (e.institution_id && !institutionMap.has(e.institution_id)) continue // 소속 기관 삭제된 행사는 제외

    const dates = datesByEvent.get(e.id) ?? []
    for (const date of dates) {
      const resolved = resolvedDates.get(`${e.id}|${date.dateKey}`)
      // 아직 event_dates 행이 없으면(이론상 마이그레이션 백필로 다 있어야 함) 기본값 false로 취급.
      if (resolved?.preNoticeSent) continue // 이미 완료된 날짜는 할 일 목록에서 제외

      rows.push({
        no: 0,
        id: e.id,
        dateKey: date.dateKey,
        groupId: resolved?.groupId ?? null,
        institutionId: e.institution_id,
        institutionName: e.institution_id ? (institutionMap.get(e.institution_id) ?? null) : null,
        eventStartAt: date.dayStart,
        eventEndAt: date.dayEnd,
        salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
        commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
      })
    }
  }
  rows.forEach((r, i) => { r.no = i + 1 })

  return <PreNoticeClient rows={rows} />
}
