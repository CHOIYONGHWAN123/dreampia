import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { fetchResolvedEventDates, toDateKey } from '@/lib/event-dates'
import { InstitutionDetailClient } from '@/components/features/institutions/InstitutionDetailClient'

export default async function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const [{ data: institution }, eventsResult] = await Promise.all([
    supabase.from('institutions').select('id, name, address, is_deleted').eq('id', id).single(),
    supabase
      .from('events')
      .select('id, name, memo, teacher_name, recruit_status, event_start_at, event_end_at, start_recruit_at, recruit_delivered, institution_request_status, estimate_file_url, admin_docs_delivered')
      .eq('institution_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!institution) notFound()

  if (eventsResult.error) {
    console.error('[InstitutionDetail] events 조회 오류:', eventsResult.error.message)
  }

  const baseEvents = eventsResult.data ?? []

  // 준비물(supplies_status)/계약현황(contract_status)은 이제 행사 전체가 아니라 날짜별
  // (event_dates, 그룹 있으면 event_groups) 값이다. 이 화면은 행사 하나당 한 줄인 요약 표라
  // 날짜가 하나뿐인(가장 흔한) 행사는 그 값을 그대로 보여주고, 날짜가 여러 개인 행사는
  // 한 셀로 대표할 수 없으니 "행사운영확인표에서 확인"으로 안내한다.
  const eventIds = baseEvents.map((e) => e.id)
  const [eventRowsRes, resolvedDates] = await Promise.all([
    eventIds.length
      ? supabase.from('event_rows').select('event_id, start_time').in('event_id', eventIds).not('start_time', 'is', null)
      : Promise.resolve({ data: [] as { event_id: string; start_time: string | null }[] }),
    fetchResolvedEventDates(supabase, eventIds),
  ])

  const dateKeysByEvent = new Map<string, Set<string>>()
  for (const r of eventRowsRes.data ?? []) {
    if (!r.start_time) continue
    const set = dateKeysByEvent.get(r.event_id) ?? new Set<string>()
    set.add(toDateKey(new Date(r.start_time)))
    dateKeysByEvent.set(r.event_id, set)
  }

  const events = baseEvents.map((e) => {
    const dateKeys = [...(dateKeysByEvent.get(e.id) ?? [])]
    const singleDateKey = dateKeys.length === 1 ? dateKeys[0] : null
    const resolved = singleDateKey ? resolvedDates.get(`${e.id}|${singleDateKey}`) : undefined
    return {
      ...e,
      dateKey: singleDateKey, // 날짜가 여러 개면 null — 이 화면에서는 편집 불가
      hasMultipleDates: dateKeys.length > 1,
      contract_status: singleDateKey ? (resolved?.contractStatus ?? null) : null,
      supplies_status: singleDateKey ? (resolved?.suppliesStatus ?? null) : null,
    }
  })

  return (
    <>
      {eventsResult.error && (
        <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          행사 데이터 조회 오류: {eventsResult.error.message}
          <br />
          <span className="text-xs text-red-400">DB 마이그레이션(start_recruit_at, institution_request_status 컬럼 추가)이 필요할 수 있습니다.</span>
        </div>
      )}
      <InstitutionDetailClient institution={institution} events={events || []} />
    </>
  )
}
