'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createSupply(payload: {
  occupation_program_unit_id: string
  qty_per_person: number
  kit_threshold: number | null
  max_daily_stock: number | null
  is_consumable: boolean
  memo: string | null
  initial_total_stock: number
  initial_kit_stock: number
}) {
  const supabase = await createServerSupabaseClient()

  const { data: supply, error } = await supabase
    .from('supplies')
    .insert({
      occupation_program_unit_id: payload.occupation_program_unit_id,
      qty_per_person: payload.qty_per_person,
      kit_threshold: payload.kit_threshold,
      max_daily_stock: payload.max_daily_stock,
      is_consumable: payload.is_consumable,
      memo: payload.memo || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  const logs: {
    supply_id: string
    stock_type: 'total' | 'kit'
    delta: number
    reason: string
  }[] = []

  if (payload.initial_total_stock > 0) {
    logs.push({ supply_id: supply.id, stock_type: 'total', delta: payload.initial_total_stock, reason: '초기 재고 등록' })
  }
  if (payload.initial_kit_stock > 0) {
    logs.push({ supply_id: supply.id, stock_type: 'kit', delta: payload.initial_kit_stock, reason: '초기 재고 등록' })
  }
  if (logs.length > 0) {
    const { error: logErr } = await supabase.from('supply_logs').insert(logs)
    if (logErr) throw new Error(logErr.message)
  }

  revalidatePath('/supplies')
}

export async function updateSupply(
  supplyId: string,
  payload: {
    qty_per_person: number
    kit_threshold: number | null
    max_daily_stock: number | null
    is_consumable: boolean
    memo: string | null
  }
) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('supplies')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', supplyId)
  if (error) throw new Error(error.message)
  revalidatePath('/supplies')
}
