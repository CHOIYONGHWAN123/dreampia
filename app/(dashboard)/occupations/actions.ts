'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// ── 타입 ─────────────────────────────────────────────────────────────

export type FieldData = {
  id: string
  name: string
}

export type OccupationData = {
  id: string
  name: string
  field_id?: string | null
}

export type ProgramCategoryData = {
  id: string
  name: string
  sort_order: number
}

export type LessonPlanData = {
  id: string
  occupation_program_id: string
  grade: string
  lesson_category: string
  file_url: string | null
  created_at: string
}

export type OccupationProgramData = {
  id: string
  name: string
  title: string
  occupation_id: string
  program_category_id: string | null
  school_level: string | null
  material_cost_per_person: number | null
  prep_by: string | null
  school_request_note: string | null
  final_product_available: boolean | null
  description: string | null
  is_delivery_available: boolean
  created_at: string
  // 수동 조인 결과
  occupations: OccupationData | null
  program_categories: ProgramCategoryData | null
}

// ── 내부 헬퍼 ────────────────────────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>

async function buildOccupationsMap(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, OccupationData>> {
  if (!ids.length) return new Map()
  const { data } = await supabase.from('occupations').select('id, name, field_id').in('id', ids)
  const map = new Map<string, OccupationData>()
  for (const o of data ?? []) map.set(o.id, o)
  return map
}

async function buildProgramCategoriesMap(
  supabase: SupabaseClient,
  ids: string[]
): Promise<Map<string, ProgramCategoryData>> {
  if (!ids.length) return new Map()
  const { data } = await supabase
    .from('program_categories')
    .select('id, name, sort_order')
    .in('id', ids)
  const map = new Map<string, ProgramCategoryData>()
  for (const c of data ?? []) map.set(c.id, c)
  return map
}

// ── 조회 ─────────────────────────────────────────────────────────────

// 직업 프로그램 목록
export async function getOccupationPrograms(): Promise<OccupationProgramData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('occupation_programs')
    .select(
      'id, name, title, occupation_id, program_category_id, school_level, material_cost_per_person, prep_by, school_request_note, final_product_available, description, is_delivery_available, created_at'
    )
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  const occIds = [...new Set(data.map((p) => p.occupation_id).filter(Boolean))] as string[]
  const catIds = [...new Set(data.map((p) => p.program_category_id).filter(Boolean))] as string[]

  const [occMap, catMap] = await Promise.all([
    buildOccupationsMap(supabase, occIds),
    buildProgramCategoriesMap(supabase, catIds),
  ])

  return data.map((p) => ({
    ...p,
    occupations: occMap.get(p.occupation_id) ?? null,
    program_categories: p.program_category_id ? (catMap.get(p.program_category_id) ?? null) : null,
  })) as OccupationProgramData[]
}

// 단일 직업 프로그램
export async function getOccupationProgramById(id: string): Promise<OccupationProgramData | null> {
  const supabase = await createServerSupabaseClient()
  const { data: p } = await supabase
    .from('occupation_programs')
    .select(
      'id, name, title, occupation_id, program_category_id, school_level, material_cost_per_person, prep_by, school_request_note, final_product_available, description, is_delivery_available, created_at'
    )
    .eq('id', id)
    .single()
  if (!p) return null

  const [occMap, catMap] = await Promise.all([
    buildOccupationsMap(supabase, [p.occupation_id]),
    p.program_category_id ? buildProgramCategoriesMap(supabase, [p.program_category_id]) : Promise.resolve(new Map<string, ProgramCategoryData>()),
  ])

  return {
    ...p,
    occupations: occMap.get(p.occupation_id) ?? null,
    program_categories: p.program_category_id ? (catMap.get(p.program_category_id) ?? null) : null,
  } as OccupationProgramData
}

// 분야 목록
export async function getFields(): Promise<FieldData[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('fields')
    .select('id, name')
    .order('name', { ascending: true })
  return data ?? []
}

// 직업군 목록
export async function getOccupations(): Promise<OccupationData[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('occupations')
    .select('id, name')
    .order('name', { ascending: true })
  return data ?? []
}

// 프로그램 카테고리 목록 (DB에서 관리)
export async function getProgramCategories(): Promise<ProgramCategoryData[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('program_categories')
    .select('id, name, sort_order')
    .order('sort_order', { ascending: true })
  return data ?? []
}

// ── 등록 / 수정 / 삭제 ───────────────────────────────────────────────

// 분야 등록
export async function createField(name: string): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('fields')
    .insert({ name })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  return data.id
}

// 직업군 등록
export async function createOccupation(name: string, fieldId?: string | null): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('occupations')
    .insert({ name, field_id: fieldId ?? null })
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/occupations')
  return data.id
}

// 직업 프로그램 등록
export async function createOccupationProgram(payload: {
  occupation_id: string
  name: string
  title: string
  program_category_id?: string | null
  school_level?: string | null
  material_cost_per_person?: number | null
  prep_by?: string | null
  school_request_note?: string | null
  final_product_available?: boolean | null
  description?: string | null
  is_delivery_available: boolean
}): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('occupation_programs').insert(payload).select('id').single()
  if (error) throw new Error(error.message)
  revalidatePath('/occupations')
  return data.id
}

// 강의계획안 목록 조회
export async function getLessonPlansByProgramId(programId: string): Promise<LessonPlanData[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('lesson_plans')
    .select('*')
    .eq('occupation_program_id', programId)
  if (error) throw new Error(error.message)
  return data ?? []
}

// 강의계획안 등록/수정 (upsert)
export async function upsertLessonPlan(payload: {
  occupation_program_id: string
  grade: string
  lesson_category: string
  file_url: string
}): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('lesson_plans')
    .upsert(payload, { onConflict: 'occupation_program_id,grade,lesson_category' })
  if (error) throw new Error(error.message)
}

// 강의계획안 삭제
export async function deleteLessonPlan(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('lesson_plans').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// 직업 프로그램 수정
export async function updateOccupationProgram(
  id: string,
  payload: {
    occupation_id?: string
    name?: string
    title?: string
    program_category_id?: string | null
    school_level?: string | null
    material_cost_per_person?: number | null
    prep_by?: string | null
    school_request_note?: string | null
    final_product_available?: boolean | null
    description?: string | null
    is_delivery_available?: boolean
  }
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('occupation_programs')
    .update(payload)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/occupations')
  revalidatePath(`/occupations/${id}`)
}

// 직업 프로그램 삭제
export async function deleteOccupationProgram(id: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('occupation_programs')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/occupations')
}
