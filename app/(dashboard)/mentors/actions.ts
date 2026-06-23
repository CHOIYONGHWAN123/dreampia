'use server'

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export type MentorOccupationProgramRow = {
  mop_id: string
  occupation_program_unit_id: string
  ppt_file_url: string | null
  profile_file_url: string | null
  lecture_fee_payer_id: string | null
  lecture_fee_payer_name: string | null
  material_fee_payer_id: string | null
  material_fee_payer_name: string | null
  program_title: string
  school_level: string | null
  material_cost_per_person: number | null
  prep_by: string | null
  occupation_id: string
  occupation_name: string
  field_id: string | null
  field_name: string | null
}

export type MentorWithPrograms = {
  id: string
  user_id: string | null
  name: string
  phone: string | null
  address: string | null
  available_areas: string[] | null
  is_available: boolean
  is_authenticated: boolean
  score: number | null
  created_at: string
  belongs_to: string | null
  id_number: string | null
  bank_account: string | null
  agreement_file_url: string | null
  terms_agreed_at: string | null
  mentor_type: '소속강사' | '소속대표' | '개인'
  belongs_to_name: string | null
  occupation_programs: MentorOccupationProgramRow[]
}

export async function getMentorsWithPrograms(): Promise<MentorWithPrograms[]> {
  const supabase = await createServerSupabaseClient()

  const { data: mentors, error: mentorError } = await supabase
    .from('mentors')
    .select(
      'id, user_id, name, phone, address, available_areas, is_available, is_authenticated, score, created_at, belongs_to, id_number, bank_account, agreement_file_url, terms_agreed_at'
    )
    .order('created_at', { ascending: true })

  if (mentorError) throw new Error(mentorError.message)
  if (!mentors?.length) return []

  const mentorIds = mentors.map((m) => m.id)

  // 소속대표 여부 판별: 자신의 id를 belongs_to로 갖는 다른 멘토가 있는 경우
  const subordinateOwnerIds = new Set(
    mentors.filter((m) => m.belongs_to).map((m) => m.belongs_to as string)
  )

  const belongsToNameMap = new Map<string, string>()
  for (const m of mentors) {
    belongsToNameMap.set(m.id, m.name)
  }

  const { data: mopRows } = await supabase
    .from('mentor_occupation_programs')
    .select('id, mentor_id, occupation_program_unit_id, ppt_file_url, profile_file_url, lecture_fee_payer_id, material_fee_payer_id')
    .in('mentor_id', mentorIds)

  if (!mopRows?.length) {
    return mentors.map((m) => ({
      ...m,
      mentor_type: getMentorType(m.id, m.belongs_to, subordinateOwnerIds),
      belongs_to_name: m.belongs_to ? (belongsToNameMap.get(m.belongs_to) ?? null) : null,
      occupation_programs: [],
    }))
  }

  const unitIds = [...new Set(mopRows.map((r) => r.occupation_program_unit_id).filter(Boolean))] as string[]
  const feePayerIds = [
    ...new Set([
      ...mopRows.map((r) => r.lecture_fee_payer_id),
      ...mopRows.map((r) => r.material_fee_payer_id),
    ].filter(Boolean)),
  ] as string[]

  const [unitsRes, feePayersRes] = await Promise.all([
    supabase
      .from('occupation_program_unit')
      .select('id, title, occupation_programs_id, program_category_id, material_cost_per_person, prep_by')
      .in('id', unitIds),
    feePayerIds.length
      ? supabase.from('mentors').select('id, name').in('id', feePayerIds)
      : Promise.resolve({ data: [] }),
  ])

  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]))
  const feePayerMap = new Map((feePayersRes.data ?? []).map((m: { id: string; name: string }) => [m.id, m.name]))

  const categoryIds = [
    ...new Set((unitsRes.data ?? []).map((u) => u.program_category_id).filter(Boolean)),
  ] as string[]
  const { data: categories } = categoryIds.length
    ? await supabase.from('program_categories').select('id, school_level').in('id', categoryIds)
    : { data: [] }
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]))

  const programIds = [
    ...new Set((unitsRes.data ?? []).map((u) => u.occupation_programs_id).filter(Boolean)),
  ] as string[]
  const { data: programs } = programIds.length
    ? await supabase.from('occupation_programs').select('id, name, occupation_id').in('id', programIds)
    : { data: [] }
  const programMap = new Map((programs ?? []).map((p) => [p.id, p]))

  const occupationIds = [
    ...new Set((programs ?? []).map((p) => p.occupation_id).filter(Boolean)),
  ] as string[]

  const { data: occupations } = await supabase
    .from('occupations')
    .select('id, name, field_id')
    .in('id', occupationIds)

  const occupationMap = new Map((occupations ?? []).map((o) => [o.id, o]))

  const fieldIds = [
    ...new Set((occupations ?? []).map((o: { field_id: string | null }) => o.field_id).filter(Boolean)),
  ] as string[]

  const fieldMap = new Map<string, string>()
  if (fieldIds.length) {
    const { data: fields } = await supabase
      .from('fields')
      .select('id, name')
      .in('id', fieldIds)
    for (const f of fields ?? []) fieldMap.set(f.id, f.name)
  }

  const mopByMentor = new Map<string, typeof mopRows>()
  for (const row of mopRows) {
    const arr = mopByMentor.get(row.mentor_id) ?? []
    arr.push(row)
    mopByMentor.set(row.mentor_id, arr)
  }

  return mentors.map((m) => {
    const rows = mopByMentor.get(m.id) ?? []
    const occupationPrograms: MentorOccupationProgramRow[] = rows.map((r) => {
      const unit = unitMap.get(r.occupation_program_unit_id)
      const category = unit?.program_category_id ? categoryMap.get(unit.program_category_id) : null
      const prog = unit?.occupation_programs_id ? programMap.get(unit.occupation_programs_id) : null
      const occ = prog?.occupation_id ? occupationMap.get(prog.occupation_id) : null
      return {
        mop_id: r.id,
        occupation_program_unit_id: r.occupation_program_unit_id,
        ppt_file_url: r.ppt_file_url,
        profile_file_url: r.profile_file_url,
        lecture_fee_payer_id: r.lecture_fee_payer_id,
        lecture_fee_payer_name: r.lecture_fee_payer_id ? (feePayerMap.get(r.lecture_fee_payer_id) ?? null) : null,
        material_fee_payer_id: r.material_fee_payer_id,
        material_fee_payer_name: r.material_fee_payer_id ? (feePayerMap.get(r.material_fee_payer_id) ?? null) : null,
        program_title: unit?.title ?? '-',
        school_level: category?.school_level ?? null,
        material_cost_per_person: unit?.material_cost_per_person ?? null,
        prep_by: unit?.prep_by ?? null,
        occupation_id: prog?.occupation_id ?? '',
        occupation_name: occ?.name ?? '-',
        field_id: occ?.field_id ?? null,
        field_name: occ?.field_id ? (fieldMap.get(occ.field_id) ?? null) : null,
      }
    })

    return {
      ...m,
      mentor_type: getMentorType(m.id, m.belongs_to, subordinateOwnerIds),
      belongs_to_name: m.belongs_to ? (belongsToNameMap.get(m.belongs_to) ?? null) : null,
      occupation_programs: occupationPrograms,
    }
  })
}

