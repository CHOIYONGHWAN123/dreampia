import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EventOperationsClient, type EventOperationRow } from '@/components/features/event-operations/EventOperationsClient'

export default async function EventOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearParam, month: monthParam } = await searchParams
  const now = new Date()
  const year = yearParam ? parseInt(yearParam) : now.getFullYear()
  const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1

  const supabase = await createServerSupabaseClient()

  // 이용 가능한 월 목록 (탭용)
  const { data: allDates } = await supabase
    .from('events')
    .select('event_end_at')
    .not('event_end_at', 'is', null)

  const availableMonths = [
    ...new Map(
      (allDates ?? []).map((e) => {
        const d = new Date(e.event_end_at!)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        return [key, { year: d.getFullYear(), month: d.getMonth() + 1 }]
      })
    ).values(),
  ].sort((a, b) => b.year - a.year || b.month - a.month)

  // 해당 월의 이벤트 조회
  const startOfMonth = new Date(year, month - 1, 1).toISOString()
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

  const { data: events } = await supabase
    .from('events')
    .select(`id, name, event_start_at, event_end_at, target_grade, budget, contract_type, contract_status, event_check_status, supplies_status, pre_notice_sent, recruit_status, recruit_delivered, start_recruit_at, school_request_delivered, crime_check_method, crime_check_notified, crime_check_status, admin_docs_delivered, estimate_file_url, teacher_name, remarks, group_chat_link, inflow_source, payment_confirmed, photo_sent, report_sent, field_admin_ids, comm_admin_id, sales_admin_id, institution_id, campaign_id`)
    .gte('event_end_at', startOfMonth)
    .lte('event_end_at', endOfMonth)
    .order('event_end_at', { ascending: true })

  // 전체 관리자 목록
  const { data: allAdmins } = await supabase.from('admins').select('id, name').order('name')
  const admins = (allAdmins ?? []).map((a) => ({ id: a.id, name: a.name }))

  if (!events || events.length === 0) {
    return (
      <EventOperationsClient
        rows={[]}
        availableMonths={availableMonths}
        currentYear={year}
        currentMonth={month}
        admins={admins}
      />
    )
  }

  const eventIds = events.map((e) => e.id)

  // 관련 데이터 병렬 조회
  const [
    institutionsRes,
    campaignsRes,
    sessionsRes,
    eventRowsRes,
  ] = await Promise.all([
    supabase.from('institutions').select('id, region1, region2, category, name')
      .in('id', events.map((e) => e.institution_id).filter(Boolean) as string[]),
    supabase.from('campaign').select('id, name')
      .in('id', events.map((e) => e.campaign_id).filter(Boolean) as string[]),
    supabase.from('event_sessions').select('id, event_id, start_at, end_at, sort_order')
      .in('event_id', eventIds).order('sort_order'),
    supabase.from('event_rows').select('id, event_id').in('event_id', eventIds),
  ])

  // event_photos 건수 집계
  const eventRowIds = (eventRowsRes.data ?? []).map((r) => r.id)
  const { data: photos } = eventRowIds.length
    ? await supabase.from('event_photos').select('event_rows_id').in('event_rows_id', eventRowIds)
    : { data: [] }

  // 맵 구성
  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i]))
  const campaignMap = new Map((campaignsRes.data ?? []).map((c) => [c.id, c.name]))
  const adminMap = new Map(admins.map((a) => [a.id, a.name]))

  const sessionsByEvent = new Map<string, typeof sessionsRes.data>()
  for (const s of sessionsRes.data ?? []) {
    const arr = sessionsByEvent.get(s.event_id) ?? []
    arr.push(s)
    sessionsByEvent.set(s.event_id, arr)
  }

  const photoCountByRow = new Map<string, number>()
  for (const p of photos ?? []) {
    photoCountByRow.set(p.event_rows_id, (photoCountByRow.get(p.event_rows_id) ?? 0) + 1)
  }
  const rowsByEvent = new Map<string, string[]>()
  for (const r of eventRowsRes.data ?? []) {
    const arr = rowsByEvent.get(r.event_id) ?? []
    arr.push(r.id)
    rowsByEvent.set(r.event_id, arr)
  }

  // 최종 행 데이터 합성
  const rows: EventOperationRow[] = events.map((e, i) => {
    const inst = e.institution_id ? institutionMap.get(e.institution_id) : null
    const fieldAdminNames = (e.field_admin_ids ?? [])
      .map((id: string) => adminMap.get(id) ?? '')
      .filter(Boolean)
    const sessions = sessionsByEvent.get(e.id) ?? []
    const eventRowIdList = rowsByEvent.get(e.id) ?? []
    const allPhotosOk =
      eventRowIdList.length > 0 &&
      eventRowIdList.every((rowId) => (photoCountByRow.get(rowId) ?? 0) >= 3)

    return {
      no: i + 1,
      id: e.id,
      institutionId: e.institution_id,
      region1: inst?.region1 ?? null,
      region2: inst?.region2 ?? null,
      category: inst?.category ?? null,
      institutionName: inst?.name ?? null,
      campaignName: e.campaign_id ? (campaignMap.get(e.campaign_id) ?? null) : null,
      fieldAdminIds: e.field_admin_ids ?? [],
      fieldAdminNames,
      eventStartAt: e.event_start_at,
      eventEndAt: e.event_end_at,
      sessions: sessions.map((s) => ({ startAt: s.start_at, endAt: s.end_at })),
      targetGrade: e.target_grade,
      budget: e.budget,
      contractType: e.contract_type,
      contractStatus: e.contract_status,
      eventCheckStatus: e.event_check_status,
      suppliesStatus: e.supplies_status,
      preNoticeSent: e.pre_notice_sent,
      commAdminId: e.comm_admin_id,
      commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
      recruitStatus: e.recruit_status,
      recruitDelivered: e.recruit_delivered,
      schoolRequestDelivered: e.school_request_delivered,
      crimeCheckMethod: e.crime_check_method,
      crimeCheckNotified: e.crime_check_notified,
      crimeCheckStatus: e.crime_check_status,
      adminDocsDelivered: e.admin_docs_delivered,
      salesAdminId: e.sales_admin_id,
      salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
      estimateFileUrl: e.estimate_file_url,
      teacherName: e.teacher_name,
      remarks: e.remarks,
      groupChatLink: e.group_chat_link,
      inflowSource: e.inflow_source,
      paymentConfirmed: e.payment_confirmed,
      photoStatus: eventRowIdList.length === 0 ? null : allPhotosOk,
      photoSent: e.photo_sent,
      reportSent: e.report_sent,
      startRecruitAt: e.start_recruit_at,
    }
  })

  return (
    <EventOperationsClient
      rows={rows}
      availableMonths={availableMonths}
      currentYear={year}
      currentMonth={month}
      admins={admins}
    />
  )
}
