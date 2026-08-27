import { createServerSupabaseClient } from '@/lib/supabase-server'
import { EventOperationsClient, type EventOperationRow } from '@/components/features/event-operations/EventOperationsClient'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

// event_dates.date(Postgres date, "YYYY-MM-DD")와 그대로 매칭되는 키.
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

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
    .select('event_id, start_time, end_time, target')
    .gte('start_time', startOfMonth)
    .lt('start_time', startOfNextMonth)

  // 행사별 실제 수업일(날짜 단위, 중복 제거) 목록 — 행사운영확인표에서 행사를 날짜별로 나눠 보여주는 데 사용.
  // 하루에 교시가 여러 개일 수 있어, 시작/종료 시간은 그날의 가장 이른 시작 ~ 가장 늦은 종료로 계산하고,
  // 학년(target)은 그날 교시들의 값 중 중복 제거해 모은다.
  const datesByEvent = new Map<
    string,
    { dateKey: string; iso: string | null; dayStart: string | null; dayEnd: string | null; targets: Set<string> }[]
  >()
  for (const r of rowsInMonth ?? []) {
    if (!r.event_id || !r.start_time) continue
    const d = new Date(r.start_time)
    const dateKey = toDateKey(d)
    const list = datesByEvent.get(r.event_id) ?? []
    const entry = list.find((e) => e.dateKey === dateKey)
    if (!entry) {
      list.push({
        dateKey,
        iso: r.start_time,
        dayStart: r.start_time,
        dayEnd: r.end_time,
        targets: new Set(r.target ? [r.target] : []),
      })
    } else {
      if (r.start_time && (!entry.dayStart || r.start_time < entry.dayStart)) entry.dayStart = r.start_time
      if (r.end_time && (!entry.dayEnd || r.end_time > entry.dayEnd)) entry.dayEnd = r.end_time
      if (r.target) entry.targets.add(r.target)
    }
    datesByEvent.set(r.event_id, list)
  }
  for (const list of datesByEvent.values()) list.sort((a, b) => (a.iso ?? '').localeCompare(b.iso ?? ''))

  const eventIdsInMonth = [...datesByEvent.keys()]

  const { data: events } =
    eventIdsInMonth.length > 0
      ? await supabase
          .from('events')
          .select(`id, name, event_start_at, event_end_at, budget, final_budget, contract_type, contract_method, contract_memo, recruit_status, recruit_delivered, start_recruit_at, crime_check_method, crime_check_status, admin_docs, admin_docs_delivered, estimate_file_url, estimate_delivered, transaction_statement_file_url, teacher_name, inflow_source, payment_confirmed, report_sent, field_admin_ids, comm_admin_id, sales_admin_id, institution_id, event_category_id`)
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
  const [institutionsRes, eventRowsRes, eventDatesRes] = await Promise.all([
    supabase.from('institutions').select('id, region1, region2, institution_type, name, is_deleted')
      .in('id', events.map((e) => e.institution_id).filter(Boolean) as string[]),
    supabase.from('event_rows').select('id, event_id, start_time').in('event_id', eventIds),
    // B/C(그룹·날짜 단위) 값 — event_dates가 이 행사의 실제 수업일마다 하나씩 있어야 정상이다
    // (등록/수정 폼 저장 시 동기화됨). 없는 날짜는 기본값으로 폴백한다.
    supabase.from('event_dates').select('*').in('event_id', eventIds),
  ])

  const groupIds = [...new Set((eventDatesRes.data ?? []).map((d) => d.group_id).filter(Boolean))] as string[]
  const { data: eventGroups } = groupIds.length
    ? await supabase.from('event_groups').select('*').in('id', groupIds)
    : { data: [] }
  const groupMap = new Map((eventGroups ?? []).map((g) => [g.id, g]))

  // event_dates를 "event_id|dateKey" 키로 조회할 수 있게 맵 구성
  const eventDateMap = new Map(
    (eventDatesRes.data ?? []).map((row) => [`${row.event_id}|${row.date}`, row])
  )

  // event_photos 건수 집계 — event_row를 "event_id|dateKey"별로 묶어서, 그룹으로 묶인
  // 날짜끼리는 사진 완료 판정도 같이 묶이게 한다(행사 전체가 아니라 그룹/날짜 스코프로).
  const eventRowIds = (eventRowsRes.data ?? []).map((r) => r.id)
  const { data: photos } = eventRowIds.length
    ? await supabase.from('event_photos').select('event_rows_id').in('event_rows_id', eventRowIds)
    : { data: [] }

  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i]))
  const adminMap = new Map(admins.map((a) => [a.id, a.name]))

  const photoCountByRow = new Map<string, number>()
  for (const p of photos ?? []) {
    photoCountByRow.set(p.event_rows_id, (photoCountByRow.get(p.event_rows_id) ?? 0) + 1)
  }

  // "event_id|dateKey" -> 그날의 event_row id 목록
  const rowIdsByEventDate = new Map<string, string[]>()
  for (const r of eventRowsRes.data ?? []) {
    if (!r.start_time) continue
    const dk = toDateKey(new Date(r.start_time))
    const mapKey = `${r.event_id}|${dk}`
    const arr = rowIdsByEventDate.get(mapKey) ?? []
    arr.push(r.id)
    rowIdsByEventDate.set(mapKey, arr)
  }

  // 사진 완료 판정 — group_id가 있으면 같은 event_id 안에서 group_id가 같은 모든 날짜의
  // event_row를 합쳐서, 없으면 그 날짜만 보고 "전 row 사진 3장 이상"인지 계산한다.
  function computePhotoStatus(eventId: string, dateKey: string, groupId: string | null): boolean | null {
    let rowIds: string[]
    if (groupId) {
      const siblingDateKeys = (eventDatesRes.data ?? [])
        .filter((d) => d.event_id === eventId && d.group_id === groupId)
        .map((d) => d.date)
      rowIds = siblingDateKeys.flatMap((dk) => rowIdsByEventDate.get(`${eventId}|${dk}`) ?? [])
    } else {
      rowIds = rowIdsByEventDate.get(`${eventId}|${dateKey}`) ?? []
    }
    if (rowIds.length === 0) return null
    return rowIds.every((rowId) => (photoCountByRow.get(rowId) ?? 0) >= 3)
  }

  // 최종 행 데이터 합성 — 행사 하나당, 그 달에 실제 수업이 있었던 날짜 수만큼 행을 나눠서 생성한다.
  const rows: EventOperationRow[] = []
  for (const e of events) {
    const inst = e.institution_id ? institutionMap.get(e.institution_id) : null

    const dates = datesByEvent.get(e.id) ?? []

    for (const date of dates) {
      const ed = eventDateMap.get(`${e.id}|${date.dateKey}`)
      const groupId = ed?.group_id ?? null
      const group = groupId ? groupMap.get(groupId) : null

      // B(그룹 단위) — 그룹이 있으면 group 값, 없으면 event_dates 자체 값(기본값)
      const bSource = group ?? ed
      const fieldAdminIds = ed?.field_admin_ids ?? []
      const fieldAdminNames = fieldAdminIds.map((id: string) => adminMap.get(id) ?? '').filter(Boolean)

      rows.push({
        no: 0,
        id: e.id,
        rowKey: `${e.id}__${date.dateKey}`,
        institutionId: e.institution_id,
        region1: inst?.region1 ?? null,
        region2: inst?.region2 ?? null,
        eventCategoryName: e.event_category_id ? (eventCategoryMap.get(e.event_category_id) ?? null) : null,
        institutionName: inst ? `${inst.name}${inst.is_deleted ? '(삭제됨)' : ''}` : null,
        fieldAdminIds,
        fieldAdminNames,
        eventDate: date.iso,
        dateKey: date.dateKey,
        groupId,
        dayStart: date.dayStart,
        dayEnd: date.dayEnd,
        // C(날짜 단위)
        targetGrade: [...date.targets].join(', ') || null,
        eventCheckStatus: ed?.event_check_status ?? 1,
        suppliesStatus: ed?.supplies_status ?? null,
        suppliesAdminId: ed?.supplies_admin_id ?? null,
        suppliesAdminName: ed?.supplies_admin_id ? (adminMap.get(ed.supplies_admin_id) ?? null) : null,
        groupChatStatus: ed?.group_chat_status ?? null,
        remarks: ed?.remarks ?? null,
        // B(그룹 단위, group 또는 event_dates 기본값)
        preNoticeSent: bSource?.pre_notice_sent ?? false,
        institutionRequestDelivered: bSource?.institution_request_delivered ?? null,
        crimeCheckNotified: bSource?.crime_check_notified ?? null,
        crimeCheckDelivered: bSource?.crime_check_delivered ?? null,
        photoSent: bSource?.photo_sent ?? null,
        contractStatus: bSource?.contract_status ?? null,
        photoStatus: computePhotoStatus(e.id, date.dateKey, groupId),
        // A(행사 단위) — events 그대로
        budget: e.budget,
        finalBudget: e.final_budget,
        contractType: e.contract_type,
        contractMethod: e.contract_method,
        contractMemo: e.contract_memo,
        commAdminId: e.comm_admin_id,
        commAdminName: e.comm_admin_id ? (adminMap.get(e.comm_admin_id) ?? null) : null,
        recruitStatus: e.recruit_status,
        recruitDelivered: e.recruit_delivered,
        crimeCheckMethod: e.crime_check_method,
        crimeCheckStatus: e.crime_check_status,
        adminDocs: e.admin_docs,
        adminDocsDelivered: e.admin_docs_delivered,
        salesAdminId: e.sales_admin_id,
        salesAdminName: e.sales_admin_id ? (adminMap.get(e.sales_admin_id) ?? null) : null,
        estimateFileUrl: e.estimate_file_url,
        estimateDelivered: e.estimate_delivered,
        transactionStatementFileUrl: e.transaction_statement_file_url,
        teacherName: e.teacher_name,
        inflowSource: e.inflow_source,
        paymentConfirmed: e.payment_confirmed,
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
