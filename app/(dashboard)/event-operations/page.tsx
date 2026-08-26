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

  // 이용 가능한 월 목록 (탭용) — 실제 수업(event_rows)이 있는 달만 포함.
  // event_start_at~event_end_at 구간 겹침 기준으로는 중간에 수업이 없는 달까지 표시되는
  // 문제가 있어, 실제 진행일(event_rows.start_time) 기준으로 바꿨다.
  const { data: allRowDates } = await supabase.from('event_rows').select('start_time').not('start_time', 'is', null)

  const availableMonths = [
    ...new Map(
      (allRowDates ?? []).map((r) => {
        const d = new Date(r.start_time as string)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        return [key, { year: d.getFullYear(), month: d.getMonth() + 1 }]
      })
    ).values(),
  ].sort((a, b) => b.year - a.year || b.month - a.month)

  // 해당 월의 이벤트 조회 — 그 달에 실제로 진행되는 event_row(수업)가 하나라도 있는 행사만 포함.
  const startOfMonth = new Date(year, month - 1, 1).toISOString()
  const startOfNextMonth = new Date(year, month, 1).toISOString()

  const { data: rowsInMonth } = await supabase
    .from('event_rows')
    .select('event_id, start_time, end_time')
    .gte('start_time', startOfMonth)
    .lt('start_time', startOfNextMonth)

  // 행사별 실제 수업일(날짜 단위, 중복 제거) 목록 — 행사운영확인표에서 행사를 날짜별로 나눠 보여주는 데 사용.
  // 하루에 교시가 여러 개일 수 있어, 시작/종료 시간은 그날의 가장 이른 시작 ~ 가장 늦은 종료로 계산한다.
  const datesByEvent = new Map<string, { key: string; iso: string | null; dayStart: string | null; dayEnd: string | null }[]>()
  for (const r of rowsInMonth ?? []) {
    if (!r.event_id || !r.start_time) continue
    const d = new Date(r.start_time)
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
    const list = datesByEvent.get(r.event_id) ?? []
    const entry = list.find((e) => e.key === key)
    if (!entry) {
      list.push({ key, iso: r.start_time, dayStart: r.start_time, dayEnd: r.end_time })
    } else {
      if (r.start_time && (!entry.dayStart || r.start_time < entry.dayStart)) entry.dayStart = r.start_time
      if (r.end_time && (!entry.dayEnd || r.end_time > entry.dayEnd)) entry.dayEnd = r.end_time
    }
    datesByEvent.set(r.event_id, list)
  }
  for (const list of datesByEvent.values()) list.sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''))

  const eventIdsInMonth = [...datesByEvent.keys()]

  const { data: events } =
    eventIdsInMonth.length > 0
      ? await supabase
          .from('events')
          .select(`id, name, event_start_at, event_end_at, target_grade, budget, final_budget, contract_type, contract_status, contract_delivered, contract_memo, event_check_status, supplies_status, pre_notice_sent, recruit_status, recruit_delivered, start_recruit_at, institution_request_delivered, crime_check_method, crime_check_notified, crime_check_status, crime_check_delivered, admin_docs, admin_docs_delivered, estimate_file_url, estimate_delivered, teacher_name, remarks, group_chat_status, inflow_source, payment_confirmed, photo_sent, report_sent, field_admin_ids, comm_admin_id, sales_admin_id, institution_id, event_category_id`)
          .in('id', eventIdsInMonth)
          .order('event_start_at', { ascending: true })
      : { data: null }

  // 전체 관리자 목록
  const { data: allAdmins } = await supabase.from('admins').select('id, name').order('name')
  const admins = (allAdmins ?? []).map((a) => ({ id: a.id, name: a.name }))

  // 행사구분(직업체험/문화예술체험 등) 이름 조회
  const { data: eventCategories } = await supabase.from('event_categories').select('id, name')
  const eventCategoryMap = new Map((eventCategories ?? []).map((c) => [c.id, c.name]))

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
    eventRowsRes,
  ] = await Promise.all([
    supabase.from('institutions').select('id, region1, region2, institution_type, name, is_deleted')
      .in('id', events.map((e) => e.institution_id).filter(Boolean) as string[]),
    supabase.from('event_rows').select('id, event_id').in('event_id', eventIds),
  ])

  // event_photos 건수 집계
  const eventRowIds = (eventRowsRes.data ?? []).map((r) => r.id)
  const { data: photos } = eventRowIds.length
    ? await supabase.from('event_photos').select('event_rows_id').in('event_rows_id', eventRowIds)
    : { data: [] }

  // 맵 구성
  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i]))
  const adminMap = new Map(admins.map((a) => [a.id, a.name]))

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

  // 최종 행 데이터 합성 — 행사 하나당, 그 달에 실제 수업이 있었던 날짜 수만큼 행을 나눠서 생성한다.
  const rows: EventOperationRow[] = []
  for (const e of events) {
    const inst = e.institution_id ? institutionMap.get(e.institution_id) : null
    const fieldAdminNames = (e.field_admin_ids ?? [])
      .map((id: string) => adminMap.get(id) ?? '')
      .filter(Boolean)
    const eventRowIdList = rowsByEvent.get(e.id) ?? []
    const allPhotosOk =
      eventRowIdList.length > 0 &&
      eventRowIdList.every((rowId) => (photoCountByRow.get(rowId) ?? 0) >= 3)

    // 이론상 eventIdsInMonth에 포함된 행사는 항상 날짜가 하나 이상 있지만, 방어적으로 폴백을 둔다.
    const dates = datesByEvent.get(e.id) ?? [
      { key: e.id, iso: e.event_start_at, dayStart: e.event_start_at, dayEnd: e.event_end_at },
    ]

    for (const date of dates) {
      rows.push({
        no: 0,
        id: e.id,
        rowKey: `${e.id}__${date.key}`,
        institutionId: e.institution_id,
        region1: inst?.region1 ?? null,
        region2: inst?.region2 ?? null,
        eventCategoryName: e.event_category_id ? (eventCategoryMap.get(e.event_category_id) ?? null) : null,
        institutionName: inst ? `${inst.name}${inst.is_deleted ? '(삭제됨)' : ''}` : null,
        fieldAdminIds: e.field_admin_ids ?? [],
        fieldAdminNames,
        eventDate: date.iso,
        dayStart: date.dayStart,
        dayEnd: date.dayEnd,
        targetGrade: e.target_grade,
        budget: e.budget,
        finalBudget: e.final_budget,
        contractType: e.contract_type,
        contractStatus: e.contract_status,
        contractDelivered: e.contract_delivered,
        contractMemo: e.contract_memo,
        eventCheckStatus: e.event_check_status,
        suppliesStatus: e.supplies_status,
        preNoticeSent: e.pre_notice_sent,
        commAdminId: e.comm_admin_id,
        commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
        recruitStatus: e.recruit_status,
        recruitDelivered: e.recruit_delivered,
        institutionRequestDelivered: e.institution_request_delivered,
        crimeCheckMethod: e.crime_check_method,
        crimeCheckNotified: e.crime_check_notified,
        crimeCheckStatus: e.crime_check_status,
        crimeCheckDelivered: e.crime_check_delivered,
        adminDocs: e.admin_docs,
        adminDocsDelivered: e.admin_docs_delivered,
        salesAdminId: e.sales_admin_id,
        salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
        estimateFileUrl: e.estimate_file_url,
        estimateDelivered: e.estimate_delivered,
        teacherName: e.teacher_name,
        remarks: e.remarks,
        groupChatStatus: e.group_chat_status,
        inflowSource: e.inflow_source,
        paymentConfirmed: e.payment_confirmed,
        photoStatus: eventRowIdList.length === 0 ? null : allPhotosOk,
        photoSent: e.photo_sent,
        reportSent: e.report_sent,
        startRecruitAt: e.start_recruit_at,
      })
    }
  }
  rows.forEach((r, i) => { r.no = i + 1 })

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
