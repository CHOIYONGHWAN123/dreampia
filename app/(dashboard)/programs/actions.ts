'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// ── 타입 ─────────────────────────────────────────────────────────────

export interface FieldData {
  id: string
  name: string
}

export interface OccupationData {
  id: string
  name: string
  field_id: string
}

export interface OccupationProgramData {
  id: string
  name: string
  occupation_id: string
}

export interface ProgramCategoryData {
  id: string
  school_level: string | null
  experience_type: string
  sort_order: number | null
}

export interface OccupationProgramUnitData {
  id: string
  occupation_programs_id: string
  title: string
  mentor_material_cost: number | null
  dreampia_material_cost: number | null
  prep_by: string | null
  school_request_note: string | null
  final_product_available: boolean | null
  description: string | null
  is_delivery_available: boolean
  program_category_id: string | null
  created_at: string
}

export interface UnitFormPayload {
  title: string
  mentorMaterialCost: number | null
  dreampiaMaterialCost: number | null
  prepBy: string | null
  schoolRequestNote: string | null
  finalProductAvailable: boolean | null
  description: string | null
  isDeliveryAvailable: boolean
  programCategoryId: string | null
}

// ── 분야 (fields) ──────────────────────────────────────────────────

export async function getFields(): Promise<FieldData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('fields').select('id, name').order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createField(name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('fields').insert({ name })
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function updateField(id: string, name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('fields').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function getFieldChildCount(id: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('occupations')
    .select('id', { count: 'exact', head: true })
    .eq('field_id', id)
  return count ?? 0
}

export async function deleteField(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('fields').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function deleteFieldCascade(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: occupations } = await supabase.from('occupations').select('id').eq('field_id', id)
  if (occupations?.length) {
    const occIds = occupations.map((o) => o.id)
    const { data: programs } = await supabase.from('occupation_programs').select('id').in('occupation_id', occIds)
    if (programs?.length) {
      const progIds = programs.map((p) => p.id)
      const { data: units } = await supabase.from('occupation_program_unit').select('id').in('occupation_programs_id', progIds)
      if (units?.length) await cascadeDeleteUnits(supabase, units.map((u) => u.id))
      await supabase.from('occupation_programs').delete().in('id', progIds)
    }
    await supabase.from('occupations').delete().in('id', occIds)
  }

  const { error } = await supabase.from('fields').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

// ── 직종 (occupations) ─────────────────────────────────────────────

export async function getOccupationsByFieldId(fieldId: string): Promise<OccupationData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('occupations')
    .select('id, name, field_id')
    .eq('field_id', fieldId)
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createOccupation(fieldId: string, name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('occupations').insert({ field_id: fieldId, name })
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function updateOccupation(id: string, name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('occupations').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function getOccupationChildCount(id: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('occupation_programs')
    .select('id', { count: 'exact', head: true })
    .eq('occupation_id', id)
  return count ?? 0
}

export async function deleteOccupation(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('occupations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function deleteOccupationCascade(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: programs } = await supabase.from('occupation_programs').select('id').eq('occupation_id', id)
  if (programs?.length) {
    const progIds = programs.map((p) => p.id)
    const { data: units } = await supabase.from('occupation_program_unit').select('id').in('occupation_programs_id', progIds)
    if (units?.length) await cascadeDeleteUnits(supabase, units.map((u) => u.id))
    await supabase.from('occupation_programs').delete().in('id', progIds)
  }

  const { error } = await supabase.from('occupations').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

// ── 직종에 따른 프로그램 (occupation_programs) ─────────────────────

export async function getOccupationProgramsByOccupationId(
  occupationId: string
): Promise<OccupationProgramData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('occupation_programs')
    .select('id, name, occupation_id')
    .eq('occupation_id', occupationId)
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createOccupationProgram(occupationId: string, name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('occupation_programs')
    .insert({ occupation_id: occupationId, name })
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function updateOccupationProgram(id: string, name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('occupation_programs').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function getOccupationProgramChildCount(id: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('occupation_program_unit')
    .select('id', { count: 'exact', head: true })
    .eq('occupation_programs_id', id)
  return count ?? 0
}

export async function deleteOccupationProgram(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('occupation_programs').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function deleteOccupationProgramCascade(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: units } = await supabase.from('occupation_program_unit').select('id').eq('occupation_programs_id', id)
  if (units?.length) await cascadeDeleteUnits(supabase, units.map((u) => u.id))

  const { error } = await supabase.from('occupation_programs').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

// ── 프로그램 유닛 (occupation_program_unit) ────────────────────────

export async function getUnitsByOccupationProgramId(
  occupationProgramId: string
): Promise<OccupationProgramUnitData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('occupation_program_unit')
    .select(
      'id, occupation_programs_id, title, mentor_material_cost, dreampia_material_cost, prep_by, school_request_note, final_product_available, description, is_delivery_available, program_category_id, created_at'
    )
    .eq('occupation_programs_id', occupationProgramId)
    .order('created_at')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createUnit(
  occupationProgramId: string,
  payload: UnitFormPayload
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('occupation_program_unit').insert({
    occupation_programs_id: occupationProgramId,
    title: payload.title,
    mentor_material_cost: payload.mentorMaterialCost,
    dreampia_material_cost: payload.dreampiaMaterialCost,
    prep_by: payload.prepBy,
    school_request_note: payload.schoolRequestNote,
    final_product_available: payload.finalProductAvailable,
    description: payload.description,
    is_delivery_available: payload.isDeliveryAvailable,
    program_category_id: payload.programCategoryId,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function updateUnit(id: string, payload: UnitFormPayload): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('occupation_program_unit')
    .update({
      title: payload.title,
      mentor_material_cost: payload.mentorMaterialCost,
      dreampia_material_cost: payload.dreampiaMaterialCost,
      prep_by: payload.prepBy,
      school_request_note: payload.schoolRequestNote,
      final_product_available: payload.finalProductAvailable,
      description: payload.description,
      is_delivery_available: payload.isDeliveryAvailable,
      program_category_id: payload.programCategoryId,
    })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

// 유닛 ID 배열을 받아 관련 데이터 포함 삭제 (내부 헬퍼)
async function cascadeDeleteUnits(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  unitIds: string[]
): Promise<void> {
  if (!unitIds.length) return

  const { count: eventRowCount } = await supabase
    .from('event_rows')
    .select('id', { count: 'exact', head: true })
    .in('occupation_program_unit_id', unitIds)
  if ((eventRowCount ?? 0) > 0) {
    throw new Error('일부 유닛이 행사 데이터에서 사용 중이어서 삭제할 수 없습니다.')
  }

  await supabase.from('mentor_occupation_programs').delete().in('occupation_program_unit_id', unitIds)

  const { data: supplies } = await supabase.from('supplies').select('id').in('occupation_program_unit_id', unitIds)
  if (supplies?.length) {
    await supabase.from('supply_logs').delete().in('supply_id', supplies.map((s) => s.id))
    await supabase.from('supplies').delete().in('id', supplies.map((s) => s.id))
  }

  await supabase.from('occupation_program_unit').delete().in('id', unitIds)
}

export async function deleteUnit(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await cascadeDeleteUnits(supabase, [id])
  revalidatePath('/programs')
}

// ── 프로그램 카테고리 (읽기 전용 — 유닛 폼의 선택지로만 사용) ──────

export async function getProgramCategories(): Promise<ProgramCategoryData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('program_categories')
    .select('id, school_level, experience_type, sort_order')
    .order('sort_order')
  if (error) throw new Error(error.message)
  return data || []
}
