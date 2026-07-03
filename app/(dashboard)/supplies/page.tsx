import { createServerSupabaseClient } from '@/lib/supabase-server'
import { SuppliesClient, type UnitWithSupply } from '@/components/features/supplies/SuppliesClient'

export default async function SuppliesPage() {
  const supabase = await createServerSupabaseClient()

  const [fieldsRes, occsRes, progsRes, unitsRes, suppliesRes, logsRes] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase.from('occupation_program_unit').select('id, title, occupation_programs_id').order('title'),
    supabase.from('supplies').select('id, occupation_program_unit_id, qty_per_person, kit_threshold, max_daily_stock, is_consumable, memo'),
    supabase.from('supply_logs').select('supply_id, stock_type, delta'),
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

  const units: UnitWithSupply[] = (unitsRes.data ?? []).map((u) => {
    const prog = u.occupation_programs_id ? progMap.get(u.occupation_programs_id) : null
    const occ = prog?.occupation_id ? occMap.get(prog.occupation_id) : null
    const field = occ?.field_id ? fieldMap.get(occ.field_id) : null
    const supply = supplyByUnitId.get(u.id) ?? null
    const stock = supply ? (stockMap.get(supply.id) ?? { total: 0, kit: 0 }) : { total: 0, kit: 0 }

    return {
      id: u.id,
      title: u.title,
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
    }
  })

  return (
    <SuppliesClient
      units={units}
      fields={(fieldsRes.data ?? []).map((f) => ({ id: f.id, name: f.name }))}
    />
  )
}
