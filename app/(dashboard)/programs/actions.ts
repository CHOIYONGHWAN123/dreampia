'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// ── 타입 ─────────────────────────────────────────────────────────────

export interface EventCategoryData {
  id: string
  name: string
}

export interface FieldData {
  id: string
  name: string
  event_category_ids: string[]
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
  school_level: string | null
  syllabus: string | null
  ppt_template_id: string | null
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
  schoolLevel: string | null
  syllabus: string | null
  pptTemplateId: string | null
}

// ── 행사 구분 (event_categories) ────────────────────────────────────

export async function getEventCategories(): Promise<EventCategoryData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('event_categories').select('id, name').order('sort_order')
  if (error) throw new Error(error.message)
  return data || []
}

export async function createEventCategory(name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('event_categories').insert({ name })
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function updateEventCategory(id: string, name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('event_categories').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function getEventCategoryChildCount(id: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('field_event_categories')
    .select('field_id', { count: 'exact', head: true })
    .eq('event_category_id', id)
  return count ?? 0
}

// 이 행사구분을 사용 중인 행사(events.event_category_id) 건수. 행사는 실제 업무 기록이라
// 하위 분야/직종/프로그램과 달리 절대 함께 삭제(cascade)하면 안 되므로, 이 값이 0보다
// 크면 행사구분 자체를 삭제할 수 없게 막는다.
export async function getEventCategoryEventCount(id: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('event_category_id', id)
  return count ?? 0
}

async function assertEventCategoryNotInUse(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  id: string
) {
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('event_category_id', id)
  if ((count ?? 0) > 0) {
    throw new Error(
      `이 행사구분을 사용 중인 행사가 ${count}건 있어 삭제할 수 없습니다. 먼저 해당 행사들의 행사구분을 변경해주세요.`
    )
  }
}

export async function deleteEventCategory(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await assertEventCategoryNotInUse(supabase, id)
  const { error } = await supabase.from('event_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

export async function deleteEventCategoryCascade(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await assertEventCategoryNotInUse(supabase, id)

  const { data: links } = await supabase
    .from('field_event_categories')
    .select('field_id')
    .eq('event_category_id', id)
  const linkedFieldIds = links?.map((l) => l.field_id) ?? []

  if (linkedFieldIds.length) {
    // 이 행사구분과의 연결만 끊는다 — 다른 행사구분에도 걸쳐 있는 분야는 그대로 둔다.
    await supabase.from('field_event_categories').delete().eq('event_category_id', id)

    // 연결을 끊고 나서 어느 행사구분에도 남아있지 않은 분야만 하위 트리까지 완전 삭제한다.
    const { data: remaining } = await supabase
      .from('field_event_categories')
      .select('field_id')
      .in('field_id', linkedFieldIds)
    const stillLinked = new Set(remaining?.map((r) => r.field_id) ?? [])
    const orphanedFieldIds = linkedFieldIds.filter((fieldId) => !stillLinked.has(fieldId))

    if (orphanedFieldIds.length) {
      const { data: occupations } = await supabase.from('occupations').select('id').in('field_id', orphanedFieldIds)
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
      await supabase.from('fields').delete().in('id', orphanedFieldIds)
    }
  }

  const { error } = await supabase.from('event_categories').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/programs')
}

// ── 분야 (fields) ──────────────────────────────────────────────────

export async function getFields(): Promise<FieldData[]> {
  const supabase = await createServerSupabaseClient()
  const [{ data: fields, error }, { data: links, error: linksError }] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('field_event_categories').select('field_id, event_category_id'),
  ])
  if (error) throw new Error(error.message)
  if (linksError) throw new Error(linksError.message)

  const idsByField = new Map<string, string[]>()
  for (const l of links ?? []) {
    const list = idsByField.get(l.field_id) ?? []
    list.push(l.event_category_id)
    idsByField.set(l.field_id, list)
  }

  return (fields || []).map((f) => ({ ...f, event_category_ids: idsByField.get(f.id) ?? [] }))
}

export async function createField(eventCategoryIds: string[], name: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { data: field, error } = await supabase.from('fields').insert({ name }).select('id').single()
  if (error) throw new Error(error.message)

  if (eventCategoryIds.length) {
    const { error: linkError } = await supabase
      .from('field_event_categories')
      .insert(eventCategoryIds.map((eventCategoryId) => ({ field_id: field.id, event_category_id: eventCategoryId })))
    if (linkError) throw new Error(linkError.message)
  }
  revalidatePath('/programs')
}

export async function updateField(id: string, name: string, eventCategoryIds: string[]): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('fields').update({ name }).eq('id', id)
  if (error) throw new Error(error.message)

  const { error: deleteError } = await supabase.from('field_event_categories').delete().eq('field_id', id)
  if (deleteError) throw new Error(deleteError.message)

  if (eventCategoryIds.length) {
    const { error: linkError } = await supabase
      .from('field_event_categories')
      .insert(eventCategoryIds.map((eventCategoryId) => ({ field_id: id, event_category_id: eventCategoryId })))
    if (linkError) throw new Error(linkError.message)
  }
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
      'id, occupation_programs_id, title, mentor_material_cost, dreampia_material_cost, prep_by, school_request_note, final_product_available, description, is_delivery_available, school_level, syllabus, ppt_template_id, created_at'
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
    school_level: payload.schoolLevel,
    syllabus: payload.syllabus,
    ppt_template_id: payload.pptTemplateId,
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
      school_level: payload.schoolLevel,
      syllabus: payload.syllabus,
      ppt_template_id: payload.pptTemplateId,
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
