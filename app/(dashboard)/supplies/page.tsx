import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SuppliesClient, type UnitWithSupply } from '@/components/features/supplies/SuppliesClient'

export default async function SuppliesPage() {
  const supabase = await createServerSupabaseClient()

  const [fieldsRes, occsRes, progsRes, unitsRes, suppliesRes, logsRes, eventRowsRes] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase.from('occupation_program_unit').select('id, title, school_level, occupation_programs_id').order('title'),
    supabase.from('supplies').select('id, occupation_program_unit_id, qty_per_person, kit_threshold, max_daily_stock, is_consumable, memo'),
    supabase.from('supply_logs').select('supply_id, stock_type, delta'),
    supabase.from('event_rows').select('occupation_program_unit_id, headcount, events(event_start_at, event_end_at)'),
  ])

  const fieldMap = new Map((fieldsRes.data ?? []).map((f) => [f.id, f]))
  const occMap = new Map((occsRes.data ?? []).map((o) => [o.id, o]))
  const progMap = new Map((progsRes.data ?? []).map((p) => [p.id, p]))
  const supplyByUnitId = new Map((suppliesRes.data ?? []).map((s) => [s.occupation_program_unit_id, s]))

  // supply_logs 집계: supply_id별 stock_type별 delta 합산
  const stockMap = new Map<string, { total: number; kit: number }>()
  for (const log of logsRes.data ?? []) {
    if (!log.supply_id) continue
    const cur = stockMap.get(log.supply_id) ?? { total: 0, kit: 0 }
    if (log.stock_type === 'total') cur.total += log.delta
    else if (log.stock_type === 'kit') cur.kit += log.delta
    stockMap.set(log.supply_id, cur)
  }

  // 아직 끝나지 않은(예정 또는 진행 중) 행사의 event_rows 중 유닛별 최대 인원수 집계
  // → "일 최대 수용" 초과 위험 판단에 사용 (지나간 행사는 제외)
  // 같은 조건(아직 끝나지 않은 행사)에서 유닛별 가장 임박한 행사 시작일시도 함께 집계해
  // 목록 정렬(임박한 행사가 있는 유닛을 위로)에 사용한다.
  const now = Date.now()
  const maxActiveHeadcountByUnit = new Map<string, number>()
  const nextEventStartByUnit = new Map<string, string>()
  for (const row of eventRowsRes.data ?? []) {
    if (!row.occupation_program_unit_id) continue
    const eventRef = row.events as unknown
    const event = (Array.isArray(eventRef) ? eventRef[0] : eventRef) as {
      event_start_at: string | null
      event_end_at: string | null
    } | null
    const isActive = !event?.event_end_at || new Date(event.event_end_at).getTime() >= now
    if (!isActive) continue

    if (row.headcount != null) {
      const curHeadcount = maxActiveHeadcountByUnit.get(row.occupation_program_unit_id) ?? 0
      if (row.headcount > curHeadcount) maxActiveHeadcountByUnit.set(row.occupation_program_unit_id, row.headcount)
    }

    if (event?.event_start_at) {
      const curNext = nextEventStartByUnit.get(row.occupation_program_unit_id)
      if (!curNext || event.event_start_at < curNext) {
        nextEventStartByUnit.set(row.occupation_program_unit_id, event.event_start_at)
      }
    }
  }

  const units: UnitWithSupply[] = (unitsRes.data ?? []).map((u) => {
    const prog = u.occupation_programs_id ? progMap.get(u.occupation_programs_id) : null
    const occ = prog?.occupation_id ? occMap.get(prog.occupation_id) : null
    const field = occ?.field_id ? fieldMap.get(occ.field_id) : null
    const supply = supplyByUnitId.get(u.id) ?? null
    const stock = supply ? (stockMap.get(supply.id) ?? { total: 0, kit: 0 }) : { total: 0, kit: 0 }

    return {
      id: u.id,
      title: u.title,
      schoolLevel: u.school_level,
      fieldId: field?.id ?? '',
      fieldName: field?.name ?? '-',
      occupationId: occ?.id ?? '',
      occupationName: occ?.name ?? '-',
      programId: prog?.id ?? '',
      programName: prog?.name ?? '-',
      supply: supply
        ? {
            id: supply.id,
            qty_per_person: supply.qty_per_person,
            kit_threshold: supply.kit_threshold,
            max_daily_stock: supply.max_daily_stock,
            is_consumable: supply.is_consumable,
            memo: supply.memo,
          }
        : null,
      totalStock: stock.total,
      kitStock: stock.kit,
      maxActiveHeadcount: maxActiveHeadcountByUnit.get(u.id) ?? 0,
      nextEventStartAt: nextEventStartByUnit.get(u.id) ?? null,
    }
  })

  return (
    <SuppliesClient
      units={units}
      fields={(fieldsRes.data ?? []).map((f) => ({ id: f.id, name: f.name }))}
    />
  )
}
