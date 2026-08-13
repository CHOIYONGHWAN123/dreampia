'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'

// 행사가 여러 달에 걸치더라도 계약금(budget)은 행사 단위 값이라 나눠 배분할 수 없으므로,
// 행사 시작월(event_start_at) 하나에만 귀속시킨다(이중집계 방지).
export async function getAvailableMonths(): Promise<{ year: number; month: number }[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('events').select('event_start_at').not('event_start_at', 'is', null)

  return [
    ...new Map(
      (data ?? []).map((e) => {
        const d = new Date(e.event_start_at as string)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        return [key, { year: d.getFullYear(), month: d.getMonth() + 1 }]
      })
    ).values(),
  ].sort((a, b) => b.year - a.year || b.month - a.month)
}

export interface EventRevenueRow {
  eventId: string
  eventName: string
  institutionName: string
  eventStartAt: string | null
  contractStatus: string | null
  contractAmount: number
  lectureFeeTotal: number
  materialCostTotal: number
  revenue: number
}

export interface MonthlyRevenueTotals {
  contractAmount: number
  lectureFeeTotal: number
  materialCostTotal: number
  revenue: number
}

export interface MonthlyRevenueData {
  rows: EventRevenueRow[]
  totals: MonthlyRevenueTotals
}

// 수익 = 계약금(events.budget) - 강의료(event_rows.lecture_fee 합) - 재료비.
// 재료비는 프로그램 유닛의 준비 주체(prep_by)에 따라 단가를 나눠 headcount를 곱한다:
// 드림피아가 준비하면 dreampia_material_cost, 그 외(강사/모두가능)는 mentor_material_cost.
// "모두가능"은 실제 준비 주체를 개별 기록하지 않아 강사 준비로 간주한다.
export async function getMonthlyRevenue(year: number, month: number): Promise<MonthlyRevenueData> {
  const supabase = await createServerSupabaseClient()

  const monthStart = new Date(year, month - 1, 1).toISOString()
  const monthEnd = new Date(year, month, 1).toISOString()

  const { data: events } = await supabase
    .from('events')
    .select('id, name, institution_id, budget, contract_status, event_start_at')
    .gte('event_start_at', monthStart)
    .lt('event_start_at', monthEnd)
    .order('event_start_at')

  const emptyTotals: MonthlyRevenueTotals = { contractAmount: 0, lectureFeeTotal: 0, materialCostTotal: 0, revenue: 0 }
  if (!events || events.length === 0) {
    return { rows: [], totals: emptyTotals }
  }

  const eventIds = events.map((e) => e.id)
  const institutionIds = [...new Set(events.map((e) => e.institution_id).filter(Boolean))] as string[]

  const [eventRowsRes, institutionsRes] = await Promise.all([
    supabase
      .from('event_rows')
      .select('event_id, headcount, lecture_fee, occupation_program_unit_id')
      .in('event_id', eventIds),
    institutionIds.length > 0
      ? supabase.from('institutions').select('id, name').in('id', institutionIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const eventRows = eventRowsRes.data ?? []
  const unitIds = [...new Set(eventRows.map((r) => r.occupation_program_unit_id).filter(Boolean))] as string[]

  const { data: unitsData } =
    unitIds.length > 0
      ? await supabase
          .from('occupation_program_unit')
          .select('id, prep_by, mentor_material_cost, dreampia_material_cost')
          .in('id', unitIds)
      : {
          data: [] as {
            id: string
            prep_by: string | null
            mentor_material_cost: number | null
            dreampia_material_cost: number | null
          }[],
        }

  const unitMap = new Map((unitsData ?? []).map((u) => [u.id, u]))
  const institutionMap = new Map((institutionsRes.data ?? []).map((i) => [i.id, i.name]))

  const rowsByEvent = new Map<string, typeof eventRows>()
  for (const r of eventRows) {
    if (!r.event_id) continue
    const arr = rowsByEvent.get(r.event_id) ?? []
    arr.push(r)
    rowsByEvent.set(r.event_id, arr)
  }

  const rows: EventRevenueRow[] = events.map((e) => {
    const rowsForEvent = rowsByEvent.get(e.id) ?? []
    let lectureFeeTotal = 0
    let materialCostTotal = 0
    for (const r of rowsForEvent) {
      lectureFeeTotal += r.lecture_fee ?? 0
      const unit = r.occupation_program_unit_id ? unitMap.get(r.occupation_program_unit_id) : undefined
      if (unit) {
        const unitCost = unit.prep_by === '드림피아' ? (unit.dreampia_material_cost ?? 0) : (unit.mentor_material_cost ?? 0)
        materialCostTotal += unitCost * (r.headcount ?? 0)
      }
    }
    const contractAmount = e.budget ?? 0
    const revenue = contractAmount - lectureFeeTotal - materialCostTotal
    return {
      eventId: e.id,
      eventName: e.name,
      institutionName: e.institution_id ? (institutionMap.get(e.institution_id) ?? '-') : '-',
      eventStartAt: e.event_start_at,
      contractStatus: e.contract_status,
      contractAmount,
      lectureFeeTotal,
      materialCostTotal,
      revenue,
    }
  })

  const totals = rows.reduce<MonthlyRevenueTotals>(
    (acc, r) => ({
      contractAmount: acc.contractAmount + r.contractAmount,
      lectureFeeTotal: acc.lectureFeeTotal + r.lectureFeeTotal,
      materialCostTotal: acc.materialCostTotal + r.materialCostTotal,
      revenue: acc.revenue + r.revenue,
    }),
    emptyTotals
  )

  return { rows, totals }
}
