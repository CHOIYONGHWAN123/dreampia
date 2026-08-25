import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SuppliesClient, type ProgramWithSupply } from '@/components/features/supplies/SuppliesClient'

export default async function SuppliesPage() {
  const supabase = await createServerSupabaseClient()

  const [fieldsRes, occsRes, progsRes, unitsRes, suppliesRes, logsRes, eventRowsRes] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase.from('occupation_program_unit').select('id, occupation_programs_id'),
    supabase.from('supplies').select('id, occupation_programs_id, qty_per_person, kit_threshold, max_daily_stock, is_consumable, memo'),
    supabase.from('supply_logs').select('supply_id, stock_type, delta'),
    supabase.from('event_rows').select('occupation_program_unit_id, headcount, events(event_start_at, event_end_at)'),
  ])

  const fieldMap = new Map((fieldsRes.data ?? []).map((f) => [f.id, f]))
  const occMap = new Map((occsRes.data ?? []).map((o) => [o.id, o]))
  const supplyByProgramId = new Map((suppliesRes.data ?? []).map((s) => [s.occupation_programs_id, s]))

  // event_rows가 참조하는 unitId → programId 역매핑 (재고는 프로그램 단위로 관리되므로)
  const programIdByUnitId = new Map<string, string>()
  for (const u of unitsRes.data ?? []) {
    if (!u.occupation_programs_id) continue
    programIdByUnitId.set(u.id, u.occupation_programs_id)
  }

  // supply_logs 집계: supply_id별 stock_type별 delta 합산
  const stockMap = new Map<string, { total: number; kit: number }>()
  for (const log of logsRes.data ?? []) {
    if (!log.supply_id) continue
    const cur = stockMap.get(log.supply_id) ?? { total: 0, kit: 0 }
    if (log.stock_type === 'total') cur.total += log.delta
    else if (log.stock_type === 'kit') cur.kit += log.delta
    stockMap.set(log.supply_id, cur)
  }

  // 아직 끝나지 않은(예정 또는 진행 중) 행사의 event_rows 중 프로그램별(같은 프로그램의
  // 모든 유닛을 합쳐) 최대 인원수 집계 → "일 최대 수용" 초과 위험 판단에 사용.
  // 같은 조건에서 프로그램별 가장 임박한 행사 시작일시도 함께 집계해 목록 정렬에 사용한다.
  const now = Date.now()
  const maxActiveHeadcountByProgram = new Map<string, number>()
  const nextEventStartByProgram = new Map<string, string>()
  for (const row of eventRowsRes.data ?? []) {
    if (!row.occupation_program_unit_id) continue
    const programId = programIdByUnitId.get(row.occupation_program_unit_id)
    if (!programId) continue

    const eventRef = row.events as unknown
    const event = (Array.isArray(eventRef) ? eventRef[0] : eventRef) as {
      event_start_at: string | null
      event_end_at: string | null
    } | null
    const isActive = !event?.event_end_at || new Date(event.event_end_at).getTime() >= now
    if (!isActive) continue

    if (row.headcount != null) {
      const curHeadcount = maxActiveHeadcountByProgram.get(programId) ?? 0
      if (row.headcount > curHeadcount) maxActiveHeadcountByProgram.set(programId, row.headcount)
    }

    if (event?.event_start_at) {
      const curNext = nextEventStartByProgram.get(programId)
      if (!curNext || event.event_start_at < curNext) {
        nextEventStartByProgram.set(programId, event.event_start_at)
      }
    }
  }

  const programs: ProgramWithSupply[] = (progsRes.data ?? []).map((p) => {
    const occ = p.occupation_id ? occMap.get(p.occupation_id) : null
    const field = occ?.field_id ? fieldMap.get(occ.field_id) : null
    const supply = supplyByProgramId.get(p.id) ?? null
    const stock = supply ? (stockMap.get(supply.id) ?? { total: 0, kit: 0 }) : { total: 0, kit: 0 }

    return {
      id: p.id,
      programName: p.name,
      fieldId: field?.id ?? '',
      fieldName: field?.name ?? '-',
      occupationId: occ?.id ?? '',
      occupationName: occ?.name ?? '-',
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
      maxActiveHeadcount: maxActiveHeadcountByProgram.get(p.id) ?? 0,
      nextEventStartAt: nextEventStartByProgram.get(p.id) ?? null,
    }
  })

  return (
    <SuppliesClient
      programs={programs}
      fields={(fieldsRes.data ?? []).map((f) => ({ id: f.id, name: f.name }))}
    />
  )
}