function getMentorType(
  id: string,
  belongsTo: string | null,
  subordinateOwnerIds: Set<string>
): '소속강사' | '소속대표' | '개인' {
  if (belongsTo) return '소속강사'
  if (subordinateOwnerIds.has(id)) return '소속대표'
  return '개인'
}

export async function updateMentorAvailable(
  mentorId: string,
  isAvailable: boolean
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ is_available: isAvailable })
    .eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMentorAuthenticated(
  mentorId: string,
  isAuthenticated: boolean
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ is_authenticated: isAuthenticated })
    .eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMentorFields(
  mentorId: string,
  payload: {
    address?: string | null
    score?: number | null
    id_number?: string | null
    bank_account?: string | null
    phone?: string | null
    available_areas?: string[] | null
    belongs_to?: string | null
  }
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('mentors').update(payload).eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMentorAgreementUrl(mentorId: string, url: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentors')
    .update({ agreement_file_url: url })
    .eq('id', mentorId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMopPptUrl(mopId: string, url: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .update({ ppt_file_url: url })
    .eq('id', mopId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function updateMopProfileUrl(mopId: string, url: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .update({ profile_file_url: url })
    .eq('id', mopId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function deleteMopById(mopId: string): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('mentor_occupation_programs')
    .delete()
    .eq('id', mopId)
  if (error) throw new Error(error.message)
  revalidatePath('/mentors')
}

export async function addMentorOccupationProgram(
  mentorId: string,
  occupationProgramUnitId: string,
  lectureFeePayerId?: string | null,
  materialFeePayerId?: string | null,
  pptFileUrl?: string | null,
  profileFileUrl?: string | null
): Promise<MentorOccupationProgramRow> {
  const supabase = await createServerSupabaseClient()

  const { data: mop, error } = await supabase
    .from('mentor_occupation_programs')
    .insert({
      mentor_id: mentorId,
      occupation_program_unit_id: occupationProgramUnitId,
      lecture_fee_payer_id: lectureFeePayerId ?? null,
      material_fee_payer_id: materialFeePayerId ?? null,
      ppt_file_url: pptFileUrl ?? null,
      profile_file_url: profileFileUrl ?? null,
    })
    .select('id, mentor_id, occupation_program_unit_id, ppt_file_url, profile_file_url, lecture_fee_payer_id, material_fee_payer_id')
    .single()
  if (error) throw new Error(error.message)

  const payerIds = [lectureFeePayerId, materialFeePayerId].filter(Boolean) as string[]
  const [unitRes, payersRes] = await Promise.all([
    supabase
      .from('occupation_program_unit')
      .select('id, title, occupation_programs_id, program_category_id, material_cost_per_person, prep_by')
      .eq('id', occupationProgramUnitId)
      .single(),
    payerIds.length
      ? supabase.from('mentors').select('id, name').in('id', payerIds)
      : Promise.resolve({ data: [] }),
  ])

  const unit = unitRes.data
  const payerMap = new Map(
    (payersRes.data ?? []).map((m: { id: string; name: string }) => [m.id, m.name])
  )

  let category: { id: string; school_level: string | null } | null = null
  if (unit?.program_category_id) {
    const { data } = await supabase
      .from('program_categories')
      .select('id, school_level')
      .eq('id', unit.program_category_id)
      .single()
    category = data
  }

  let prog: { id: string; name: string; occupation_id: string | null } | null = null
  if (unit?.occupation_programs_id) {
    const { data } = await supabase
      .from('occupation_programs')
      .select('id, name, occupation_id')
      .eq('id', unit.occupation_programs_id)
      .single()
    prog = data
  }

  let occData: { id: string; name: string; field_id: string | null } | null = null
  if (prog?.occupation_id) {
    const { data } = await supabase
      .from('occupations')
      .select('id, name, field_id')
      .eq('id', prog.occupation_id)
      .single()
    occData = data
  }

  let fieldName: string | null = null
  if (occData?.field_id) {
    const { data: fieldData } = await supabase
      .from('fields')
      .select('name')
      .eq('id', occData.field_id)
      .single()
    fieldName = fieldData?.name ?? null
  }

  revalidatePath('/mentors')

  return {
    mop_id: mop.id,
    occupation_program_unit_id: mop.occupation_program_unit_id,
    ppt_file_url: mop.ppt_file_url,
    profile_file_url: mop.profile_file_url,
    lecture_fee_payer_id: mop.lecture_fee_payer_id,
    lecture_fee_payer_name: mop.lecture_fee_payer_id
      ? (payerMap.get(mop.lecture_fee_payer_id) ?? null)
      : null,
    material_fee_payer_id: mop.material_fee_payer_id,
    material_fee_payer_name: mop.material_fee_payer_id
      ? (payerMap.get(mop.material_fee_payer_id) ?? null)
      : null,
    program_title: unit?.title ?? '-',
    school_level: category?.school_level ?? null,
    material_cost_per_person: unit?.material_cost_per_person ?? null,
    prep_by: unit?.prep_by ?? null,
    occupation_id: prog?.occupation_id ?? '',
    occupation_name: occData?.name ?? '-',
    field_id: occData?.field_id ?? null,
    field_name: fieldName,
  }
}

export type AddProgramSelectData = {
  fields: { id: string; name: string }[]
  occupations: { id: string; name: string; field_id: string | null }[]
  programs: { id: string; name: string; occupation_id: string | null }[]
  units: { id: string; title: string; occupation_programs_id: string | null; program_category_id: string | null }[]
  programCategories: { id: string; school_level: string | null; experience_type: string }[]
  mentors: { id: string; name: string }[]
}

export async function getAddProgramSelectData(): Promise<AddProgramSelectData> {
  const supabase = await createServerSupabaseClient()
  const [fieldsRes, occsRes, progsRes, unitsRes, categoriesRes, mentorsRes] = await Promise.all([
    supabase.from('fields').select('id, name').order('name'),
    supabase.from('occupations').select('id, name, field_id').order('name'),
    supabase.from('occupation_programs').select('id, name, occupation_id').order('name'),
    supabase
      .from('occupation_program_unit')
      .select('id, title, occupation_programs_id, program_category_id')
      .order('title'),
    supabase.from('program_categories').select('id, school_level, experience_type').order('sort_order'),
    supabase.from('mentors').select('id, name').order('name'),
  ])
  return {
    fields: fieldsRes.data ?? [],
    occupations: (occsRes.data ?? []) as { id: string; name: string; field_id: string | null }[],
    programs: (progsRes.data ?? []) as { id: string; name: string; occupation_id: string | null }[],
    units: unitsRes.data ?? [],
    programCategories: categoriesRes.data ?? [],
    mentors: mentorsRes.data ?? [],
  }
}

// ── 강사 신규 등록 ───────────────────────────────────────────────────

export interface CreateMentorProgramInput {
  occupationProgramUnitId: string
  lectureFeePayerId: string | null
  materialFeePayerId: string | null
  pptFileUrl: string | null
  profileFileUrl: string | null
}

export interface CreateMentorInput {
  id: string
  userId: string | null
  name: string
  phone: string | null
  address: string | null
  detailAddress: string | null
  idNumber: string | null
  bankAccount: string | null
  belongsTo: string | null
  availableAreas: string[] | null
  agreementFileUrl: string | null
  programs: CreateMentorProgramInput[]
}

export async function createMentor(input: CreateMentorInput): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('mentors').insert({
    id: input.id,
    user_id: input.userId,
    name: input.name,
    phone: input.phone,
    address: input.address,
    detail_address: input.detailAddress,
    id_number: input.idNumber,
    bank_account: input.bankAccount,
    belongs_to: input.belongsTo,
    available_areas: input.availableAreas,
    agreement_file_url: input.agreementFileUrl,
  })
  if (error) throw new Error(error.message)

  if (input.programs.length > 0) {
    const { error: mopError } = await supabase.from('mentor_occupation_programs').insert(
      input.programs.map((p) => ({
        mentor_id: input.id,
        occupation_program_unit_id: p.occupationProgramUnitId,
        lecture_fee_payer_id: p.lectureFeePayerId,
        material_fee_payer_id: p.materialFeePayerId,
        ppt_file_url: p.pptFileUrl,
        profile_file_url: p.profileFileUrl,
      }))
    )
    if (mopError) throw new Error(mopError.message)
  }

  revalidatePath('/mentors')
}
