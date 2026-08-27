import { createServerSupabaseClient, getCurrentAdmin } from '@/lib/supabase-server'
import { fetchResolvedEventDates, toDateKey } from '@/lib/event-dates'
import { SuppliesTaskClient, type SuppliesTaskRow } from '@/components/features/my-tasks/SuppliesTaskClient'

export default async function SuppliesTaskPage() {
  const supabase = await createServerSupabaseClient()
  const { id: adminId, isSuper } = await getCurrentAdmin()

  // 준비물담당자(supplies_admin_id)는 이제 날짜별(event_dates) 값이라, events 단계에서는
  // 영업담당자/소통담당자로만 후보 행사를 좁히고, 준비물담당자로만 지정된 날짜는 아래에서
  // event_dates를 훑어 별도로 포함시킨다.
  let eventsQuery = supabase
    .from('events')
    .select('id, institution_id, sales_admin_id, comm_admin_id, event_start_at, event_end_at')
  if (!isSuper) {
    eventsQuery = eventsQuery.or(`sales_admin_id.eq.${adminId},comm_admin_id.eq.${adminId}`)
  }
  const { data: events } = await eventsQuery.order('event_start_at', { ascending: false, nullsFirst: false })

  let eventIdSet = new Set((events ?? []).map((e) => e.id))
  let extraEventIds: string[] = []
  if (!isSuper) {
    const { data: myDates } = await supabase.from('event_dates').select('event_id').eq('supplies_admin_id', adminId)
    extraEventIds = (myDates ?? []).map((d) => d.event_id).filter((id) => !eventIdSet.has(id))
  }

  let allEvents = events ?? []
  if (extraEventIds.length > 0) {
    const { data: extra } = await supabase
      .from('events')
      .select('id, institution_id, sales_admin_id, comm_admin_id, event_start_at, event_end_at')
      .in('id', extraEventIds)
    allEvents = [...allEvents, ...(extra ?? [])]
  }

  if (allEvents.length === 0) {
    return <SuppliesTaskClient rows={[]} />
  }

  eventIdSet = new Set(allEvents.map((e) => e.id))
  const eventIds = [...eventIdSet]

  const [institutionsRes, adminsRes, eventRowsRes, resolvedDates] = await Promise.all([
    supabase
      .from('institutions')
      .select('id, name')
      .eq('is_deleted', false)
      .in('id', allEvents.map((e) => e.institution_id).filter(Boolean) as string[]),
    supabase.from('admins').select('id, name'),
    supabase.from('event_rows').select('event_id, start_time, end_time').in('event_id', eventIds).not('start_time', 'is', null),
    fetchResolvedEventDates(supabase, eventIds),
  ])

  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i.name]))
  const adminMap = new Map((adminsRes.data ?? []).map((a) => [a.id, a.name]))

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

  const rows: SuppliesTaskRow[] = []
  for (const e of allEvents) {
    if (e.institution_id && !institutionMap.has(e.institution_id)) continue

    const dates = datesByEvent.get(e.id) ?? []
    for (const date of dates) {
      const resolved = resolvedDates.get(`${e.id}|${date.dateKey}`)
      const suppliesStatus = resolved?.suppliesStatus ?? null
      if (suppliesStatus === '준비 완료') continue

      // 준비물담당자로만 지정된(영업/소통담당자가 아닌) 관리자는 그 날짜만 볼 수 있어야 한다.
      if (!isSuper) {
        const isSalesOrComm = e.sales_admin_id === adminId || e.comm_admin_id === adminId
        const isSuppliesAdmin = resolved?.suppliesAdminId === adminId
        if (!isSalesOrComm && !isSuppliesAdmin) continue
      }

      rows.push({
        no: 0,
        id: e.id,
        dateKey: date.dateKey,
        institutionId: e.institution_id,
        institutionName: e.institution_id ? (institutionMap.get(e.institution_id) ?? null) : null,
        eventStartAt: date.dayStart,
        eventEndAt: date.dayEnd,
        salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
        commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
        suppliesStatus,
      })
    }
  }
  rows.forEach((r, i) => { r.no = i + 1 })

  return <SuppliesTaskClient rows={rows} />
}
