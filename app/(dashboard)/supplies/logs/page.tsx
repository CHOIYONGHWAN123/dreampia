import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SupplyLogsClient } from '@/components/features/supplies/SupplyLogsClient'

export default async function SupplyLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ supplyId?: string }>
}) {
  const { supplyId } = await searchParams
  const supabase = await createServerSupabaseClient()

  // ── supply_logs 조회 ─────────────────────────────────────────────
  const logsQuery = supabase
    .from('supply_logs')
    .select('id, supply_id, stock_type, delta, reason, event_row_id, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (supplyId) logsQuery.eq('supply_id', supplyId)

  const [logsRes, suppliesRes, unitsRes] = await Promise.all([
    logsQuery,
    supabase.from('supplies').select('id, occupation_program_unit_id'),
    supabase.from('occupation_program_unit').select('id, title'),
  ])

  // ── 기본 맵 구성 ─────────────────────────────────────────────────
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u.title]))
  const supplyToUnitId = new Map((suppliesRes.data ?? []).map((s) => [s.id, s.occupation_program_unit_id]))

  // ── event_row_id가 있는 로그만 event_rows 조회 ──────────────────
  const eventRowIds = [
    ...new Set(
      (logsRes.data ?? [])
        .map((l) => l.event_row_id)
        .filter(Boolean) as string[]
    ),
  ]

  let eventRowMap = new Map<string, {
    eventId: string | null
    startTime: string | null
    endTime: string | null
    headcount: number | null
    mentorId: string | null
  }>()
  let campaignMap = new Map<string, string>()
  let institutionMap = new Map<string, { region1: string; region2: string | null; name: string }>()
  let mentorMap = new Map<string, string>()

  if (eventRowIds.length > 0) {
    const { data: eventRows } = await supabase
      .from('event_rows')
      .select('id, event_id, start_time, end_time, headcount, mentor_id')
      .in('id', eventRowIds)

    eventRows?.forEach((r) => {
      eventRowMap.set(r.id, {
        eventId: r.event_id,
        startTime: r.start_time,
        endTime: r.end_time,
        headcount: r.headcount,
        mentorId: r.mentor_id,
      })
    })

    const eventIds = [...new Set(eventRows?.map((r) => r.event_id).filter(Boolean) as string[])]
    const mentorIds = [...new Set(eventRows?.map((r) => r.mentor_id).filter(Boolean) as string[])]

    if (eventIds.length > 0) {
      const { data: events } = await supabase
        .from('events')
        .select('id, campaign_id, institution_id')
        .in('id', eventIds)

      const campaignIds = [...new Set(events?.map((e) => e.campaign_id).filter(Boolean) as string[])]
      const institutionIds = [...new Set(events?.map((e) => e.institution_id).filter(Boolean) as string[])]

      const [campaignsRes, institutionsRes] = await Promise.all([
        campaignIds.length > 0
          ? supabase.from('campaign').select('id, name').in('id', campaignIds)
          : Promise.resolve({ data: [] }),
        institutionIds.length > 0
          ? supabase.from('institutions').select('id, region1, region2, name').in('id', institutionIds)
          : Promise.resolve({ data: [] }),
      ])

      const campaignById = new Map((campaignsRes.data ?? []).map((c) => [c.id, c.name]))
      const institutionById = new Map(
        (institutionsRes.data ?? []).map((i) => [i.id, { region1: i.region1, region2: i.region2, name: i.name }])
      )

      // event_id → campaign/institution 맵 빌드
      events?.forEach((e) => {
        const key = e.id
        if (e.campaign_id) campaignMap.set(key, campaignById.get(e.campaign_id) ?? '-')
        if (e.institution_id) {
          const inst = institutionById.get(e.institution_id)
          if (inst) institutionMap.set(key, inst)
        }
      })
    }

    if (mentorIds.length > 0) {
      const { data: mentors } = await supabase
        .from('mentors')
        .select('id, name')
        .in('id', mentorIds)
      mentors?.forEach((m) => mentorMap.set(m.id, m.name))
    }
  }

  // ── 최종 로그 데이터 합성 ─────────────────────────────────────────
  const logs = (logsRes.data ?? []).map((log) => {
    const unitId = supplyToUnitId.get(log.supply_id ?? '')
    const unitTitle = unitId ? (unitMap.get(unitId) ?? '-') : '-'
    const eventRow = log.event_row_id ? eventRowMap.get(log.event_row_id) : null
    const eventId = eventRow?.eventId ?? null

    return {
      id: log.id,
      supplyId: log.supply_id ?? '',
      stockType: log.stock_type as 'total' | 'kit',
      delta: log.delta,
      reason: log.reason,
      eventRowId: log.event_row_id,
      unitTitle,
      // 행사 상세
      region1: eventId ? (institutionMap.get(eventId)?.region1 ?? null) : null,
      region2: eventId ? (institutionMap.get(eventId)?.region2 ?? null) : null,
      institutionName: eventId ? (institutionMap.get(eventId)?.name ?? null) : null,
      campaignName: eventId ? (campaignMap.get(eventId) ?? null) : null,
      mentorName: eventRow?.mentorId ? (mentorMap.get(eventRow.mentorId) ?? null) : null,
      startTime: eventRow?.startTime ?? null,
      endTime: eventRow?.endTime ?? null,
      headcount: eventRow?.headcount ?? null,
      createdAt: log.created_at,
    }
  })

  const supplyOptions = (suppliesRes.data ?? [])
    .map((s) => ({
      id: s.id,
      unitTitle: s.occupation_program_unit_id ? (unitMap.get(s.occupation_program_unit_id) ?? '-') : '-',
    }))
    .sort((a, b) => a.unitTitle.localeCompare(b.unitTitle))

  return (
    <SupplyLogsClient
      logs={logs}
      supplyOptions={supplyOptions}
      defaultSupplyId={supplyId ?? null}
    />
  )
}
