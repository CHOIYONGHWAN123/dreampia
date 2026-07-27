'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const WITHHOLDING_RATE = 0.033

export async function getAvailableMonths(): Promise<{ year: number; month: number }[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('event_rows')
    .select('start_time')
    .not('start_time', 'is', null)

  return [
    ...new Map(
      (data ?? []).map((r) => {
        const d = new Date(r.start_time as string)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        return [key, { year: d.getFullYear(), month: d.getMonth() + 1 }]
      })
    ).values(),
  ].sort((a, b) => b.year - a.year || b.month - a.month)
}

export interface LedgerLine {
  eventRowId: string
  date: string
  institutionName: string
  lectureFee: number | null
  materialFee: number | null
  lineTotal: number
  remarks: string | null
}

export interface PayerLedgerGroup {
  payerId: string
  payerName: string
  bankAccount: string | null
  idNumber: string | null
  totalFee: number
  afterTax: number
  lines: LedgerLine[]
}

export interface GetMentorFeeLedgerInput {
  year: number
  month: number
  mentorId?: string
  search?: string
}

export async function getMentorFeeLedger(input: GetMentorFeeLedgerInput): Promise<PayerLedgerGroup[]> {
  const supabase = await createServerSupabaseClient()

  const monthStart = new Date(input.year, input.month - 1, 1).toISOString()
  const monthEnd = new Date(input.year, input.month, 1).toISOString()

  let query = supabase
    .from('mentor_event_row_detail')
    .select(
      'event_row_id, start_time, institution_name, headcount, lecture_fee, prep_by, mentor_material_cost, lecture_fee_payer_id, material_fee_payer_id'
    )
    .gte('start_time', monthStart)
    .lt('start_time', monthEnd)
    .order('start_time')

  if (input.mentorId) {
    query = query.or(`lecture_fee_payer_id.eq.${input.mentorId},material_fee_payer_id.eq.${input.mentorId}`)
  }
  if (input.search) {
    query = query.ilike('institution_name', `%${input.search}%`)
  }

  const { data: detailRows } = await query
  const rows = detailRows ?? []

  const eventRowIds = rows.map((r) => r.event_row_id).filter(Boolean) as string[]
  const { data: remarksData } = eventRowIds.length > 0
    ? await supabase.from('event_rows').select('id, remarks').in('id', eventRowIds)
    : { data: [] as { id: string; remarks: string | null }[] }
  const remarksMap = new Map((remarksData ?? []).map((r) => [r.id, r.remarks]))

  // ── 라인 생성: 같은 event_row라도 강의료/재료비 입금자가 다르면 분리 ──
  const linesByPayer = new Map<string, LedgerLine[]>()

  for (const row of rows) {
    if (!row.event_row_id || !row.start_time) continue

    const lectureFee = row.lecture_fee ?? 0
    const materialFee = row.prep_by === '드림피아' ? 0 : (row.mentor_material_cost ?? 0) * (row.headcount ?? 0)
    const date = row.start_time.split('T')[0]
    const institutionName = row.institution_name ?? '-'
    const remarks = remarksMap.get(row.event_row_id) ?? null

    const addLine = (payerId: string, line: LedgerLine) => {
      const arr = linesByPayer.get(payerId) ?? []
      arr.push(line)
      linesByPayer.set(payerId, arr)
    }

    if (
      row.lecture_fee_payer_id &&
      row.material_fee_payer_id &&
      row.lecture_fee_payer_id === row.material_fee_payer_id
    ) {
      addLine(row.lecture_fee_payer_id, {
        eventRowId: row.event_row_id,
        date,
        institutionName,
        lectureFee,
        materialFee,
        lineTotal: lectureFee + materialFee,
        remarks,
      })
    } else {
      if (row.lecture_fee_payer_id) {
        addLine(row.lecture_fee_payer_id, {
          eventRowId: row.event_row_id,
          date,
          institutionName,
          lectureFee,
          materialFee: null,
          lineTotal: lectureFee,
          remarks,
        })
      }
      if (row.material_fee_payer_id && materialFee > 0) {
        addLine(row.material_fee_payer_id, {
          eventRowId: row.event_row_id,
          date,
          institutionName,
          lectureFee: null,
          materialFee,
          lineTotal: materialFee,
          remarks,
        })
      }
    }
  }

  const payerIds = [...linesByPayer.keys()]
  const { data: mentorsData } = payerIds.length > 0
    ? await supabase.from('mentors').select('id, name, bank_account, id_number').in('id', payerIds)
    : { data: [] as { id: string; name: string; bank_account: string | null; id_number: string | null }[] }
  const mentorMap = new Map((mentorsData ?? []).map((m) => [m.id, m]))

  const groups: PayerLedgerGroup[] = payerIds.map((payerId) => {
    const lines = linesByPayer.get(payerId)!
    const totalFee = lines.reduce((sum, l) => sum + l.lineTotal, 0)
    const mentor = mentorMap.get(payerId)
    return {
      payerId,
      payerName: mentor?.name ?? '-',
      bankAccount: mentor?.bank_account ?? null,
      idNumber: mentor?.id_number ?? null,
      totalFee,
      afterTax: Math.round(totalFee * (1 - WITHHOLDING_RATE)),
      lines,
    }
  })

  groups.sort((a, b) => (a.lines[0]?.date ?? '').localeCompare(b.lines[0]?.date ?? ''))

  return groups
}

export async function updateLedgerRemark(eventRowId: string, remarks: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('event_rows')
    .update({ remarks: remarks || null })
    .eq('id', eventRowId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentor-fees')
}
